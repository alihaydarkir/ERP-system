const MUTATION_TOOLS = new Set([
  'set_product_stock',
  'deactivate_product',
  'cancel_order',
  'set_cheque_status',
  'create_customer',
  'update_customer',
  'create_product',
  'update_product',
  'create_supplier',
  'update_supplier',
  'create_warehouse',
  'update_warehouse',
  'create_cheque',
  'set_order_status',
  'set_invoice_status'
]);

const DEFAULT_MUTATION_PERMISSION_MAP = {
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

const ORDER_STATUS = new Set(['pending', 'processing', 'completed', 'cancelled']);
const CHEQUE_STATUS = new Set(['pending', 'paid', 'cancelled']);
const INVOICE_STATUS = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value, { max = 255, min = 1, field = 'alan' } = {}) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (s.length === 0) throw new Error(`${field} boş olamaz`);
  if (s.length < min) throw new Error(`${field} çok kısa`);
  if (s.length > max) throw new Error(`${field} en fazla ${max} karakter olabilir`);
  return s;
}

function cleanOptionalString(value, options = {}) {
  if (value === undefined || value === null) return undefined;
  return cleanString(value, options);
}

function cleanInteger(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, field = 'alan' } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${field} tam sayı olmalı`);
  if (n < min || n > max) throw new Error(`${field} ${min}-${max} aralığında olmalı`);
  return n;
}

function cleanNumber(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, field = 'alan' } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${field} geçerli bir sayı olmalı`);
  if (n < min || n > max) throw new Error(`${field} ${min}-${max} aralığında olmalı`);
  return n;
}

function cleanBoolean(value, field = 'alan') {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (['true', '1', 'evet', 'aktif', 'yes'].includes(s)) return true;
  if (['false', '0', 'hayır', 'pasif', 'no'].includes(s)) return false;
  throw new Error(`${field} boolean olmalı`);
}

