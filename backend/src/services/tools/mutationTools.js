const pool = require('../../config/database');

const mutationTools = {
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
  }
};

module.exports = mutationTools;
