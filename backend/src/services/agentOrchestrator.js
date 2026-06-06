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
- Belirsiz veya eksik bilgiyle (ör. hangi kayıt olduğu belli değilken) asla bir [YAZMA/DEĞİŞİKLİK] aracı önerme`;

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
    if (/^(merhaba|selam|hi|hello|hey|nasılsın|naber|günaydın|iyi günler|iyi akşamlar|teşekkür|sağ ol|tamam|ok)\s*[!.?]?$/.test(msg)) return true;
    if (msg.length < 12 && !/ürün|sipariş|müşteri|çek|fatura|stok|tedarikçi|depo|rapor/.test(msg)) return true;
    return false;
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

    // Data in system role — never masked by PII filter, never corrupted
    const systemPrompt = `Sen Türkçe ERP asistanısın. Aşağıdaki veriyi kullanarak kullanıcının sorusunu kısa ve net yanıtla.
Kurallar:
- Sadece verilen veriyi kullan, kesinlikle uydurma
- JSON, kod bloğu veya teknik format yazma
- Sayıları, isimleri ve tarihleri düz Türkçe metin olarak yaz
- Gereksiz açıklama yapma, doğrudan cevap ver

VERİ:
${JSON.stringify(dataBlocks, null, 2)}`;

    const completion = await this.gateway.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: String(userMessage || '').slice(0, 500) }
    ], { temperature: 0.1, max_tokens: 400 });

    return completion.content || 'Kayıt bulunamadı.';
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