function cleanDate(value, field = 'tarih') {
  const s = cleanString(value, { max: 10, field });
  if (!DATE_REGEX.test(s)) throw new Error(`${field} YYYY-MM-DD formatında olmalı`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${field} geçerli bir tarih olmalı`);
  return s;
}

function cleanEnum(value, allowedSet, field = 'alan') {
  const s = cleanString(value, { max: 50, field }).toLowerCase();
  if (!allowedSet.has(s)) throw new Error(`${field} geçersiz değer`);
  return s;
}

function cleanEmail(value, field = 'email') {
  const s = cleanOptionalString(value, { max: 200, field });
  if (s === undefined) return undefined;
  if (!EMAIL_REGEX.test(s)) throw new Error(`${field} geçerli bir email olmalı`);
  return s;
}

function isMutationTool(toolName) {
  return MUTATION_TOOLS.has(String(toolName || ''));
}

function sanitizeToolArgs(toolName, args = {}) {
  const input = args || {};

  switch (toolName) {
    case 'search_cheques':
      return {
        status: input.status ? cleanEnum(input.status, new Set(['pending', 'paid', 'overdue', 'cancelled']), 'status') : undefined,
        limit: cleanInteger(input.limit ?? 10, { min: 1, max: 50, field: 'limit' })
      };
    case 'search_products':
      return {
        search: cleanOptionalString(input.search, { max: 120, field: 'search' }),
        limit: cleanInteger(input.limit ?? 20, { min: 1, max: 50, field: 'limit' })
      };
    case 'search_customers':
      return {
        search: cleanOptionalString(input.search, { max: 120, field: 'search' }),
        limit: cleanInteger(input.limit ?? 10, { min: 1, max: 50, field: 'limit' })
      };
    case 'get_orders_summary':
      return {
        period: input.period ? cleanEnum(input.period, new Set(['today', 'week', 'month']), 'period') : 'month'
      };
    case 'set_product_stock':
      return {
        product_identifier: cleanString(input.product_identifier, { max: 120, field: 'product_identifier' }),
        stock_quantity: cleanInteger(input.stock_quantity, { min: 0, max: 1000000, field: 'stock_quantity' })
      };
    case 'deactivate_product':
      return {
        product_identifier: cleanString(input.product_identifier, { max: 120, field: 'product_identifier' })
      };
    case 'cancel_order':
      return {
        order_identifier: cleanString(input.order_identifier, { max: 60, field: 'order_identifier' })
      };
    case 'set_cheque_status':
      return {
        cheque_identifier: cleanString(input.cheque_identifier, { max: 80, field: 'cheque_identifier' }),
        status: cleanEnum(input.status, CHEQUE_STATUS, 'status')
      };
    case 'create_customer':
      return {
        full_name: cleanString(input.full_name, { max: 120, field: 'full_name' }),
        company_name: cleanString(input.company_name, { max: 160, field: 'company_name' }),
        tax_office: cleanString(input.tax_office, { max: 120, field: 'tax_office' }),
        tax_number: cleanString(input.tax_number, { max: 30, field: 'tax_number' }),
        phone_number: cleanOptionalString(input.phone_number, { max: 30, field: 'phone_number' }),
        company_location: cleanOptionalString(input.company_location, { max: 255, field: 'company_location' })
      };
    case 'update_customer':
      return {
        customer_identifier: cleanString(input.customer_identifier, { max: 120, field: 'customer_identifier' }),
        full_name: cleanOptionalString(input.full_name, { max: 120, field: 'full_name' }),
        company_name: cleanOptionalString(input.company_name, { max: 160, field: 'company_name' }),
        tax_office: cleanOptionalString(input.tax_office, { max: 120, field: 'tax_office' }),
        tax_number: cleanOptionalString(input.tax_number, { max: 30, field: 'tax_number' }),
        phone_number: cleanOptionalString(input.phone_number, { max: 30, field: 'phone_number' }),
        company_location: cleanOptionalString(input.company_location, { max: 255, field: 'company_location' })
      };
    case 'create_product':
      return {
        name: cleanString(input.name, { max: 150, field: 'name' }),
        sku: cleanString(input.sku, { max: 80, field: 'sku' }),
        price: cleanNumber(input.price, { min: 0, max: 1000000000, field: 'price' }),
        stock_quantity: cleanInteger(input.stock_quantity ?? 0, { min: 0, max: 1000000, field: 'stock_quantity' }),
        category: cleanOptionalString(input.category, { max: 80, field: 'category' }),
        description: cleanOptionalString(input.description, { max: 1000, field: 'description' }),
        low_stock_threshold: cleanInteger(input.low_stock_threshold ?? 10, { min: 0, max: 100000, field: 'low_stock_threshold' })
      };
    case 'update_product':
      return {
        product_identifier: cleanString(input.product_identifier, { max: 120, field: 'product_identifier' }),
        name: cleanOptionalString(input.name, { max: 150, field: 'name' }),
        price: cleanNumber(input.price, { min: 0, max: 1000000000, field: 'price' }),
        stock_quantity: cleanInteger(input.stock_quantity, { min: 0, max: 1000000, field: 'stock_quantity' }),
        category: cleanOptionalString(input.category, { max: 80, field: 'category' }),
        description: cleanOptionalString(input.description, { max: 1000, field: 'description' }),
        low_stock_threshold: cleanInteger(input.low_stock_threshold, { min: 0, max: 100000, field: 'low_stock_threshold' }),
        is_active: cleanBoolean(input.is_active, 'is_active')
      };
    case 'create_supplier':
      return {
        supplier_name: cleanString(input.supplier_name, { max: 160, field: 'supplier_name' }),
        contact_person: cleanOptionalString(input.contact_person, { max: 120, field: 'contact_person' }),
        email: cleanEmail(input.email),
        phone: cleanOptionalString(input.phone, { max: 30, field: 'phone' }),
        address: cleanOptionalString(input.address, { max: 255, field: 'address' }),
        tax_office: cleanOptionalString(input.tax_office, { max: 120, field: 'tax_office' }),
        tax_number: cleanOptionalString(input.tax_number, { max: 30, field: 'tax_number' }),
        iban: cleanOptionalString(input.iban, { max: 40, field: 'iban' }),
        payment_terms: cleanOptionalString(input.payment_terms, { max: 60, field: 'payment_terms' }),
        currency: cleanOptionalString(input.currency, { max: 10, field: 'currency' }),
        notes: cleanOptionalString(input.notes, { max: 1000, field: 'notes' }),
        rating: cleanInteger(input.rating, { min: 1, max: 5, field: 'rating' })
      };
    case 'update_supplier':
      return {
        supplier_identifier: cleanString(input.supplier_identifier, { max: 120, field: 'supplier_identifier' }),
        supplier_name: cleanOptionalString(input.supplier_name, { max: 160, field: 'supplier_name' }),
        contact_person: cleanOptionalString(input.contact_person, { max: 120, field: 'contact_person' }),
        email: cleanEmail(input.email),
        phone: cleanOptionalString(input.phone, { max: 30, field: 'phone' }),
        address: cleanOptionalString(input.address, { max: 255, field: 'address' }),
        tax_office: cleanOptionalString(input.tax_office, { max: 120, field: 'tax_office' }),
        tax_number: cleanOptionalString(input.tax_number, { max: 30, field: 'tax_number' }),
        iban: cleanOptionalString(input.iban, { max: 40, field: 'iban' }),
        payment_terms: cleanOptionalString(input.payment_terms, { max: 60, field: 'payment_terms' }),
        currency: cleanOptionalString(input.currency, { max: 10, field: 'currency' }),
        notes: cleanOptionalString(input.notes, { max: 1000, field: 'notes' }),
        rating: cleanInteger(input.rating, { min: 1, max: 5, field: 'rating' }),
        is_active: cleanBoolean(input.is_active, 'is_active')
      };
    case 'create_warehouse':
      return {
        warehouse_name: cleanString(input.warehouse_name, { max: 160, field: 'warehouse_name' }),
        warehouse_code: cleanString(input.warehouse_code, { max: 60, field: 'warehouse_code' }),
        location: cleanOptionalString(input.location, { max: 120, field: 'location' }),
        address: cleanOptionalString(input.address, { max: 255, field: 'address' }),
        city: cleanOptionalString(input.city, { max: 80, field: 'city' }),
        country: cleanOptionalString(input.country, { max: 80, field: 'country' }),
        manager_name: cleanOptionalString(input.manager_name, { max: 120, field: 'manager_name' }),
        phone: cleanOptionalString(input.phone, { max: 30, field: 'phone' }),
        email: cleanEmail(input.email),
        capacity: cleanInteger(input.capacity, { min: 0, max: 100000000, field: 'capacity' }),
        notes: cleanOptionalString(input.notes, { max: 1000, field: 'notes' })
      };
    case 'update_warehouse':
      return {
        warehouse_identifier: cleanString(input.warehouse_identifier, { max: 120, field: 'warehouse_identifier' }),
        warehouse_name: cleanOptionalString(input.warehouse_name, { max: 160, field: 'warehouse_name' }),
        warehouse_code: cleanOptionalString(input.warehouse_code, { max: 60, field: 'warehouse_code' }),
        location: cleanOptionalString(input.location, { max: 120, field: 'location' }),
        address: cleanOptionalString(input.address, { max: 255, field: 'address' }),
        city: cleanOptionalString(input.city, { max: 80, field: 'city' }),
        country: cleanOptionalString(input.country, { max: 80, field: 'country' }),
        manager_name: cleanOptionalString(input.manager_name, { max: 120, field: 'manager_name' }),
        phone: cleanOptionalString(input.phone, { max: 30, field: 'phone' }),
        email: cleanEmail(input.email),
        capacity: cleanInteger(input.capacity, { min: 0, max: 100000000, field: 'capacity' }),
        notes: cleanOptionalString(input.notes, { max: 1000, field: 'notes' }),
        is_active: cleanBoolean(input.is_active, 'is_active')
      };
    case 'create_cheque':
      return {
        check_serial_no: cleanString(input.check_serial_no, { max: 80, field: 'check_serial_no' }),
        check_issuer: cleanString(input.check_issuer, { max: 160, field: 'check_issuer' }),
        customer_identifier: cleanString(input.customer_identifier, { max: 120, field: 'customer_identifier' }),
        bank_name: cleanString(input.bank_name, { max: 120, field: 'bank_name' }),
        due_date: cleanDate(input.due_date, 'due_date'),
        amount: cleanNumber(input.amount, { min: 0.01, max: 1000000000, field: 'amount' }),
        received_date: input.received_date ? cleanDate(input.received_date, 'received_date') : undefined,
        currency: cleanOptionalString(input.currency, { max: 10, field: 'currency' }),
        status: input.status ? cleanEnum(input.status, CHEQUE_STATUS, 'status') : 'pending',
        notes: cleanOptionalString(input.notes, { max: 1000, field: 'notes' })
      };
    case 'set_order_status':
      return {
        order_identifier: cleanString(input.order_identifier, { max: 60, field: 'order_identifier' }),
        status: cleanEnum(input.status, ORDER_STATUS, 'status')
      };
    case 'set_invoice_status':
      return {
        invoice_identifier: cleanString(input.invoice_identifier, { max: 80, field: 'invoice_identifier' }),
        status: cleanEnum(input.status, INVOICE_STATUS, 'status')
      };
    default:
      return { ...input };
  }
}

function validateToolArgs(toolName, args = {}) {
  try {
    const sanitizedArgs = sanitizeToolArgs(toolName, args);
    return { valid: true, sanitizedArgs };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

const definitions = [
  {
    name: 'get_dashboard_summary',
    description: 'ERP sisteminin genel özetini getirir: toplam sipariş, müşteri, ürün sayısı, gelir ve uyarılar.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_cheques',
    description: 'Çekleri ara ve filtrele. Vadesi geçmiş, bekleyen veya ödenmiş çekleri listele.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'overdue', 'cancelled'],
          description: 'Çek durumu filtresi'
        },
        limit: { type: 'integer', description: 'Maksimum sonuç sayısı (varsayılan: 10)' }
      }
    }
  },
  {
    name: 'get_financial_summary',
    description: 'Finansal özet: bekleyen çek tutarları, vadesi geçmiş çekler, bu ay gelir, bekleyen siparişler.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_low_stock_products',
    description: 'Stok seviyesi kritik eşiğin altına düşmüş ürünleri listele.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_products',
    description: 'Ürün ara veya tüm ürün listesini getir.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Ürün adı veya kategori ile arama' },
        limit: { type: 'integer', description: 'Maksimum sonuç sayısı' }
      }
    }
  },
  {
    name: 'search_customers',
    description: 'Müşteri ara. İsim veya şirket adına göre.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Arama terimi (isim veya şirket adı)' },
        limit: { type: 'integer', description: 'Maksimum sonuç sayısı' }
      }
    }
  },
  {
    name: 'get_orders_summary',
    description: 'Sipariş özeti ve istatistikleri getir.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'Zaman dilimi (today/week/month)'
        }
      }
    }
  },
  {
    name: 'get_overdue_cheques',
    description: 'Vadesi geçmiş tüm çekleri getir ve toplam tutarı hesapla.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'set_product_stock',
    description: 'Ürünün stok miktarını günceller (yazma işlemi).',
    parameters: {
      type: 'object',
      properties: {
        product_identifier: { type: 'string', description: 'Ürün adı veya SKU' },
        stock_quantity: { type: 'integer', description: 'Yeni stok adedi (0 veya üzeri)' }
      },
      required: ['product_identifier', 'stock_quantity']
    }
  },
  {
    name: 'deactivate_product',
    description: 'Ürünü pasif yapar (soft delete).',
    parameters: {
      type: 'object',
      properties: {
        product_identifier: { type: 'string', description: 'Ürün adı veya SKU' }
      },
      required: ['product_identifier']
    }
  },
  {
    name: 'cancel_order',
    description: 'Siparişi iptal eder (status=cancelled).',
    parameters: {
      type: 'object',
      properties: {
        order_identifier: { type: 'string', description: 'Sipariş numarası veya ID' }
      },
      required: ['order_identifier']
    }
  },
  {
    name: 'set_cheque_status',
    description: 'Çek durumunu günceller (pending/paid/cancelled).',
    parameters: {
      type: 'object',
      properties: {
        cheque_identifier: { type: 'string', description: 'Çek seri no veya ID' },
        status: { type: 'string', enum: ['pending', 'paid', 'cancelled'] }
      },
      required: ['cheque_identifier', 'status']
    }
  },
  {
    name: 'create_customer',
    description: 'Yeni müşteri oluşturur.',
    parameters: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        company_name: { type: 'string' },
        tax_office: { type: 'string' },
        tax_number: { type: 'string' },
        phone_number: { type: 'string' },
        company_location: { type: 'string' }
      },
      required: ['full_name', 'company_name', 'tax_office', 'tax_number']
    }
  },
  {
    name: 'update_customer',
    description: 'Müşteri bilgilerini günceller.',
    parameters: {
      type: 'object',
      properties: {
        customer_identifier: { type: 'string', description: 'Müşteri ID, vergi no veya şirket adı' },
        full_name: { type: 'string' },
        company_name: { type: 'string' },
        tax_office: { type: 'string' },
        tax_number: { type: 'string' },
        phone_number: { type: 'string' },
        company_location: { type: 'string' }
      },
      required: ['customer_identifier']
    }
  },
  {
    name: 'create_product',
    description: 'Yeni ürün oluşturur.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        sku: { type: 'string' },
        price: { type: 'number' },
        stock_quantity: { type: 'integer' },
        category: { type: 'string' },
        description: { type: 'string' },
        low_stock_threshold: { type: 'integer' }
      },
      required: ['name', 'sku', 'price']
    }
  },
  {
    name: 'update_product',
    description: 'Ürün bilgilerini günceller.',
    parameters: {
      type: 'object',
      properties: {
        product_identifier: { type: 'string', description: 'Ürün adı, SKU veya ID' },
        name: { type: 'string' },
        price: { type: 'number' },
        stock_quantity: { type: 'integer' },
        category: { type: 'string' },
        description: { type: 'string' },
        low_stock_threshold: { type: 'integer' },
        is_active: { type: 'boolean' }
      },
      required: ['product_identifier']
    }
  },
  {
    name: 'create_supplier',
    description: 'Yeni tedarikçi oluşturur.',
    parameters: {
      type: 'object',
      properties: {
        supplier_name: { type: 'string' },
        contact_person: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        tax_office: { type: 'string' },
        tax_number: { type: 'string' },
        iban: { type: 'string' },
        payment_terms: { type: 'string' },
        currency: { type: 'string' },
        notes: { type: 'string' },
        rating: { type: 'integer' }
      },
      required: ['supplier_name']
    }
  },
  {
    name: 'update_supplier',
    description: 'Tedarikçi bilgilerini günceller.',
    parameters: {
      type: 'object',
      properties: {
        supplier_identifier: { type: 'string', description: 'Tedarikçi ID, adı veya vergi no' },
        supplier_name: { type: 'string' },
        contact_person: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        tax_office: { type: 'string' },
        tax_number: { type: 'string' },
        iban: { type: 'string' },
        payment_terms: { type: 'string' },
        currency: { type: 'string' },
        notes: { type: 'string' },
        rating: { type: 'integer' },
        is_active: { type: 'boolean' }
      },
      required: ['supplier_identifier']
    }
  },
  {
    name: 'create_warehouse',
    description: 'Yeni depo oluşturur.',
    parameters: {
      type: 'object',
      properties: {
        warehouse_name: { type: 'string' },
        warehouse_code: { type: 'string' },
        location: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        manager_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        capacity: { type: 'integer' },
        notes: { type: 'string' }
      },
      required: ['warehouse_name', 'warehouse_code']
    }
  },
  {
    name: 'update_warehouse',
    description: 'Depo bilgilerini günceller.',
    parameters: {
      type: 'object',
      properties: {
        warehouse_identifier: { type: 'string', description: 'Depo ID, adı veya kodu' },
        warehouse_name: { type: 'string' },
        warehouse_code: { type: 'string' },
        location: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        manager_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        capacity: { type: 'integer' },
        notes: { type: 'string' },
        is_active: { type: 'boolean' }
      },
      required: ['warehouse_identifier']
    }
  },
  {
    name: 'create_cheque',
    description: 'Yeni çek kaydı oluşturur.',
    parameters: {
      type: 'object',
      properties: {
        check_serial_no: { type: 'string' },
        check_issuer: { type: 'string' },
        customer_identifier: { type: 'string', description: 'Müşteri ID, şirket adı veya vergi no' },
        bank_name: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        amount: { type: 'number' },
        received_date: { type: 'string', description: 'YYYY-MM-DD' },
        currency: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'paid', 'cancelled'] },
        notes: { type: 'string' }
      },
      required: ['check_serial_no', 'check_issuer', 'customer_identifier', 'bank_name', 'due_date', 'amount']
    }
  },
  {
    name: 'set_order_status',
    description: 'Sipariş durumunu günceller (pending/processing/completed/cancelled).',
    parameters: {
      type: 'object',
      properties: {
        order_identifier: { type: 'string', description: 'Sipariş numarası veya ID' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'cancelled'] }
      },
      required: ['order_identifier', 'status']
    }
  },
  {
    name: 'set_invoice_status',
    description: 'Fatura durumunu günceller (draft/sent/paid/overdue/cancelled).',
    parameters: {
      type: 'object',
      properties: {
        invoice_identifier: { type: 'string', description: 'Fatura numarası veya ID' },
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] }
      },
      required: ['invoice_identifier', 'status']
    }
  }
];

module.exports = {
  DEFAULT_MUTATION_PERMISSION_MAP,
  definitions,
  isMutationTool,
  sanitizeToolArgs,
  validateToolArgs
};
