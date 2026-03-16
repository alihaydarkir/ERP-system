/**
 * ERP Agent Tools
 * Yapay zekanın ERP verilerine erişmek için kullanacağı araçlar
 */
const pool = require('../config/database');

const agentTools = {
  // ── Araç tanımları (AI modeline gönderilir) ──────────────────────────────
  definitions: [
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
  ],

  // ── Araç implementasyonları ───────────────────────────────────────────────

  async get_dashboard_summary({ company_id }) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE company_id = $1) AS total_orders,
        (SELECT COUNT(*) FROM customers WHERE company_id = $1) AS total_customers,
        (SELECT COUNT(*) FROM products WHERE company_id = $1) AS total_products,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE company_id = $1 AND status = 'completed') AS total_revenue,
        (SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND company_id = $1) AS low_stock_count,
        (SELECT COUNT(*) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders
    `, [company_id]);
    return result.rows[0];
  },

  async search_cheques({ status, limit = 10, company_id }) {
    const values = [company_id];
    let statusClause = '';

    if (status) {
      values.push(status);
      statusClause = `AND ch.status = $${values.length}`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT
        ch.id,
        ch.check_serial_no,
        ch.amount,
        ch.currency,
        ch.due_date,
        ch.status,
        ch.bank_name,
        ch.received_date,
        c.full_name   AS customer_name,
        c.company_name AS customer_company,
        (ch.due_date - CURRENT_DATE) AS days_until_due
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.company_id = $1 ${statusClause}
      ORDER BY ch.due_date ASC
      LIMIT $${values.length}
    `, values);
    return result.rows;
  },

  async get_overdue_cheques({ company_id }) {
    const result = await pool.query(`
      SELECT
        ch.id,
        ch.check_serial_no,
        ch.amount,
        ch.currency,
        ch.due_date,
        ch.bank_name,
        c.full_name   AS customer_name,
        c.company_name AS customer_company,
        (CURRENT_DATE - ch.due_date) AS days_overdue
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.company_id = $1 AND ch.status = 'overdue'
      ORDER BY ch.due_date ASC
      LIMIT 20
    `, [company_id]);

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    return { cheques: result.rows, total_overdue_amount: total, count: result.rows.length };
  },

  async get_financial_summary({ company_id }) {
    const result = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'pending' AND company_id = $1) AS pending_cheques_amount,
        (SELECT COUNT(*)               FROM cheques WHERE status = 'pending' AND company_id = $1) AS pending_cheques_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*)               FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed' AND company_id = $1 AND created_at >= DATE_TRUNC('month', NOW())) AS this_month_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed' AND company_id = $1 AND created_at >= DATE_TRUNC('year', NOW())) AS this_year_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders_amount,
        (SELECT COUNT(*)                       FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders_count
    `, [company_id]);
    return result.rows[0];
  },

  async get_low_stock_products({ company_id }) {
    const result = await pool.query(`
      SELECT id, name, stock_quantity, low_stock_threshold, category, price
      FROM products
      WHERE stock_quantity <= low_stock_threshold AND company_id = $1
      ORDER BY stock_quantity ASC
      LIMIT 20
    `, [company_id]);
    return { products: result.rows, count: result.rows.length };
  },

  async search_products({ search, limit = 20, company_id }) {
    const values = [company_id];
    let searchClause = '';

    if (search) {
      values.push(`%${search}%`);
      searchClause = `AND (p.name ILIKE $${values.length} OR p.category ILIKE $${values.length})`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT id, name, category, price, stock_quantity, low_stock_threshold, sku
      FROM products p
      WHERE company_id = $1 ${searchClause}
      ORDER BY name ASC
      LIMIT $${values.length}
    `, values);
    return { products: result.rows, count: result.rows.length };
  },

  async search_customers({ search, limit = 10, company_id }) {
    const values = [company_id];
    let searchClause = '';

    if (search) {
      values.push(`%${search}%`);
      searchClause = `AND (c.full_name ILIKE $${values.length} OR c.company_name ILIKE $${values.length})`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT id, full_name, company_name, phone_number, company_location
      FROM customers c
      WHERE company_id = $1 ${searchClause}
      ORDER BY full_name ASC
      LIMIT $${values.length}
    `, values);
    return { customers: result.rows, count: result.rows.length };
  },

  async get_orders_summary({ period = 'month', company_id }) {
    const intervalMap = { today: "INTERVAL '1 day'", week: "INTERVAL '7 days'", month: "INTERVAL '30 days'" };
    const interval = intervalMap[period] || intervalMap.month;

    const result = await pool.query(`
      SELECT
        COUNT(*)                                                   AS total_orders,
        COALESCE(SUM(total_amount), 0)                             AS total_amount,
        COUNT(CASE WHEN status = 'pending'   THEN 1 END)           AS pending_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)           AS completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)           AS cancelled_orders,
        COALESCE(AVG(total_amount), 0)                             AS avg_order_amount
      FROM orders
      WHERE company_id = $1
        AND created_at >= NOW() - ${interval}
    `, [company_id]);
    return { ...result.rows[0], period };
  },

  async set_product_stock({ product_identifier, stock_quantity, company_id }) {
    const qty = Number(stock_quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error('Geçersiz stok miktarı');
    }

    const result = await pool.query(`
      UPDATE products
      SET stock_quantity = $1,
          updated_at = NOW()
      WHERE company_id = $2
        AND (sku = $3 OR name ILIKE $4)
      RETURNING id, name, sku, stock_quantity, low_stock_threshold, is_active
    `, [qty, company_id, product_identifier, `%${product_identifier}%`]);

    if (!result.rows.length) {
      throw new Error('Ürün bulunamadı');
    }

    return {
      updated: true,
      count: result.rows.length,
      products: result.rows
    };
  },

  async deactivate_product({ product_identifier, company_id }) {
    const result = await pool.query(`
      UPDATE products
      SET is_active = false,
          updated_at = NOW()
      WHERE company_id = $1
        AND (sku = $2 OR name ILIKE $3)
      RETURNING id, name, sku, is_active
    `, [company_id, product_identifier, `%${product_identifier}%`]);

    if (!result.rows.length) {
      throw new Error('Ürün bulunamadı');
    }

    return {
      updated: true,
      count: result.rows.length,
      products: result.rows
    };
  },

  async cancel_order({ order_identifier, company_id }) {
    const result = await pool.query(`
      UPDATE orders
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE company_id = $1
        AND (order_number = $2 OR id::text = $2)
      RETURNING id, order_number, status, total_amount
    `, [company_id, order_identifier]);

    if (!result.rows.length) {
      throw new Error('Sipariş bulunamadı');
    }

    return {
      updated: true,
      order: result.rows[0]
    };
  },

  async set_cheque_status({ cheque_identifier, status, company_id }) {
    const result = await pool.query(`
      UPDATE cheques
      SET status = $1,
          updated_at = NOW()
      WHERE company_id = $2
        AND (check_serial_no = $3 OR id::text = $3)
      RETURNING id, check_serial_no, status, amount, due_date
    `, [status, company_id, cheque_identifier]);

    if (!result.rows.length) {
      throw new Error('Çek bulunamadı');
    }

    return {
      updated: true,
      cheque: result.rows[0]
    };
  },

  async create_customer({ full_name, company_name, tax_office, tax_number, phone_number = null, company_location = null, company_id, user_id }) {
    if (!full_name || !company_name || !tax_office || !tax_number) {
      throw new Error('Müşteri için zorunlu alanlar eksik');
    }

    const result = await pool.query(`
      INSERT INTO customers (
        user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, full_name, company_name, tax_number, phone_number, company_location
    `, [user_id || null, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id]);

    return {
      created: true,
      customer: result.rows[0]
    };
  },

  async update_customer({ customer_identifier, company_id, ...updates }) {
    const customerResult = await pool.query(`
      SELECT id
      FROM customers
      WHERE company_id = $1
        AND (
          id::text = $2
          OR tax_number = $2
          OR company_name ILIKE $3
          OR full_name ILIKE $3
        )
      LIMIT 1
    `, [company_id, customer_identifier, `%${customer_identifier}%`]);

    if (!customerResult.rows.length) {
      throw new Error('Müşteri bulunamadı');
    }

    const customerId = customerResult.rows[0].id;
    const allowedFields = ['full_name', 'company_name', 'tax_office', 'tax_number', 'phone_number', 'company_location'];
    const fields = [];
    const values = [];
    let p = 1;

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error('Güncellenecek alan bulunamadı');
    }

    values.push(customerId, company_id);
    const result = await pool.query(`
      UPDATE customers
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${p++} AND company_id = $${p}
      RETURNING id, full_name, company_name, tax_number, phone_number, company_location
    `, values);

    return {
      updated: true,
      customer: result.rows[0]
    };
  },

  async create_product({ name, sku, price, stock_quantity = 0, category = null, description = null, low_stock_threshold = 10, company_id }) {
    if (!name || !sku || price === undefined || price === null) {
      throw new Error('Ürün için zorunlu alanlar eksik');
    }

    const result = await pool.query(`
      INSERT INTO products (
        name, sku, price, stock_quantity, category, description, low_stock_threshold, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, sku, price, stock_quantity, category, is_active
    `, [name, sku, Number(price), Number(stock_quantity || 0), category, description, Number(low_stock_threshold || 10), company_id]);

    return {
      created: true,
      product: result.rows[0]
    };
  },

  async update_product({ product_identifier, company_id, ...updates }) {
    const productResult = await pool.query(`
      SELECT id
      FROM products
      WHERE company_id = $1
        AND (
          id::text = $2
          OR sku = $2
          OR name ILIKE $3
        )
      LIMIT 1
    `, [company_id, product_identifier, `%${product_identifier}%`]);

    if (!productResult.rows.length) {
      throw new Error('Ürün bulunamadı');
    }

    const productId = productResult.rows[0].id;
    const allowedFields = ['name', 'price', 'stock_quantity', 'category', 'description', 'low_stock_threshold', 'is_active'];
    const fields = [];
    const values = [];
    let p = 1;

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error('Güncellenecek alan bulunamadı');
    }

    values.push(productId, company_id);
    const result = await pool.query(`
      UPDATE products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${p++} AND company_id = $${p}
      RETURNING id, name, sku, price, stock_quantity, category, is_active
    `, values);

    return {
      updated: true,
      product: result.rows[0]
    };
  },

  async create_supplier({ supplier_name, contact_person = null, email = null, phone = null, address = null, tax_office = null, tax_number = null, iban = null, payment_terms = 'Net 30', currency = 'TRY', notes = null, rating = null, company_id, user_id }) {
    if (!supplier_name) {
      throw new Error('Tedarikçi adı zorunludur');
    }

    const result = await pool.query(`
      INSERT INTO suppliers (
        supplier_name, contact_person, email, phone, address, tax_office, tax_number,
        iban, payment_terms, currency, notes, rating, created_by, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, supplier_name, contact_person, phone, tax_number, is_active
    `, [supplier_name, contact_person, email, phone, address, tax_office, tax_number, iban, payment_terms, currency, notes, rating, user_id || null, company_id]);

    return {
      created: true,
      supplier: result.rows[0]
    };
  },

  async update_supplier({ supplier_identifier, company_id, ...updates }) {
    const supplierResult = await pool.query(`
      SELECT id
      FROM suppliers
      WHERE company_id = $1
        AND (
          id::text = $2
          OR tax_number = $2
          OR supplier_name ILIKE $3
        )
      LIMIT 1
    `, [company_id, supplier_identifier, `%${supplier_identifier}%`]);

    if (!supplierResult.rows.length) {
      throw new Error('Tedarikçi bulunamadı');
    }

    const supplierId = supplierResult.rows[0].id;
    const allowedFields = ['supplier_name', 'contact_person', 'email', 'phone', 'address', 'tax_office', 'tax_number', 'iban', 'payment_terms', 'currency', 'notes', 'rating', 'is_active'];
    const fields = [];
    const values = [];
    let p = 1;

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error('Güncellenecek alan bulunamadı');
    }

    values.push(supplierId, company_id);
    const result = await pool.query(`
      UPDATE suppliers
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${p++} AND company_id = $${p}
      RETURNING id, supplier_name, contact_person, phone, tax_number, is_active
    `, values);

    return {
      updated: true,
      supplier: result.rows[0]
    };
  },

  async create_warehouse({ warehouse_name, warehouse_code, location = null, address = null, city = null, country = 'Türkiye', manager_name = null, phone = null, email = null, capacity = null, notes = null, company_id }) {
    if (!warehouse_name || !warehouse_code) {
      throw new Error('Depo adı ve kodu zorunludur');
    }

    const result = await pool.query(`
      INSERT INTO warehouses (
        warehouse_name, warehouse_code, location, address, city, country,
        manager_name, phone, email, capacity, notes, is_active, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
      RETURNING id, warehouse_name, warehouse_code, location, city, is_active
    `, [warehouse_name, warehouse_code, location, address, city, country, manager_name, phone, email, capacity, notes, company_id]);

    return {
      created: true,
      warehouse: result.rows[0]
    };
  },

  async update_warehouse({ warehouse_identifier, company_id, ...updates }) {
    const warehouseResult = await pool.query(`
      SELECT id
      FROM warehouses
      WHERE company_id = $1
        AND (
          id::text = $2
          OR warehouse_code = $2
          OR warehouse_name ILIKE $3
        )
      LIMIT 1
    `, [company_id, warehouse_identifier, `%${warehouse_identifier}%`]);

    if (!warehouseResult.rows.length) {
      throw new Error('Depo bulunamadı');
    }

    const warehouseId = warehouseResult.rows[0].id;
    const allowedFields = ['warehouse_name', 'warehouse_code', 'location', 'address', 'city', 'country', 'manager_name', 'phone', 'email', 'capacity', 'notes', 'is_active'];
    const fields = [];
    const values = [];
    let p = 1;

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error('Güncellenecek alan bulunamadı');
    }

    values.push(warehouseId, company_id);
    const result = await pool.query(`
      UPDATE warehouses
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${p++} AND company_id = $${p}
      RETURNING id, warehouse_name, warehouse_code, location, city, is_active
    `, values);

    return {
      updated: true,
      warehouse: result.rows[0]
    };
  },

  async create_cheque({ check_serial_no, check_issuer, customer_identifier, bank_name, due_date, amount, received_date = null, currency = 'TRY', status = 'pending', notes = null, company_id, user_id }) {
    if (!check_serial_no || !check_issuer || !customer_identifier || !bank_name || !due_date || !amount) {
      throw new Error('Çek için zorunlu alanlar eksik');
    }

    const customerResult = await pool.query(`
      SELECT id
      FROM customers
      WHERE company_id = $1
        AND (
          id::text = $2
          OR tax_number = $2
          OR company_name ILIKE $3
          OR full_name ILIKE $3
        )
      LIMIT 1
    `, [company_id, customer_identifier, `%${customer_identifier}%`]);

    if (!customerResult.rows.length) {
      throw new Error('Çek için müşteri bulunamadı');
    }

    const customerId = customerResult.rows[0].id;
    const result = await pool.query(`
      INSERT INTO cheques (
        user_id, company_id, check_serial_no, check_issuer, customer_id, bank_name,
        received_date, due_date, amount, currency, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), $8, $9, $10, $11, $12)
      RETURNING id, check_serial_no, check_issuer, customer_id, amount, due_date, status
    `, [user_id || null, company_id, check_serial_no, check_issuer, customerId, bank_name, received_date, due_date, amount, currency, status, notes]);

    return {
      created: true,
      cheque: result.rows[0]
    };
  },

  async set_order_status({ order_identifier, status, company_id }) {
    const result = await pool.query(`
      UPDATE orders
      SET status = $1,
          updated_at = NOW(),
          completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
      WHERE company_id = $2
        AND (order_number = $3 OR id::text = $3)
      RETURNING id, order_number, status, total_amount
    `, [status, company_id, order_identifier]);

    if (!result.rows.length) {
      throw new Error('Sipariş bulunamadı');
    }

    return {
      updated: true,
      order: result.rows[0]
    };
  },

  async set_invoice_status({ invoice_identifier, status, company_id }) {
    const result = await pool.query(`
      UPDATE invoices
      SET status = $1,
          paid_date = CASE WHEN $1 = 'paid' THEN CURRENT_DATE ELSE paid_date END,
          updated_at = NOW()
      WHERE company_id = $2
        AND (invoice_number = $3 OR id::text = $3)
      RETURNING id, invoice_number, status, total_amount, due_date
    `, [status, company_id, invoice_identifier]);

    if (!result.rows.length) {
      throw new Error('Fatura bulunamadı');
    }

    return {
      updated: true,
      invoice: result.rows[0]
    };
  },

  // ── Araç çalıştırıcı ─────────────────────────────────────────────────────
  async execute(toolName, args, contextOrCompanyId) {
    const context = typeof contextOrCompanyId === 'object'
      ? contextOrCompanyId
      : { company_id: contextOrCompanyId };
    const fn = this[toolName];
    if (!fn || typeof fn !== 'function') {
      throw new Error(`Bilinmeyen araç: ${toolName}`);
    }
    return await fn.call(this, {
      ...args,
      company_id: context.company_id,
      user_id: context.user_id,
      role: context.role
    });
  }
};

module.exports = agentTools;
