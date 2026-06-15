const agentTools = require('./tools');
const aiGateway = require('./aiGateway');
const { isToolAllowed } = require('./tools/toolPermissionMatrix');

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

  buildToolCatalog(context = {}) {
    const role = context.role;
    return (this.tools.definitions || [])
      .filter((def) => {
        const isMutation = this.tools.isMutationTool(def.name);
        return isToolAllowed(def.name, role, isMutation);
      })
      .map((def) => `- ${def.name} [${this.tools.isMutationTool(def.name) ? 'YAZMA/DEĞİŞİKLİK' : 'SADECE OKUMA'}]: ${def.description}`)
      .join('\n');
  }

  isRbacDeniedByKeyword(msg, role) {
    const m = String(msg || '').toLowerCase();
    if (role === 'customer') {
      return (
        /finansal|ciro|gelir.?gider|mali durum/.test(m) ||
        /tedarikçi|tedarik\s/.test(m) ||
        /ödeme riski|risk analiz/.test(m) ||
        /yaşlandırma|yaş grup|borç raporu/.test(m) ||
        /müşteri listesi|tüm müşteri|en iyi müşteri|top müşteri/.test(m) ||
        /genel özet/.test(m) ||
        /bu ayı.{0,10}karşılaştır|aylık karşılaştır/.test(m) ||
        // Mutasyon istekleri: "X'i Y yap/güncelle/ayarla"
        /stoğ?u.{0,15}(yap|güncelle|ayarla|değiştir|ekle|çıkar)/.test(m) ||
        /\d+\s*(?:adet|tane)?\s*(yap|güncelle|ayarla)/.test(m) ||
        /stok.{0,10}\d+/.test(m)
      );
    }
    if (role === 'user') {
      return (
        /finansal|ciro|gelir.?gider|mali durum/.test(m) ||
        /en iyi müşteri|top müşteri|en değerli müşteri/.test(m) ||
        /ödeme riski|risk analiz|riskli müşteri/.test(m) ||
        /yaşlandırma|borç raporu|borç analiz/.test(m)
      );
    }
    if (role === 'manager') {
      return (
        /en iyi müşteri|top müşteri|en değerli müşteri/.test(m) ||
        /ödeme riski|risk analiz|riskli müşteri/.test(m)
      );
    }
    return false;
  }

  sanitizeCurrencyInAnswer(text) {
    if (!text || typeof text !== 'string') return text;
    if (text.trim() === '__BOŞ_SONUÇ__') return 'Sistemde bu konuyla ilgili kayıt bulunamadı.';
    return text
      // £ → ₺
      .replace(/£\s*/g, '₺')
      // Hatalı ondalık ayırıcı: 1014.160 → 1.014.160 (7 haneli sayılar)
      .replace(/\b(\d{1,3})(\d{3})\.(\d{3})\b/g, (_, a, b, c) => `${a}.${b}.${c}`)
      // Hatalı binlik: 1014160 TL → 1.014.160 TL (7 basamak)
      .replace(/\b(\d{7})\s*(TL|₺)/g, (_, n, u) => {
        const formatted = Number(n).toLocaleString('tr-TR');
        return `${formatted} ${u}`;
      })
      // 6 basamak: 186350 TL → 186.350 TL
      .replace(/\b(\d{6})\s*(TL|₺)/g, (_, n, u) => {
        const formatted = Number(n).toLocaleString('tr-TR');
        return `${formatted} ${u}`;
      });
  }

  getRoleRestrictions(role) {
    if (role === 'customer') {
      return `\n\n⚠️ KULLANICI MÜŞTERİ ROLÜNDEDIR. Aşağıdaki konularda soru gelirse, başka araç DENEME, doğrudan {"steps":[],"strategy":"rbac_denied"} döndür:
- Finansal özet, ciro, gelir-gider, genel şirket özeti, aylık/dönemsel karşılaştırma
- Tedarikçi bilgileri veya listesi
- Ödeme riski analizi veya risk değerlendirmesi
- Borç yaşlandırma raporu
- Başka müşteri listesi veya en iyi müşteriler sıralaması
- Stok değiştirme, stok güncelleme, "X yap", "X olarak ayarla" gibi yazma/değiştirme istekleri
- Sipariş durumu değiştirme, iptal etme, oluşturma gibi her türlü mutasyon
Müşteri SADECE kendi siparişleri, çekleri ve ürün kataloğu hakkında OKUMA işlemi yapabilir.`;
    }
    if (role === 'user' || role === 'manager') {
      return '';
    }
    return '';
  }

  async planWithTools({ userMessage, fallbackTools = [], context = {} }) {
    const ollamaTools = this.tools.toOllamaTools ? this.tools.toOllamaTools(context.role) : [];

    if (!ollamaTools.length) {
      return { steps: [], strategy: 'no_tools' };
    }

    const roleRestrictions = this.getRoleRestrictions(context.role);
    const systemPrompt = `Sen bir ERP (Kurumsal Kaynak Planlama) sistemi asistanısın.
Kullanıcının ERP verilerine erişmek için MUTLAKA uygun aracı çağır.${roleRestrictions}

ZORUNLU KURALLAR:
- Kullanıcı sipariş, ürün, müşteri, çek, tedarikçi, depo, finansal veri soruyorsa ARAÇ ÇAĞIR
- "kaç tane", "listele", "göster", "var mı", "söyle", "nedir" → veritabanında arama yap, araç çağır
- Kısa/belirsiz sorular için en uygun aracı tahmin et ve çağır
- Sadece "merhaba/selam/teşekkür" gibi saf selamlamalarda araç çağırma
- Birden fazla araç gerekiyorsa hepsini çağır (max 5)`;

    try {
      const result = await this.gateway.chatWithTools(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(userMessage || '').slice(0, 1000) }
        ],
        ollamaTools,
        { temperature: 0.1, num_ctx: 2048 }
      );

      if (result.tool_calls && result.tool_calls.length > 0) {
        const steps = result.tool_calls.slice(0, 5).map((tc) => ({
          tool: tc.function.name,
          args: tc.function.arguments || {}
        }));
        return { steps, strategy: 'tool_calling' };
      }

      // Model araç çağırmadı (selamlama, genel soru vb.)
      return { steps: [], strategy: 'ask_for_info' };
    } catch (_) {
      return {
        steps: (fallbackTools || []).map((t) => ({ tool: t.name, args: t.args || {} })),
        strategy: 'fallback_keyword_plan'
      };
    }
  }

  async plan({ userMessage, fallbackTools = [], context = {} }) {
    const allowedDefs = (this.tools.definitions || []).filter((def) => {
      const isMutation = this.tools.isMutationTool(def.name);
      return isToolAllowed(def.name, context.role, isMutation);
    });
    const toolNames = allowedDefs.map(d => d.name).join(', ');
    const roleRestrictions = this.getRoleRestrictions(context.role);
    const systemPrompt = `Sen bir ERP ajan planlayıcısısın.
Sadece JSON döndür. Format:
{"steps":[{"tool":"tool_name","args":{}}],"strategy":"short"}

Kullanabileceğin araçlar (SADECE bu listedeki "tool_name" değerlerini kullan):
${this.buildToolCatalog(context)}

GEÇERLİ ARAÇ İSİMLERİ (tam liste): ${toolNames}

Kurallar:
- "tool" alanına SADECE yukarıdaki GEÇERLİ ARAÇ İSİMLERİ listesinde birebir geçen bir isim yaz
- Bu listede OLMAYAN hiçbir araç ismi yazma — uydurma isim kesinlikle yasak
- Emin değilsen o adımı atlat, uydurma
- En fazla 5 adım
- Müşteri sayısı, liste veya arama için: search_customers (tüm müşteri bilgileri döner, sayısı da çıkarılabilir)
- [YAZMA/DEĞİŞİKLİK] etiketli araçları SADECE kullanıcı açıkça bir kayıt oluşturmak/güncellemek/silmek/iptal etmek/durum değiştirmek istediğinde seç
- Kullanıcı sadece bilgi/durum/liste soruyorsa SADECE [SADECE OKUMA] araçlarını kullan
- Belirsiz veya eksik bilgiyle asla [YAZMA/DEĞİŞİKLİK] aracı önerme
- Kullanıcı işlem yapmak istiyor ama gerekli bilgiler belirtilmemişse: {"steps":[],"strategy":"ask_for_info"}
- Örnek: "sipariş ekle" → müşteri adı bilinmiyor → {"steps":[],"strategy":"ask_for_info"}${roleRestrictions}`;

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
    // İç içe nesneleri de tarar (örn. get_monthly_comparison → {this_month:{revenue:38250}})
    const hasValue = (v, depth = 0) => {
      if (v === null || v === undefined) return false;
      const num = this.toPositiveNumber(v);
      if (num !== null) return num > 0;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object' && depth < 3) {
        return Object.values(v).some((inner) => hasValue(inner, depth + 1));
      }
      return false;
    };
    // Bir araç anlamlı bir summary_text döndürdüyse (örn. "0 vs 0" karşılaştırma) bu da
    // veridir; tüm sayısal alanlar 0 olsa bile cevabı bastırma.
    const hasSummary = (r) =>
      r && typeof r === 'object' && typeof r.summary_text === 'string' && r.summary_text.trim().length > 0;
    return (toolContexts || []).some((tc) => hasValue(tc.result) || hasSummary(tc.result));
  }

  verify({ toolContexts }) {
    const hasData = this.hasActualData(toolContexts);
    return { consistent: hasData, notes: hasData ? [] : ['no_data'] };
  }

  async respond({ userMessage, toolContexts, context = {} }) {
    // Keyword RBAC check first — even if tool returned data via a workaround tool
    if (this.isRbacDeniedByKeyword(userMessage, context?.role)) {
      return 'Bu bilgiye erişim yetkiniz yok.';
    }

    if (!this.hasActualData(toolContexts)) {
      return 'Sistemde bu konuyla ilgili kayıt bulunamadı.';
    }

    const role = context.role || 'user';
    let roleContext = '';
    if (role === 'customer') {
      roleContext = `\n\n⚠️ KULLANICI MÜŞTERİ ROLÜNDEDIR. ZORUNLU KISITLAMALAR:
SADECE şu konularda yanıt ver: kendi siparişleri, kendi çekleri, ürün kataloğu, kendi profili.
Aşağıdaki konularla ilgili soru gelirse — veri mevcut olsa bile, kısmi de olsa — MUTLAKA şunu yaz: "Bu bilgiye erişim yetkiniz yok." BAŞKA HİÇBİR AÇIKLAMA EKLEME, sadece bu cümleyi yaz:
- Finansal özet, ciro, gelir-gider, şirket geneli dashboard veya karşılaştırma
- Tedarikçi bilgileri
- Ödeme riski analizi, risk değerlendirmesi veya benzeri analiz
- Borç yaşlandırma raporu
- Başka müşterilerin listesi veya en iyi müşteriler sıralaması
- Stok güncelleme, sipariş oluşturma gibi yazma/değiştirme işlemleri`;
    } else if (role === 'user') {
      roleContext = `\n\nKullanıcı standart çalışan rolündedir. Şu konularda "Bu bilgiye erişim yetkiniz yok" de:
- Finansal özet veya ciro analizi
- En iyi müşteriler sıralaması
- Ödeme riski analizi
- Borç yaşlandırma raporu`;
    } else if (role === 'manager') {
      roleContext = `\n\nKullanıcı manager rolündedir. Şu konularda "Bu bilgiye erişim yetkiniz yok" de:
- En iyi müşteriler sıralaması (top customers)
- Ödeme riski analizi`;
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
    const systemPrompt = `[DİL KURALI - EN ÖNEMLİ KURAL] YANITI MUTLAKA VE YALNIZCA TÜRKÇE YAZ. Başka hiçbir dil (İngilizce, Çince, Arapça vb.) kullanma. Tek bir kelime bile başka dilde olmasın.

Sen Türkçe konuşan bir ERP asistanısın. Aşağıdaki veriyi kullanarak kullanıcının sorusunu yanıtla.${roleContext}

Kurallar:
- Sadece verilen veriyi kullan, kesinlikle uydurma yapma
- "__BOŞ_SONUÇ__" olan araç veri içermiyor demektir — o konuda "kayıt bulunamadı" veya "bu kategori boş" de
- JSON, kod bloğu veya teknik format yazma
- Sayıları Türkçe formatında yaz: 172600 → "172.600 TL" (nokta binlik ayırıcı, TL para birimi)
- Tarihleri Türkçe yaz: "15 Ocak 2026" gibi
- Yanıtı kısa ve net tut, gereksiz açıklama ekleme
- ZORUNLU: Yanıtı her zaman Türkçe yaz — başka dil kullanma
- Rol kısıtlaması olan konularda "Bu bilgiye erişim yetkiniz yok" de ve başka bilgi ekleme
- Doğal Türkçe kullan — "para kredisiz", "ödersiz" gibi ifadeler kullanma
- Sayısal verilerden yorum çıkar: "7 bekleyen sipariş, toplam 172.600 TL" gibi bütünleşik cevap ver
- Birden fazla araçtan veri geliyorsa hepsini tek yanıtta birleştir
- Listelemede madde işareti (-) kullan, numaralı liste değil
- ÖNEMLİ: Önceki konuşma mesajlarındaki sayıları, ürün adlarını veya listeleri KULLANMA — yanıtını YALNIZCA aşağıdaki VERİ bölümüne dayandır
- VERİ bölümünde kayıt varsa onları MUTLAKA kullanarak yanıt ver — dolu veri varken asla "veri bulunamadı" deme
- Yalnızca VERİ bölümü tamamen boşsa "Bu konuda veri bulunamadı" de, geçmişten veri taşıma
- "__BOŞ_SONUÇ__" metnini yanıtında ASLA aynen yazma
- ASLA kendi başına aritmetik, yüzde veya fark HESAPLAMA — verideki hazır sayıları olduğu gibi aktar
- Bir araç verisi "summary_text" alanı içeriyorsa yanıtını o metne dayandır, sayıları oradan aynen al

VERİ:
${JSON.stringify(annotatedBlocks, null, 2)}`;

    const chatMessages = [
      { role: 'system', content: systemPrompt }
    ];

    // Conversation history: önceki turları ekle (en fazla 6 mesaj = 3 tur)
    const history = context?.conversationHistory || [];
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      chatMessages.push({ role: h.role, content: String(h.content || '').slice(0, 300) });
    }

    chatMessages.push({ role: 'user', content: String(userMessage || '').slice(0, 500) });

    const completion = await this.gateway.chat(chatMessages, { temperature: 0.1, max_tokens: 600 });

    let raw = completion.content || 'Kayıt bulunamadı.';
    raw = raw.replace(/__BOŞ_SONU[ÇC]__/gi, 'veri bulunamadı').trim();

    // CJK (Çince/Japonca/Korece) karakter içeriyorsa temizle
    const CJK = /[一-鿿぀-ヿ가-힯　-〿]/;
    if (CJK.test(raw)) {
      raw = raw
        .replace(/[一-鿿぀-ヿ가-힯　-〿]+/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/([:\-,])\s*([:\-,])/g, '$1')
        .trim();
    }

    if (!raw) raw = 'Kayıt bulunamadı.';
    return this.sanitizeCurrencyInAnswer(raw);
  }

  detectFormTool(message) {
    const msg = String(message || '').toLowerCase();
    // Sorgu/rapor niyeti varsa form gösterme — "yeni müşteriler" gibi ifadeler
    // karşılaştırma sorularında geçebilir, create niyeti değildir
    if (/karşılaştır|kıyasla|göster|listele|raporla|özetle|analiz|hesapla|sırala|sayısı|kaç\s|neler|hangi|var\s*mı|durumu/.test(msg)) {
      return null;
    }
    if (/çek\S*\s+(ekle|oluştur|kaydet|gir)|yeni\s+(bir\s+)?çek/.test(msg)) return 'create_cheque';
    if (/(ürün|urun)\S*\s+(ekle|oluştur|kaydet)|yeni\s+(bir\s+)?(ürün|urun)/.test(msg)) return 'create_product';
    if (/sipariş\S*\s+(ekle|oluştur|aç)|yeni\s+(bir\s+)?sipariş/.test(msg)) return 'create_order';
    if (/müşteri\S*\s+(ekle|oluştur|kaydet)|yeni\s+(bir\s+)?müşteri/.test(msg)) return 'create_customer';
    if (/(tedarikçi|tedarikci)\S*\s+(ekle|oluştur|kaydet)|yeni\s+(bir\s+)?(tedarikçi|tedarikci)/.test(msg)) return 'create_supplier';
    if (/(depo|warehouse)\S*\s+(ekle|oluştur|kaydet|aç)|yeni\s+(bir\s+)?(depo|warehouse)/.test(msg)) return 'create_warehouse';
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
      const greetingAnswer = context?.role === 'customer'
        ? 'Merhaba! Siparişleriniz, çekleriniz ve ürün kataloğu hakkında yardımcı olabilirim. Ne öğrenmek istersiniz?'
        : 'Merhaba! ERP sisteminizdeki ürünler, siparişler, müşteriler, çekler, tedarikçiler ve raporlar hakkında yardımcı olabilirim. Ne öğrenmek istersiniz?';
      return {
        success: true,
        answer: greetingAnswer,
        steps: [],
        meta: { greeting: true }
      };
    }

    // Detect create-intents before LLM — always show form, never let LLM pick wrong tool
    const formTool = this.detectFormTool(userMessage);
    if (formTool) {
      return {
        success: true,
        answer: 'Aşağıdaki formu doldurun:',
        steps: [],
        meta: { orchestrator_mode: this.mode, ask_for_info: true, form_tool: formTool }
      };
    }

    const plan = await this.planWithTools({ userMessage, fallbackTools, context });

    // Zayıf planner düzeltmesi: "vadesi dolacak/yaklaşan" soruları gelecek vadeyi sorar,
    // planner sık sık get_overdue_cheques (geçmiş vade) seçiyor — deterministik düzelt.
    const lowerMsg = String(userMessage || '').toLowerCase()
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/İ/g, 'i');
    if (/vadesi (dol|yaklas|gel)|yaklasan (cek|vade|odeme)/.test(lowerMsg) && !/vadesi gec|gecikmis/.test(lowerMsg)) {
      const days = /ay\b|30 gun/.test(lowerMsg) ? 30 : 7;
      let swapped = false;
      plan.steps = (plan.steps || []).map((s) => {
        if (s.tool === 'get_overdue_cheques' || s.tool === 'search_cheques') {
          swapped = true;
          return { tool: 'get_due_soon_cheques', args: { days } };
        }
        return s;
      });
      if (!swapped && !(plan.steps || []).some((s) => s.tool === 'get_due_soon_cheques')) {
        plan.steps = [{ tool: 'get_due_soon_cheques', args: { days } }, ...(plan.steps || [])];
      }
    }

    // "Ödeme riski" sorularında zayıf planner sık sık get_low_stock_products seçiyor.
    // Deterministik düzelt: risk niyeti → get_payment_risk_assessment.
    if (/odeme\s*risk|riskli\s*musteri|risk\s*(analiz|degerlend)|tahsilat\s*risk/.test(lowerMsg)) {
      let swapped = false;
      plan.steps = (plan.steps || []).map((s) => {
        if (s.tool === 'get_low_stock_products' || s.tool === 'get_financial_summary') {
          swapped = true;
          return { tool: 'get_payment_risk_assessment', args: {} };
        }
        return s;
      });
      if (!swapped && !(plan.steps || []).some((s) => s.tool === 'get_payment_risk_assessment')) {
        plan.steps = [{ tool: 'get_payment_risk_assessment', args: {} }, ...(plan.steps || [])];
      }
    }

    // Döviz kuru soruları → get_currency_rates
    if (/dolar|euro|gbp|sterlin|doviz|kur\s*(nedir|soyle|goster|kac)|kac\s*(tl|lira)/.test(lowerMsg)) {
      if (!(plan.steps || []).some((s) => s.tool === 'get_currency_rates')) {
        plan.steps = [{ tool: 'get_currency_rates', args: {} }];
      }
    }

    // "Finansal özet" sorgularında model araç seçmeyebiliyor — zorla ekle.
    if (/finansal\s*(ozet|durum|rapor)|mali\s*(ozet|durum)|genel\s*finansal/.test(lowerMsg)) {
      if (!(plan.steps || []).some((s) => s.tool === 'get_financial_summary')) {
        plan.steps = [{ tool: 'get_financial_summary', args: {} }, ...(plan.steps || [])];
      }
    }

    // "Düşük stok" soruları recommend_reorder'a gidebiliyor — get_low_stock_products'a yönlendir.
    if (/dusuk\s*stok|kritik\s*stok|az\s*stok|stok\s*(uyar|azal|bit|tuken)/.test(lowerMsg)) {
      plan.steps = (plan.steps || []).map((s) =>
        s.tool === 'recommend_reorder' ? { tool: 'get_low_stock_products', args: {} } : s
      );
      if (!(plan.steps || []).some((s) => s.tool === 'get_low_stock_products')) {
        plan.steps = [{ tool: 'get_low_stock_products', args: {} }, ...(plan.steps || [])];
      }
    }

    // "Envanter/stok değeri" parasal hesaptır; planner sık sık get_warehouse_stock (adet)
    // veya get_low_stock_products seçip aritmetik halüsinasyona yol açıyor. Deterministik düzelt.
    if (/envanter\s*deger|stok\s*deger|stogun\s*deger|depo.*deger|mal.*deger/.test(lowerMsg)) {
      let swapped = false;
      plan.steps = (plan.steps || []).map((s) => {
        if (s.tool === 'get_warehouse_stock' || s.tool === 'get_low_stock_products') {
          swapped = true;
          return { tool: 'get_inventory_value', args: {} };
        }
        return s;
      });
      if (!swapped && !(plan.steps || []).some((s) => s.tool === 'get_inventory_value')) {
        plan.steps = [{ tool: 'get_inventory_value', args: {} }, ...(plan.steps || [])];
      }
    }

    // "Tamamlanan/iptal/bekleyen siparişler" → get_orders_list'e doğru status'ü enjekte et.
    // Planner status'ü atlayıp tüm siparişleri döndürünce model yanlış etiketliyor.
    const orderStatusMap = [
      [/tamamlan/, 'completed'],
      [/iptal\s*edil|iptal\s*olan/, 'cancelled'],
      [/bekleyen\s*siparis|siparis.*bekle/, 'pending']
    ];
    const matchedStatus = orderStatusMap.find(([re]) => re.test(lowerMsg));
    if (matchedStatus) {
      plan.steps = (plan.steps || []).map((s) =>
        (s.tool === 'get_orders_list' || s.tool === 'search_orders' || s.tool === 'get_orders_summary')
          ? { tool: 'get_orders_list', args: { ...(s.args || {}), status: matchedStatus[1] } }
          : s
      );
    }

    // "Müşteri listele/göster" → search_customers (model get_customer_detail seçiyor)
    if (/musteri.*(listele|goster|soyle|hepsi|tumu|kac|say)|tum\s*musteri|butun\s*musteri/.test(lowerMsg)) {
      plan.steps = (plan.steps || []).map((s) =>
        s.tool === 'get_customer_detail' ? { tool: 'search_customers', args: {} } : s
      );
      if (!(plan.steps || []).some((s) => s.tool === 'search_customers')) {
        plan.steps = [{ tool: 'search_customers', args: {} }];
      }
    }

    // "Siparişleri söyle/listele" → orders araçlarına yönlendir (model get_customer_detail seçiyor)
    if (/siparis.*(soyle|goster|listele|var\s*mi|hepsi|ne\s*var|say|kac|ne)|siparislerim|siparis.*var/.test(lowerMsg)
        && !(plan.steps || []).some((s) => ['get_orders_list', 'get_orders_summary', 'search_orders'].includes(s.tool))) {
      plan.steps = (plan.steps || []).map((s) =>
        s.tool === 'get_customer_detail' ? { tool: 'get_orders_summary', args: {} } : s
      );
      if (!(plan.steps || []).some((s) => ['get_orders_list', 'get_orders_summary', 'search_orders'].includes(s.tool))) {
        plan.steps = [{ tool: 'get_orders_summary', args: {} }, ...(plan.steps || [])];
      }
    }

    // "Genel özet/dashboard" → get_dashboard_summary
    if (/genel\s*(ozet|durum)|ozet\s*(goster|ver)|dashboard|sistemi\s*ozetle/.test(lowerMsg)) {
      if (!(plan.steps || []).some((s) => s.tool === 'get_dashboard_summary')) {
        plan.steps = [{ tool: 'get_dashboard_summary', args: {} }];
      }
    }

    // Model araç seçmediyse anahtar-kelime tabanlı fallback
    if (!(plan.steps || []).length) {
      const kw = [
        [/siparis.*(var|kac|listele|goster|soyle|ozet|say|ne)|kac\s+siparis|siparisler/, { tool: 'get_orders_summary', args: {} }],
        [/musteri.*(listele|goster|soyle|var|kac|say)|kac\s+musteri/, { tool: 'search_customers', args: {} }],
        [/urun.*(listele|goster|soyle|var|kac|say)|kac\s+urun/, { tool: 'search_products', args: {} }],
        [/cek.*(listele|goster|soyle|var|kac|say)|kac\s+cek/, { tool: 'search_cheques', args: {} }],
        [/tedarikci.*(listele|goster|soyle|var|kac)|kac\s+tedarikci/, { tool: 'get_suppliers_list', args: {} }],
        [/ozet|dashboard|genel durum|durumu ne/, { tool: 'get_dashboard_summary', args: {} }],
        [/depo|warehouse|stok durumu|depolardaki/, { tool: 'get_warehouse_stock', args: {} }],
        [/gelir|ciro|bu ay|aylik gelir/, { tool: 'get_orders_summary', args: { period: 'month' } }],
      ];
      const matched = kw.find(([re]) => re.test(lowerMsg));
      if (matched) plan.steps = [matched[1]];
    }

    // Bu yol sorgu yoludur — mutation niyeti aiService'te ayrı akışta (onaylı) işlenir.
    // LLM planner yanlışlıkla yazma aracı seçerse (örn. "durumumu özetle" → set_order_status) ele.
    let removedMutationSteps = 0;
    if (Array.isArray(plan.steps)) {
      const before = plan.steps.length;
      plan.steps = plan.steps.filter((s) => !this.tools.isMutationTool(s.tool));
      removedMutationSteps = before - plan.steps.length;
    }
    if (removedMutationSteps > 0 && !plan.steps.length) {
      return {
        success: true,
        answer: 'Bu istek bir kayıt değişikliği gerektiriyor gibi görünüyor. Yapmak istediğiniz işlemi açıkça belirtir misiniz? Örn: "ORD-123 siparişini tamamla" veya "X ürününün stoğunu güncelle".',
        steps: [],
        meta: { orchestrator_mode: this.mode, ask_for_info: true, mutation_blocked_in_query_path: true }
      };
    }

    if (plan.strategy === 'rbac_denied') {
      return {
        success: true,
        answer: 'Bu bilgiye erişim yetkiniz yok.',
        steps: [],
        meta: { orchestrator_mode: this.mode, rbac_denied: true }
      };
    }

    if (!plan.steps?.length) {
      const isRbacDenied = this.isRbacDeniedByKeyword(userMessage, context?.role);
      const answer = isRbacDenied
        ? 'Bu bilgiye erişim yetkiniz yok.'
        : 'Bu konuda size yardımcı olabilmem için daha fazla bilgiye ihtiyacım var. Lütfen detayları belirtin.';
      return {
        success: true,
        answer,
        steps: [],
        meta: { orchestrator_mode: this.mode, ask_for_info: true, rbac_denied: isRbacDenied }
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

    const rbacErrorStep = execution.steps.find(
      (s) => s.type === 'tool_error' && /erişim yetkiniz yok/i.test(s.error || '')
    );
    if (rbacErrorStep) {
      return {
        success: true,
        answer: 'Bu bilgiye erişim yetkiniz yok.',
        steps: [{ type: 'plan', plan }, ...execution.steps],
        meta: { orchestrator_mode: this.mode, rbac_denied: true }
      };
    }

    const verification = this.verify({ toolContexts: execution.toolContexts });
    const answer = await this.respond({
      userMessage,
      toolContexts: execution.toolContexts,
      context
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
