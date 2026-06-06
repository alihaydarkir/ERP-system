const agentTools = require('./tools');
const aiGateway = require('./aiGateway');

class AgentOrchestrator {
  constructor(deps = {}) {
    this.tools = deps.tools || agentTools;
    this.gateway = deps.gateway || aiGateway;
    this.mode = (process.env.AI_AUTOMATION_MODE || 'copilot').toLowerCase();

    this.riskMatrix = {
      cancel_order: { level: 'high', requiresApproval: true, requiredRole: 'manager' },
      set_cheque_status: { level: 'high', requiresApproval: true, requiredRole: 'admin' },
      deactivate_product: { level: 'high', requiresApproval: true, requiredRole: 'manager' },
      create_order: { level: 'medium', requiresApproval: false, requiredRole: 'manager' },
      set_product_stock: { level: 'low', requiresApproval: false, requiredRole: null }
    };
    this.highRiskTools = new Set(['cancel_order', 'set_cheque_status', 'deactivate_product']);
  }

  getRisk(toolName) {
    if (!this.tools.isMutationTool(toolName)) {
      return { level: 'none', requiresApproval: false, requiredRole: null };
    }

    return this.riskMatrix[toolName] || { level: 'medium', requiresApproval: true, requiredRole: 'manager' };
  }

  safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  parsePlan(text, fallbackTools = []) {
    const parsed = this.safeJsonParse(text, null);
    if (parsed?.steps && Array.isArray(parsed.steps)) {
      return parsed;
    }

    return {
      steps: (fallbackTools || []).map((t) => ({
        tool: t.name,
        args: t.args || {}
      })),
      strategy: 'fallback_keyword_plan'
    };
  }

  buildToolCatalog() {
    return (this.tools.definitions || [])
      .map((def) => `- ${def.name} [${this.tools.isMutationTool(def.name) ? 'YAZMA/DEĞİŞİKLİK' : 'SADECE OKUMA'}]: ${def.description}`)
      .join('\n');
  }

  async plan({ userMessage, fallbackTools = [] }) {
    const systemPrompt = `Sen bir ERP ajan planlayıcısısın.
Sadece JSON döndür. Format:
{"steps":[{"tool":"tool_name","args":{}}],"strategy":"short"}

Kullanabileceğin araçlar (SADECE bu listedeki "tool_name" değerlerini kullan):
${this.buildToolCatalog()}

Kurallar:
- "tool" alanına SADECE yukarıdaki listede birebir geçen bir isim yaz. Listede olmayan/uydurma isim üretme
- En fazla 5 adım
- [YAZMA/DEĞİŞİKLİK] etiketli araçları SADECE kullanıcı açıkça bir kayıt oluşturmak/güncellemek/silmek/iptal etmek/durum değiştirmek istediğinde seç (ör. "oluştur", "ekle", "güncelle", "sil", "iptal et", "durumunu ... yap"). Kullanıcı sadece bilgi/durum/liste soruyorsa SADECE [SADECE OKUMA] araçlarını kullan
- Belirsiz veya eksik bilgiyle (ör. hangi kayıt olduğu belli değilken) asla bir [YAZMA/DEĞİŞİKLİK] aracı önerme
- Kullanıcı bir işlem yapmak istiyorsa ama gerekli bilgiler (müşteri adı, ürün adı vb.) belirtilmemişse, steps boş bırak: {"steps":[],"strategy":"ask_for_info"}
- Örnek: "sipariş ekle" → müşteri adı bilinmiyor → {"steps":[],"strategy":"ask_for_info"}`;

    const userPrompt = `Kullanıcı mesajı: ${String(userMessage || '').slice(0, 1000)}`;

    try {
      const completion = await this.gateway.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.1 });

