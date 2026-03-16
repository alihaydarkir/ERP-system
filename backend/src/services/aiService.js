const axios = require('axios');
const agentTools = require('./agentTools');
const AuditLog = require('../models/AuditLog');
const PermissionService = require('./permissionService');

class AIService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama2';
    this.maxTokens = parseInt(process.env.AI_MAX_CONTEXT) || 2000;
    this.timeout = 180000; // 3 dakika — büyük modeller için
    this.pendingMutations = new Map();
    this.mutationPermissionMap = {
      set_product_stock: 'products.edit',
      deactivate_product: 'products.delete',
      cancel_order: 'orders.cancel',
      set_cheque_status: 'cheques.change_status',
      create_customer: 'customers.create',
      update_customer: 'customers.edit',
      create_product: 'products.create',
      update_product: 'products.edit',
      create_supplier: 'suppliers.create',
      update_supplier: 'suppliers.edit',
      create_warehouse: 'warehouses.create',
      update_warehouse: 'warehouses.edit',
      create_cheque: 'cheques.create',
      set_order_status: 'orders.edit',
      set_invoice_status: 'invoices.edit'
    };
  }

  formatTRY(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  normalizeToolResult(toolName, result) {
    const safeResult = result ?? {};

    switch (toolName) {
      case 'get_overdue_cheques': {
        const count = Number(safeResult.count || safeResult?.cheques?.length || 0);
        const total = Number(safeResult.total_overdue_amount || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Vadesi geçmiş çek sayısı: ${count}. Toplam tutar: ${this.formatTRY(total)}.`,
          meta: { has_data: count > 0, count }
        };
      }

      case 'search_cheques': {
        const list = Array.isArray(safeResult) ? safeResult : [];
        const count = list.length;
        const total = list.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
        return {
          tool: toolName,
          data: list,
          summary: `Çek listesi sonucu: ${count} kayıt. Toplam tutar: ${this.formatTRY(total)}.`,
          meta: { has_data: count > 0, count }
        };
      }

      case 'get_financial_summary': {
        const pendingCheques = Number(safeResult.pending_cheques_count || 0);
        const overdueCheques = Number(safeResult.overdue_cheques_count || 0);
        const pendingOrders = Number(safeResult.pending_orders_count || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Finansal özet: bekleyen çek ${pendingCheques}, vadesi geçmiş çek ${overdueCheques}, bekleyen sipariş ${pendingOrders}.`,
          meta: {
            has_data: pendingCheques > 0 || overdueCheques > 0 || pendingOrders > 0,
            count: pendingCheques + overdueCheques + pendingOrders
          }
        };
      }

      case 'get_low_stock_products': {
        const count = Number(safeResult.count || safeResult?.products?.length || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Düşük stoklu ürün sayısı: ${count}.`,
          meta: { has_data: count > 0, count }
        };
      }

      case 'search_products': {
        const count = Number(safeResult.count || safeResult?.products?.length || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Ürün arama sonucu: ${count} kayıt.`,
          meta: { has_data: count > 0, count }
        };
      }

      case 'search_customers': {
        const count = Number(safeResult.count || safeResult?.customers?.length || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Müşteri arama sonucu: ${count} kayıt.`,
          meta: { has_data: count > 0, count }
        };
      }

      case 'get_orders_summary': {
        const totalOrders = Number(safeResult.total_orders || 0);
        const totalAmount = Number(safeResult.total_amount || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Sipariş özeti: ${totalOrders} sipariş, toplam ${this.formatTRY(totalAmount)}.`,
          meta: { has_data: totalOrders > 0, count: totalOrders }
        };
      }

      case 'get_dashboard_summary': {
        const totalOrders = Number(safeResult.total_orders || 0);
        const totalCustomers = Number(safeResult.total_customers || 0);
        const lowStock = Number(safeResult.low_stock_count || 0);
        return {
          tool: toolName,
          data: safeResult,
          summary: `Genel durum: ${totalOrders} sipariş, ${totalCustomers} müşteri, ${lowStock} düşük stok uyarısı.`,
          meta: {
            has_data: totalOrders > 0 || totalCustomers > 0 || lowStock > 0,
            count: totalOrders + totalCustomers
          }
        };
      }

      default: {
        const count = Array.isArray(safeResult) ? safeResult.length : Number(safeResult?.count || 0);
        const mutationMessage = safeResult?.created
          ? `${toolName} oluşturma işlemi tamamlandı.`
          : safeResult?.updated
          ? `${toolName} güncelleme işlemi tamamlandı.`
          : `${toolName} aracı çalıştırıldı.`;
        return {
          tool: toolName,
          data: safeResult,
          summary: mutationMessage,
          meta: { has_data: count > 0, count }
        };
      }
    }
  }

  // ── Anahtar kelimeye göre hangi araçları çağıracağını belirle ─────────────
  detectTools(message) {
    const msg = message.toLowerCase();
    const tools = [];

    // Vadesi geçmiş çek
    if (/(vadesi geç|gecikmiş çek|overdue)/.test(msg)) {
      tools.push({ name: 'get_overdue_cheques', args: {} });
    }
    // Bekleyen çek
    if (/(bekleyen çek|pending çek|ödenmemiş çek)/.test(msg)) {
      tools.push({ name: 'search_cheques', args: { status: 'pending', limit: 20 } });
    }
    // Genel çek (yukarıdakilerle çakışmıyorsa)
    if (/çek/.test(msg) && !/(vadesi geç|gecikmiş|bekleyen|overdue|pending)/.test(msg)) {
      tools.push({ name: 'search_cheques', args: { limit: 10 } });
    }
    // Finansal / gelir / para
    if (/(finansal|gelir|para|bütçe|tutar|kazanç|kâr|zarar|mali)/.test(msg)) {
      tools.push({ name: 'get_financial_summary', args: {} });
    }
    // Stok
    if (/(stok|envanter|depo|ürün azaldı|düşük stok)/.test(msg)) {
      tools.push({ name: 'get_low_stock_products', args: {} });
    }
    // Ürün
    if (/(ürün|product|malzeme|kategori)/.test(msg)) {
      tools.push({ name: 'search_products', args: { limit: 10 } });
    }
    // Müşteri
    if (/(müşteri|customer|müşteriler|alıcı)/.test(msg)) {
      tools.push({ name: 'search_customers', args: { limit: 10 } });
    }
    // Sipariş
    if (/(sipariş|order|siparişler|satış)/.test(msg)) {
      const period = /bugün|today/.test(msg) ? 'today' : /hafta|week/.test(msg) ? 'week' : 'month';
      tools.push({ name: 'get_orders_summary', args: { period } });
    }
    // Genel özet / dashboard
    if (/(özet|genel durum|dashboard|sistem|durum|analiz|merhaba|ne var|nasıl)/.test(msg)) {
      tools.push({ name: 'get_dashboard_summary', args: {} });
    }

    // Hiç araç eşleşmediyse genel özet getir
    if (tools.length === 0) {
      tools.push({ name: 'get_dashboard_summary', args: {} });
    }

    // Tekrarları kaldır
    const seen = new Set();
    return tools.filter(t => {
      const key = t.name + JSON.stringify(t.args);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  detectMutationIntent(message) {
    const msg = String(message || '').toLowerCase();
    return /(sil|sıfırla|güncelle|değiştir|düş|azalt|iptal et|kaldır|delete|update|set stock|oluştur|ekle|yarat|durumunu|status)/.test(msg);
  }

  isConfirmationMessage(message) {
    const msg = String(message || '').toLowerCase().trim();
    return /^(onaylıyorum|evet onay|onay veriyorum|evet)$/i.test(msg);
  }

  isCancelMessage(message) {
    const msg = String(message || '').toLowerCase().trim();
    return /^(vazgeç|iptal|hayır|hayır iptal)$/i.test(msg);
  }

  extractQuotedText(message) {
    const m = String(message || '').match(/["“”']([^"“”']+)["“”']/);
    return m ? m[1].trim() : null;
  }

  extractQuotedTexts(message) {
    const matches = [...String(message || '').matchAll(/["“”']([^"“”']+)["“”']/g)];
    return matches.map(m => m[1].trim()).filter(Boolean);
  }

  parseKeyValueFields(message) {
    const fields = {};
    const regex = /([a-zA-ZçğıöşüÇĞİÖŞÜ_]+)\s*[:=]\s*("[^"]+"|'[^']+'|[^,;\n]+)/g;
    const text = String(message || '');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const rawKey = match[1].trim().toLowerCase();
      const rawValue = match[2].trim().replace(/^['"]|['"]$/g, '').trim();
      if (rawValue.length > 0) {
        fields[rawKey] = rawValue;
      }
    }

    return fields;
  }

  mapField(fields, aliases, fallback = undefined) {
    for (const alias of aliases) {
      if (fields[alias] !== undefined) return fields[alias];
    }
    return fallback;
  }

  normalizeBoolean(value) {
    if (value === undefined || value === null) return undefined;
    const s = String(value).toLowerCase().trim();
    if (['true', '1', 'evet', 'aktif', 'açık'].includes(s)) return true;
    if (['false', '0', 'hayır', 'pasif', 'kapalı'].includes(s)) return false;
    return undefined;
  }

  async hasMutationPermission({ user_id, role, toolName }) {
    if (role === 'super_admin' || role === 'admin') {
      return { allowed: true, requiredPermission: null };
    }

    const requiredPermission = this.mutationPermissionMap[toolName];
    if (!requiredPermission) {
      return { allowed: false, requiredPermission: null };
    }

    if (!user_id) {
      return { allowed: false, requiredPermission };
    }

    const allowed = await PermissionService.hasPermission(user_id, requiredPermission);
    return { allowed, requiredPermission };
  }

  async logAgentMutation({ user_id, company_id, tool, args, result, error, status }) {
    try {
      await AuditLog.create({
        user_id,
        action: `AI_MUTATION_${String(status || 'UNKNOWN').toUpperCase()}`,
        entity_type: tool,
        entity_id: null,
        changes: {
          source: 'ai_agent',
          status,
          args,
          result,
          error
        },
        ip_address: null,
        company_id
      });
    } catch (err) {
      console.error('AI mutation audit log error:', err.message);
    }
  }

  detectMutationAction(message) {
    const msg = String(message || '').toLowerCase();
    const quoted = this.extractQuotedText(message);
    const quotedTexts = this.extractQuotedTexts(message);
    const fields = this.parseKeyValueFields(message);

    const statusFromText = (text, domain) => {
      const lower = String(text || '').toLowerCase();
      if (domain === 'order') {
        if (/(iptal|cancel)/.test(lower)) return 'cancelled';
        if (/(tamam|complete)/.test(lower)) return 'completed';
        if (/(işlem|processing)/.test(lower)) return 'processing';
        if (/(bekle|pending)/.test(lower)) return 'pending';
      }
      if (domain === 'invoice') {
        if (/(iptal|cancel)/.test(lower)) return 'cancelled';
        if (/(ödendi|öde|paid)/.test(lower)) return 'paid';
        if (/(gönder|sent)/.test(lower)) return 'sent';
        if (/(gecik|overdue)/.test(lower)) return 'overdue';
        if (/(taslak|draft)/.test(lower)) return 'draft';
      }
      if (domain === 'cheque') {
        if (/(iptal|cancel)/.test(lower)) return 'cancelled';
        if (/(ödendi|öde|paid)/.test(lower)) return 'paid';
        if (/(bekle|pending)/.test(lower)) return 'pending';
      }
      return null;
    };

    // 1) Ürün stoğunu sıfırla/sil
    if (/(stoğunu sil|stoğunu sıfırla|stoktan sil|stok 0|stok sıfır)/.test(msg)) {
      const productIdentifier = quoted || String(message || '').replace(/.*(şunun|urun|ürün)\s*/i, '').split('sto')[0].trim();
      if (!productIdentifier) return null;
      return {
        tool: 'set_product_stock',
        args: { product_identifier: productIdentifier, stock_quantity: 0 },
        preview: `"${productIdentifier}" ürününün stok miktarı 0 yapılacak.`
      };
    }

    // 2) Ürünü pasif yap (soft delete)
    if (/(ürünü sil|ürün sil|ürünü kaldır)/.test(msg)) {
      const productIdentifier = quoted || String(message || '').replace(/.*(ürünü|ürün|urun)\s*/i, '').replace(/(sil|kaldır).*/i, '').trim();
      if (!productIdentifier) return null;
      return {
        tool: 'deactivate_product',
        args: { product_identifier: productIdentifier },
        preview: `"${productIdentifier}" ürünü pasif duruma alınacak (soft delete).`
      };
    }

    // 3) Sipariş iptal et
    if (/(sipariş.*iptal|order.*cancel)/.test(msg)) {
      const orderId = (String(message || '').match(/(ORD[-\w]+|\b\d{1,10}\b)/i) || [])[1];
      if (!orderId) return null;
      return {
        tool: 'cancel_order',
        args: { order_identifier: orderId },
        preview: `"${orderId}" siparişi iptal edilecek.`
      };
    }

    // 4) Çek durumunu güncelle
    if (/çek/.test(msg) && /(öde|ödendi|paid|iptal|cancel|beklemede|pending)/.test(msg)) {
      const chequeId = (String(message || '').match(/\b\d{3,}\b/) || [])[0] || quoted;
      if (!chequeId) return null;

      let status = statusFromText(msg, 'cheque') || 'pending';

      return {
        tool: 'set_cheque_status',
        args: { cheque_identifier: String(chequeId), status },
        preview: `"${chequeId}" numaralı çekin durumu "${status}" olarak güncellenecek.`
      };
    }

    // 5) Müşteri oluştur
    if (/(müşteri|customer).*(oluştur|ekle|yarat)/.test(msg)) {
      const fullName = this.mapField(fields, ['full_name', 'ad_soyad', 'adsoyad', 'isim']);
      const companyName = this.mapField(fields, ['company_name', 'şirket', 'sirket', 'firma']);
      const taxOffice = this.mapField(fields, ['tax_office', 'vergi_dairesi']);
      const taxNumber = this.mapField(fields, ['tax_number', 'vergi_no', 'vergino']);
      const phone = this.mapField(fields, ['phone_number', 'telefon', 'phone']);
      const location = this.mapField(fields, ['company_location', 'lokasyon', 'adres']);

      if (!fullName || !companyName || !taxOffice || !taxNumber) return null;

      return {
        tool: 'create_customer',
        args: {
          full_name: fullName,
          company_name: companyName,
          tax_office: taxOffice,
          tax_number: taxNumber,
          phone_number: phone,
          company_location: location
        },
        preview: `"${companyName}" için yeni müşteri kaydı oluşturulacak.`
      };
    }

    // 6) Müşteri güncelle
    if (/(müşteri|customer).*(güncelle|değiştir|update)/.test(msg)) {
      const identifier = this.mapField(fields, ['id', 'customer', 'customer_id', 'musteri']) || quoted;
      if (!identifier) return null;

      const args = {
        customer_identifier: identifier,
        full_name: this.mapField(fields, ['full_name', 'ad_soyad', 'isim']),
        company_name: this.mapField(fields, ['company_name', 'şirket', 'sirket', 'firma']),
        tax_office: this.mapField(fields, ['tax_office', 'vergi_dairesi']),
        tax_number: this.mapField(fields, ['tax_number', 'vergi_no', 'vergino']),
        phone_number: this.mapField(fields, ['phone_number', 'telefon', 'phone']),
        company_location: this.mapField(fields, ['company_location', 'lokasyon', 'adres'])
      };

      return {
        tool: 'update_customer',
        args,
        preview: `"${identifier}" müşteri kaydı güncellenecek.`
      };
    }

    // 7) Ürün oluştur
    if (/(ürün|product).*(oluştur|ekle|yarat)/.test(msg)) {
      const name = this.mapField(fields, ['name', 'ürün', 'urun']);
      const sku = this.mapField(fields, ['sku', 'kod']);
      const price = this.mapField(fields, ['price', 'fiyat']);
      if (!name || !sku || price === undefined) return null;

      return {
        tool: 'create_product',
        args: {
          name,
          sku,
          price: Number(price),
          stock_quantity: Number(this.mapField(fields, ['stock_quantity', 'stok'], '0')),
          category: this.mapField(fields, ['category', 'kategori']),
          description: this.mapField(fields, ['description', 'açıklama', 'aciklama']),
          low_stock_threshold: Number(this.mapField(fields, ['low_stock_threshold', 'eşik', 'esik'], '10'))
        },
        preview: `"${name}" adlı yeni ürün oluşturulacak.`
      };
    }

    // 8) Ürün güncelle
    if (/(ürün|product).*(güncelle|değiştir|update)/.test(msg)) {
      const identifier = this.mapField(fields, ['id', 'sku', 'product', 'product_id']) || quoted;
      if (!identifier) return null;

      return {
        tool: 'update_product',
        args: {
          product_identifier: identifier,
          name: this.mapField(fields, ['name', 'ürün', 'urun']),
          price: fields.price !== undefined || fields.fiyat !== undefined ? Number(this.mapField(fields, ['price', 'fiyat'])) : undefined,
          stock_quantity: fields.stock_quantity !== undefined || fields.stok !== undefined ? Number(this.mapField(fields, ['stock_quantity', 'stok'])) : undefined,
          category: this.mapField(fields, ['category', 'kategori']),
          description: this.mapField(fields, ['description', 'açıklama', 'aciklama']),
          low_stock_threshold: fields.low_stock_threshold !== undefined || fields.eşik !== undefined || fields.esik !== undefined
            ? Number(this.mapField(fields, ['low_stock_threshold', 'eşik', 'esik']))
            : undefined,
          is_active: this.normalizeBoolean(this.mapField(fields, ['is_active', 'aktif']))
        },
        preview: `"${identifier}" ürünü güncellenecek.`
      };
    }

    // 9) Tedarikçi oluştur
    if (/(tedarikçi|supplier).*(oluştur|ekle|yarat)/.test(msg)) {
      const supplierName = this.mapField(fields, ['supplier_name', 'name', 'tedarikçi', 'tedarikci', 'firma']);
      if (!supplierName) return null;

      return {
        tool: 'create_supplier',
        args: {
          supplier_name: supplierName,
          contact_person: this.mapField(fields, ['contact_person', 'yetkili']),
          email: this.mapField(fields, ['email']),
          phone: this.mapField(fields, ['phone', 'telefon']),
          address: this.mapField(fields, ['address', 'adres']),
          tax_office: this.mapField(fields, ['tax_office', 'vergi_dairesi']),
          tax_number: this.mapField(fields, ['tax_number', 'vergi_no', 'vergino']),
          iban: this.mapField(fields, ['iban']),
          payment_terms: this.mapField(fields, ['payment_terms', 'vade']),
          currency: this.mapField(fields, ['currency', 'para_birimi']),
          notes: this.mapField(fields, ['notes', 'not']),
          rating: this.mapField(fields, ['rating', 'puan']) ? Number(this.mapField(fields, ['rating', 'puan'])) : undefined
        },
        preview: `"${supplierName}" adlı yeni tedarikçi oluşturulacak.`
      };
    }

    // 10) Tedarikçi güncelle
    if (/(tedarikçi|supplier).*(güncelle|değiştir|update)/.test(msg)) {
      const identifier = this.mapField(fields, ['id', 'supplier', 'supplier_id', 'tax_number', 'vergi_no']) || quoted;
      if (!identifier) return null;

      return {
        tool: 'update_supplier',
        args: {
          supplier_identifier: identifier,
          supplier_name: this.mapField(fields, ['supplier_name', 'name']),
          contact_person: this.mapField(fields, ['contact_person', 'yetkili']),
          email: this.mapField(fields, ['email']),
          phone: this.mapField(fields, ['phone', 'telefon']),
          address: this.mapField(fields, ['address', 'adres']),
          tax_office: this.mapField(fields, ['tax_office', 'vergi_dairesi']),
          tax_number: this.mapField(fields, ['tax_number', 'vergi_no', 'vergino']),
          iban: this.mapField(fields, ['iban']),
          payment_terms: this.mapField(fields, ['payment_terms', 'vade']),
          currency: this.mapField(fields, ['currency', 'para_birimi']),
          notes: this.mapField(fields, ['notes', 'not']),
          rating: this.mapField(fields, ['rating', 'puan']) ? Number(this.mapField(fields, ['rating', 'puan'])) : undefined,
          is_active: this.normalizeBoolean(this.mapField(fields, ['is_active', 'aktif']))
        },
        preview: `"${identifier}" tedarikçi kaydı güncellenecek.`
      };
    }

    // 11) Depo oluştur
    if (/(depo|warehouse).*(oluştur|ekle|yarat)/.test(msg)) {
      const warehouseName = this.mapField(fields, ['warehouse_name', 'name', 'depo']);
      const warehouseCode = this.mapField(fields, ['warehouse_code', 'code', 'kod']);
      if (!warehouseName || !warehouseCode) return null;

      return {
        tool: 'create_warehouse',
        args: {
          warehouse_name: warehouseName,
          warehouse_code: warehouseCode,
          location: this.mapField(fields, ['location', 'lokasyon']),
          address: this.mapField(fields, ['address', 'adres']),
          city: this.mapField(fields, ['city', 'şehir', 'sehir']),
          country: this.mapField(fields, ['country', 'ülke', 'ulke']),
          manager_name: this.mapField(fields, ['manager_name', 'sorumlu']),
          phone: this.mapField(fields, ['phone', 'telefon']),
          email: this.mapField(fields, ['email']),
          capacity: this.mapField(fields, ['capacity', 'kapasite']) ? Number(this.mapField(fields, ['capacity', 'kapasite'])) : undefined,
          notes: this.mapField(fields, ['notes', 'not'])
        },
        preview: `"${warehouseName}" adlı yeni depo oluşturulacak.`
      };
    }

    // 12) Depo güncelle
    if (/(depo|warehouse).*(güncelle|değiştir|update)/.test(msg)) {
      const identifier = this.mapField(fields, ['id', 'warehouse', 'warehouse_id', 'warehouse_code', 'kod']) || quoted;
      if (!identifier) return null;

      return {
        tool: 'update_warehouse',
        args: {
          warehouse_identifier: identifier,
          warehouse_name: this.mapField(fields, ['warehouse_name', 'name']),
          warehouse_code: this.mapField(fields, ['warehouse_code', 'code', 'kod']),
          location: this.mapField(fields, ['location', 'lokasyon']),
          address: this.mapField(fields, ['address', 'adres']),
          city: this.mapField(fields, ['city', 'şehir', 'sehir']),
          country: this.mapField(fields, ['country', 'ülke', 'ulke']),
          manager_name: this.mapField(fields, ['manager_name', 'sorumlu']),
          phone: this.mapField(fields, ['phone', 'telefon']),
          email: this.mapField(fields, ['email']),
          capacity: this.mapField(fields, ['capacity', 'kapasite']) ? Number(this.mapField(fields, ['capacity', 'kapasite'])) : undefined,
          notes: this.mapField(fields, ['notes', 'not']),
          is_active: this.normalizeBoolean(this.mapField(fields, ['is_active', 'aktif']))
        },
        preview: `"${identifier}" depo kaydı güncellenecek.`
      };
    }

    // 13) Çek oluştur
    if (/çek/.test(msg) && /(oluştur|ekle|yarat)/.test(msg)) {
      const serialNo = this.mapField(fields, ['check_serial_no', 'seri_no', 'seri']);
      const issuer = this.mapField(fields, ['check_issuer', 'kesideci', 'issuer']);
      const customerIdentifier = this.mapField(fields, ['customer', 'customer_identifier', 'müşteri', 'musteri']) || quotedTexts[0];
      const bankName = this.mapField(fields, ['bank_name', 'banka']);
      const dueDate = this.mapField(fields, ['due_date', 'vade']);
      const amount = this.mapField(fields, ['amount', 'tutar']);

      if (!serialNo || !issuer || !customerIdentifier || !bankName || !dueDate || amount === undefined) return null;

      return {
        tool: 'create_cheque',
        args: {
          check_serial_no: serialNo,
          check_issuer: issuer,
          customer_identifier: customerIdentifier,
          bank_name: bankName,
          due_date: dueDate,
          amount: Number(amount),
          received_date: this.mapField(fields, ['received_date', 'alinma_tarihi', 'alınma_tarihi']),
          currency: this.mapField(fields, ['currency', 'para_birimi']) || 'TRY',
          status: this.mapField(fields, ['status', 'durum']) || 'pending',
          notes: this.mapField(fields, ['notes', 'not'])
        },
        preview: `"${serialNo}" seri numaralı yeni çek oluşturulacak.`
      };
    }

    // 14) Sipariş durumu güncelle
    if (/(sipariş|order).*(durum|status|tamamla|işleme al|beklemede|iptal|cancel|completed|processing|pending)/.test(msg)) {
      const orderId = this.mapField(fields, ['id', 'order', 'order_id', 'order_number']) || (String(message || '').match(/(ORD[-\w]+|\b\d{1,10}\b)/i) || [])[1] || quoted;
      const status = this.mapField(fields, ['status', 'durum']) || statusFromText(msg, 'order');
      if (!orderId || !status) return null;

      return {
        tool: status === 'cancelled' ? 'cancel_order' : 'set_order_status',
        args: status === 'cancelled'
          ? { order_identifier: String(orderId) }
          : { order_identifier: String(orderId), status },
        preview: `"${orderId}" siparişinin durumu "${status}" olarak güncellenecek.`
      };
    }

    // 15) Fatura durumu güncelle
    if (/(fatura|invoice).*(durum|status|öde|paid|iptal|cancel|gönder|sent|taslak|draft|gecik|overdue)/.test(msg)) {
      const invoiceId = this.mapField(fields, ['id', 'invoice', 'invoice_id', 'invoice_number']) || quoted;
      const status = this.mapField(fields, ['status', 'durum']) || statusFromText(msg, 'invoice');
      if (!invoiceId || !status) return null;

      return {
        tool: 'set_invoice_status',
        args: { invoice_identifier: String(invoiceId), status },
        preview: `"${invoiceId}" faturasının durumu "${status}" olarak güncellenecek.`
      };
    }

    return null;
  }

  // ── Ollama'ya mesaj gönder ────────────────────────────────────────────────
  async sendToOllama(messages) {
    const response = await axios.post(
      `${this.ollamaUrl}/api/chat`,
      {
        model: this.model,
        messages,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9 }
      },
      { timeout: this.timeout }
    );
    return response.data.message?.content || '';
  }

  // ── Ana Agent (Fetch-First Pattern) ──────────────────────────────────────
  // Önce veriyi çek, sonra modele sadece "yorumla" de
  async runAgent(userMessage, contextOrCompanyId) {
    const context = typeof contextOrCompanyId === 'object'
      ? contextOrCompanyId
      : { company_id: contextOrCompanyId };

    const company_id = context.company_id;
    const user_id = context.user_id || 0;
    const role = context.role || 'user';
    const mutationKey = `${company_id}:${user_id}`;

    const steps = [];

    if (this.isCancelMessage(userMessage)) {
      const pending = this.pendingMutations.get(mutationKey);
      if (pending) {
        this.pendingMutations.delete(mutationKey);
        return {
          success: true,
          answer: 'Bekleyen işlem iptal edildi.',
          steps,
          meta: { cancelled_pending_mutation: true }
        };
      }
      return {
        success: true,
        answer: 'İptal edilecek bekleyen bir işlem yok.',
        steps,
        meta: { cancelled_pending_mutation: false }
      };
    }

    // 0) Onay mesajı gelirse bekleyen mutation'ı uygula
    if (this.isConfirmationMessage(userMessage)) {
      const pending = this.pendingMutations.get(mutationKey);
      if (!pending) {
        return { success: true, answer: 'Onay bekleyen bir işlem bulunamadı.', steps, meta: { requires_confirmation: false } };
      }

      // 5 dk timeout
      if (Date.now() - pending.created_at > 5 * 60 * 1000) {
        this.pendingMutations.delete(mutationKey);
        return { success: true, answer: 'Onay süresi doldu. Lütfen işlemi tekrar başlatın.', steps, meta: { confirmation_expired: true } };
      }

      const pendingPermission = await this.hasMutationPermission({ user_id, role, toolName: pending.tool });
      if (!pendingPermission.allowed) {
        this.pendingMutations.delete(mutationKey);
        await this.logAgentMutation({
          user_id,
          company_id,
          tool: pending.tool,
          args: pending.args,
          result: null,
          error: `Permission denied: ${pendingPermission.requiredPermission || 'unknown'}`,
          status: 'denied'
        });
        return {
          success: true,
          answer: 'Bu işlem için yetkiniz yok.',
          steps,
          meta: {
            permission_denied: true,
            required_permission: pendingPermission.requiredPermission
          }
        };
      }

      const confirmValidation = agentTools.validateToolArgs(pending.tool, pending.args || {});
      if (!confirmValidation.valid) {
        this.pendingMutations.delete(mutationKey);
        await this.logAgentMutation({
          user_id,
          company_id,
          tool: pending.tool,
          args: pending.args,
          result: null,
          error: `Validation failed: ${confirmValidation.error}`,
          status: 'failed'
        });
        return {
          success: true,
          answer: `İşlem doğrulama hatası: ${confirmValidation.error}`,
          steps,
          meta: { mutation_validation_failed: true, mutation_tool: pending.tool }
        };
      }

      steps.push({ type: 'tool_call', tool: pending.tool, args: pending.args });
      try {
        const result = await agentTools.execute(pending.tool, confirmValidation.sanitizedArgs, context);
        const normalizedResult = this.normalizeToolResult(pending.tool, result);
        steps.push({ type: 'tool_result', tool: pending.tool, result: normalizedResult });
        await this.logAgentMutation({
          user_id,
          company_id,
          tool: pending.tool,
          args: pending.args,
          result,
          error: null,
          status: 'success'
        });
        this.pendingMutations.delete(mutationKey);
        return {
          success: true,
          answer: `İşlem başarıyla tamamlandı. ${normalizedResult.summary}`,
          steps,
          meta: {
            mutation_executed: true,
            mutation_tool: pending.tool,
            requires_confirmation: false
          }
        };
      } catch (err) {
        this.pendingMutations.delete(mutationKey);
        steps.push({ type: 'tool_error', tool: pending.tool, error: err.message });
        await this.logAgentMutation({
          user_id,
          company_id,
          tool: pending.tool,
          args: pending.args,
          result: null,
          error: err.message,
          status: 'failed'
        });
        return { success: true, answer: `İşlem başarısız: ${err.message}`, steps, meta: { mutation_failed: true, mutation_tool: pending.tool } };
      }
    }

    // 1) Yazma/silme niyeti varsa önce onay iste
    if (this.detectMutationIntent(userMessage)) {
      const action = this.detectMutationAction(userMessage);
      if (!action) {
        return {
          success: true,
          answer: 'Yazma işlemi için formatı netleştirin. Örnek: müşteri oluştur full_name:"Ali Veli", company_name:"ABC", tax_office:"Kadıköy", tax_number:"1234567890"',
          steps,
          meta: { mutation_parse_failed: true }
        };
      }

      const validation = agentTools.validateToolArgs(action.tool, action.args || {});
      if (!validation.valid) {
        return {
          success: true,
          answer: `Yazma işlemi doğrulama hatası: ${validation.error}`,
          steps,
          meta: { mutation_validation_failed: true, mutation_tool: action.tool }
        };
      }

      action.args = validation.sanitizedArgs;

      const actionPermission = await this.hasMutationPermission({ user_id, role, toolName: action.tool });
      if (!actionPermission.allowed) {
        await this.logAgentMutation({
          user_id,
          company_id,
          tool: action.tool,
          args: action.args,
          result: null,
          error: `Permission denied: ${actionPermission.requiredPermission || 'unknown'}`,
          status: 'denied'
        });
        return {
          success: true,
          answer: 'Bu işlemi yapmak için yetkiniz yok.',
          steps,
          meta: {
            permission_denied: true,
            mutation_tool: action.tool,
            required_permission: actionPermission.requiredPermission
          }
        };
      }

      this.pendingMutations.set(mutationKey, {
        ...action,
        created_at: Date.now()
      });

      return {
        success: true,
        answer: `⚠️ Onay gerekiyor: ${action.preview}\n\nDevam etmek için "onaylıyorum", vazgeçmek için "vazgeç" yazın.`,
        steps,
        meta: {
          requires_confirmation: true,
          confirmation_preview: action.preview,
          mutation_tool: action.tool,
          confirmation_expires_in_seconds: 300
        }
      };
    }

    // 1. Hangi araçlar gerekli? (keyword eşleşmesi, LLM gerekmez)
    const toolsToRun = this.detectTools(userMessage);
    console.log(`[AI Agent] Detected tools: ${toolsToRun.map(t => t.name).join(', ')}`);

    // 2. Araçları paralel çalıştır, gerçek veriyi topla
    const toolContexts = [];
    for (const tool of toolsToRun) {
      steps.push({ type: 'tool_call', tool: tool.name, args: tool.args });
      try {
        const result = await agentTools.execute(tool.name, tool.args, context);
        const normalizedResult = this.normalizeToolResult(tool.name, result);
        steps.push({ type: 'tool_result', tool: tool.name, result: normalizedResult });
        toolContexts.push(normalizedResult);
      } catch (err) {
        console.error(`Tool "${tool.name}" error:`, err.message);
        steps.push({ type: 'tool_error', tool: tool.name, error: err.message });
      }
    }

    // 3. Gerçek veriyi modele ver, sadece yorumlamasını iste
    const systemPrompt = `Sen Türkçe konuşan bir ERP asistanısın. Sana gerçek ERP verisi verilecek.
GÖREV: Bu veriyi kullanarak kullanıcının sorusunu net, kısa ve Türkçe yanıtla.
KURALLAR:
- Sadece verilen veriyi kullan, asla uydurma
- Para birimini ₺ ile göster
- Tarih formatı: GG.AA.YYYY
- Veri yoksa "Kayıt bulunamadı" yaz
- JSON yazdırma, düz Türkçe metin yaz
  - Tool çıktısında olmayan bilgi ekleme
  - Çelişkili ifade üretme
  - Gerekirse başlık ve madde işareti kullan`;

    const userPrompt = `Kullanıcı sorusu: "${userMessage}"

Gerçek ERP Verisi:
  ${JSON.stringify(toolContexts, null, 2)}

Bu veriye dayanarak soruyu Türkçe yanıtla:`;

    let answer;
    try {
      answer = await this.sendToOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
    } catch (err) {
      console.error('Ollama error:', err.message);
      throw new Error('Ollama servisine ulaşılamıyor: ' + err.message);
    }

    return { success: true, answer, steps, meta: { requires_confirmation: false } };
  }

  /**
   * Generate text completion using Ollama
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || this.maxTokens
        }
      });

      return {
        success: true,
        response: response.data.response,
        model: this.model,
        context: response.data.context
      };
    } catch (error) {
      console.error('Ollama completion error:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'Sorry, I am unable to process your request at the moment.'
      };
    }
  }

  /**
   * Generate chat response
   */
  async chat(messages, options = {}) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9
        }
      });

      return {
        success: true,
        message: response.data.message,
        model: this.model
      };
    } catch (error) {
      console.error('Ollama chat error:', error.message);
      return {
        success: false,
        error: error.message,
        message: { role: 'assistant', content: 'Sorry, I am unable to respond at the moment.' }
      };
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(text) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.model,
        prompt: text
      });

      return {
        success: true,
        embeddings: response.data.embedding
      };
    } catch (error) {
      console.error('Ollama embeddings error:', error.message);
      return {
        success: false,
        error: error.message,
        embeddings: null
      };
    }
  }

  // ── Sağlık Kontrolü ──────────────────────────────────────────────────────
  async checkHealth() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      const modelNames = models.map(m => m.name);
      return {
        available: true,
        models: modelNames,
        currentModel: this.model,
        modelAvailable: modelNames.some(m => m.startsWith(this.model.split(':')[0]))
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Generate ERP-specific response with context
   */
  async generateERPResponse(userQuery, context = '') {
    const systemPrompt = `You are an AI assistant for an ERP (Enterprise Resource Planning) system.
You help users with:
- Product management and inventory queries
- Order processing and status
- Sales reports and analytics
- General business operations

Provide clear, concise, and helpful responses. If you need more information, ask the user.

Context: ${context}

User Query: ${userQuery}

Response:`;

    return await this.generateCompletion(systemPrompt);
  }

  /**
   * Analyze product data
   */
  async analyzeProducts(products) {
    const prompt = `Analyze the following product data and provide insights:

Products: ${JSON.stringify(products, null, 2)}

Provide:
1. Low stock alerts
2. Popular categories
3. Pricing recommendations
4. Inventory insights

Analysis:`;

    return await this.generateCompletion(prompt);
  }

  /**
   * Generate order summary
   */
  async summarizeOrders(orders) {
    const prompt = `Summarize the following orders:

Orders: ${JSON.stringify(orders, null, 2)}

Provide:
1. Total revenue
2. Top selling products
3. Order trends
4. Customer insights

Summary:`;

    return await this.generateCompletion(prompt);
  }

  /**
   * Generate business insights
   */
  async generateInsights(data) {
    const prompt = `Analyze the following business data and provide actionable insights:

Data: ${JSON.stringify(data, null, 2)}

Provide:
1. Key performance indicators
2. Trends and patterns
3. Recommendations
4. Potential issues

Insights:`;

    return await this.generateCompletion(prompt);
  }
}

module.exports = new AIService();