      return this.parsePlan(completion.content || '', fallbackTools);
    } catch (_) {
      return this.parsePlan('', fallbackTools);
    }
  }

  shouldRequireApproval({ toolName, risk }) {
    const normalizedToolName = String(toolName || '').toLowerCase();
    if (
      this.highRiskTools.has(normalizedToolName)
      || /delete|deactivate|remove/.test(normalizedToolName)
      || risk.level === 'high'
    ) {
      return true;
    }

    if (this.mode === 'copilot') {
      return this.tools.isMutationTool(toolName);
    }

    if (this.mode === 'guarded') {
      if (!this.tools.isMutationTool(toolName)) return false;
      return risk.level !== 'low' || risk.requiresApproval;
    }

    if (this.mode === 'transactional') {
      return Boolean(risk.requiresApproval);
    }

    return true;
  }

  async execute({ plan, context, hasMutationPermission, requestApproval }) {
    const steps = [];
    const toolContexts = [];

    for (const item of (plan.steps || []).slice(0, 5)) {
      const toolName = item.tool;
      const rawArgs = item.args || {};

      const validation = this.tools.validateToolArgs(toolName, rawArgs);
      if (!validation.valid) {
        steps.push({ type: 'tool_error', tool: toolName, error: validation.error });
        continue;
      }

      const risk = this.getRisk(toolName);

      if (this.tools.isMutationTool(toolName)) {
        const permission = await hasMutationPermission({ user_id: context.user_id, role: context.role, toolName });
        if (!permission.allowed) {
          steps.push({
            type: 'tool_error',
            tool: toolName,
            error: `Permission denied: ${permission.requiredPermission || 'unknown'}`
          });
          continue;
        }

        if (this.shouldRequireApproval({ toolName, risk })) {
          const approval = await requestApproval({
            tool: toolName,
            args: validation.sanitizedArgs,
            risk
          });

          steps.push({
            type: 'approval_required',
            tool: toolName,
            approval_id: approval.id,
            risk_level: risk.level,
            required_role: risk.requiredRole
          });
          continue;
        }
      }

      steps.push({ type: 'tool_call', tool: toolName, args: validation.sanitizedArgs });
      try {
        const result = await this.tools.execute(toolName, validation.sanitizedArgs, context);
        steps.push({ type: 'tool_result', tool: toolName, result });
        toolContexts.push({ tool: toolName, result });
      } catch (error) {
        steps.push({ type: 'tool_error', tool: toolName, error: error.message });
      }
    }

    return { steps, toolContexts };
  }

  isGreeting(message) {
    const msg = String(message || '').toLowerCase().trim();
    // Only match explicit standalone greetings — never contextual short questions
    return /^(merhaba|selam|hi|hello|hey|günaydın|iyi günler|iyi akşamlar)\s*[!.?]?$/.test(msg);
  }

  toPositiveNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return null;
  }

  hasActualData(toolContexts) {
    return (toolContexts || []).some((tc) => {
      const r = tc.result;
      if (!r) return false;
      if (Array.isArray(r)) return r.length > 0;
      if (typeof r === 'object') {
        return Object.values(r).some((v) => {
          const num = this.toPositiveNumber(v);
          return (num !== null && num > 0) || (Array.isArray(v) && v.length > 0);
        });
      }
      return false;
    });
  }

  verify({ toolContexts }) {
    const hasData = this.hasActualData(toolContexts);
    return { consistent: hasData, notes: hasData ? [] : ['no_data'] };
  }

  async respond({ userMessage, toolContexts }) {
    if (!this.hasActualData(toolContexts)) {
      return 'Sistemde bu konuyla ilgili kayıt bulunamadı.';
    }

    const dataBlocks = (toolContexts || []).map((item) => ({
      tool: item.tool,
      payload: item.result
    }));

    // Annotate empty results so model won't hallucinate
    const annotatedBlocks = (toolContexts || []).map((item) => {
      const r = item.result;
      const isEmpty =
        !r ||
        (Array.isArray(r) && r.length === 0) ||
        (typeof r === 'object' && !Array.isArray(r) &&
          Object.values(r).every((v) => {
            if (Array.isArray(v)) return v.length === 0;
            const n = Number(v);
            return (Number.isFinite(n) && n === 0) || v === null || v === undefined;
          }));
      return { tool: item.tool, payload: isEmpty ? '__BOŞ_SONUÇ__' : r };
    });

    // Data in system role — never masked by PII filter, never corrupted
    const systemPrompt = `Sen Türkçe ERP asistanısın. Aşağıdaki veriyi kullanarak kullanıcının sorusunu kısa ve net yanıtla.
Kurallar:
- Sadece verilen veriyi kullan, kesinlikle uydurma yapma
- "__BOŞ_SONUÇ__" olan araç veri içermiyor demektir — o konuda "kayıt yok" veya "bu kategori boş" de
- JSON, kod bloğu veya teknik format yazma
- Sayıları, isimleri ve tarihleri düz Türkçe metin olarak yaz
- Gereksiz açıklama yapma, doğrudan cevap ver

VERİ:
${JSON.stringify(annotatedBlocks, null, 2)}`;

    const completion = await this.gateway.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: String(userMessage || '').slice(0, 500) }
    ], { temperature: 0.1, max_tokens: 400 });

    return completion.content || 'Kayıt bulunamadı.';
  }

  detectFormTool(message) {
    const msg = String(message || '').toLowerCase();
    if (/çek.*(ekle|oluştur|yeni|kaydet|gir)|yeni.*çek/.test(msg)) return 'create_cheque';
    if (/(ürün|urun).*(ekle|oluştur|yeni|kaydet)|yeni.*(ürün|urun)/.test(msg)) return 'create_product';
    if (/sipariş.*(ekle|oluştur|yeni|aç)|yeni.*sipariş/.test(msg)) return 'create_order';
    if (/müşteri.*(ekle|oluştur|yeni|kaydet)|yeni.*müşteri/.test(msg)) return 'create_customer';
    return null;
  }

  async runDirect({ toolName, args, context, hasMutationPermission, requestApproval }) {
    const validation = this.tools.validateToolArgs(toolName, args);
    if (!validation.valid) {
      return { success: false, answer: `Geçersiz parametreler: ${validation.error}`, steps: [], meta: {} };
    }

    const risk = this.getRisk(toolName);
    const permission = await hasMutationPermission({ user_id: context.user_id, role: context.role, toolName });
    if (!permission.allowed) {
      return { success: false, answer: 'Bu işlem için yetkiniz yok.', steps: [], meta: { permission_denied: true } };
    }

    if (this.shouldRequireApproval({ toolName, risk })) {
      const approval = await requestApproval({ tool: toolName, args: validation.sanitizedArgs, risk });
      return {
        success: true,
        answer: `⏳ İşlem onay bekliyor (Onay ID: ${approval.id}, risk: ${risk.level}).`,
        steps: [{ type: 'approval_required', tool: toolName, approval_id: approval.id, risk_level: risk.level }],
        meta: { requires_human_approval: true, approval_id: approval.id }
      };
    }

    try {
      const result = await this.tools.execute(toolName, validation.sanitizedArgs, context);
      return {
        success: true,
        answer: `✅ İşlem başarıyla tamamlandı.`,
        steps: [{ type: 'tool_result', tool: toolName, result }],
        meta: { direct_execution: true, result }
      };
    } catch (error) {
      return { success: false, answer: `❌ Hata: ${error.message}`, steps: [], meta: {} };
    }
  }

  async run({ userMessage, context, fallbackTools, hasMutationPermission, requestApproval }) {
    if (this.isGreeting(userMessage)) {
      return {
        success: true,
        answer: 'Merhaba! ERP sisteminizdeki ürünler, siparişler, müşteriler, çekler, tedarikçiler ve raporlar hakkında yardımcı olabilirim. Ne öğrenmek istersiniz?',
        steps: [],
        meta: { greeting: true }
      };
    }

    const plan = await this.plan({ userMessage, fallbackTools });

    if (plan.strategy === 'ask_for_info' || !plan.steps?.length) {
      const formTool = this.detectFormTool(userMessage);
      return {
        success: true,
        answer: formTool
          ? 'Aşağıdaki formu doldurun:'
          : 'Bu işlemi yapabilmem için daha fazla bilgiye ihtiyacım var. Lütfen detayları belirtin.',
        steps: [],
        meta: { orchestrator_mode: this.mode, ask_for_info: true, form_tool: formTool }
      };
    }

    const execution = await this.execute({
      plan,
      context,
      hasMutationPermission,
      requestApproval
    });

    const approvalStep = execution.steps.find((s) => s.type === 'approval_required');
    if (approvalStep) {
      return {
        success: true,
        answer: `⏳ Bu işlem onay gerektiriyor ve onaya gönderildi (Onay ID: ${approvalStep.approval_id}, risk seviyesi: ${approvalStep.risk_level}).`,
        steps: [{ type: 'plan', plan }, ...execution.steps],
        meta: {
          orchestrator_mode: this.mode,
          requires_human_approval: true,
          approval_id: approvalStep.approval_id
        }
      };
    }

    const permissionErrorStep = execution.steps.find(
      (s) => s.type === 'tool_error' && /^Permission denied/.test(s.error || '')
    );
    if (permissionErrorStep) {
      return {
        success: true,
        answer: 'Bu işlemi yapmak için yetkiniz yok.',
        steps: [{ type: 'plan', plan }, ...execution.steps],
        meta: { orchestrator_mode: this.mode, permission_denied: true }
      };
    }

    const verification = this.verify({ toolContexts: execution.toolContexts });
    const answer = await this.respond({
      userMessage,
      toolContexts: execution.toolContexts
    });

    return {
      success: true,
      answer,
      steps: [
        { type: 'plan', plan },
        ...execution.steps,
        { type: 'verify', verification }
      ],
      meta: {
        orchestrator_mode: this.mode,
        verification
      }
    };
  }
}

module.exports = AgentOrchestrator;
