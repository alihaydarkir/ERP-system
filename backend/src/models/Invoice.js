const pool = require('../config/database');

class Invoice {
  /**
   * Generate unique invoice number: INV-2026-XXXXXX
   */
  static generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `INV-${year}-${random}`;
  }

  /**
   * Create a new invoice with items
   */
  static async create({
    user_id, customer_id, order_id = null, items,
    subtotal, tax_rate = 18, tax_amount, discount_amount = 0, total_amount,
    issue_date, due_date, notes, status = 'draft', company_id
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceNumber = this.generateInvoiceNumber();

      const invoiceResult = await client.query(`
        INSERT INTO invoices
          (invoice_number, order_id, customer_id, user_id, company_id,
           subtotal, tax_rate, tax_amount, discount_amount, total_amount,
           status, issue_date, due_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [
        invoiceNumber, order_id, customer_id, user_id, company_id,
        subtotal, tax_rate, tax_amount, discount_amount, total_amount,
        status,
        issue_date || new Date(),
        due_date,
        notes || null
      ]);

      const invoice = invoiceResult.rows[0];

      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items
            (invoice_id, product_id, company_id, description, quantity, unit_price, total_price)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
          invoice.id,
          item.product_id || null,
          company_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);
      }

      await client.query('COMMIT');
      return await this.findById(invoice.id, company_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find invoice by ID with items and customer info
   */
  static async findById(id, company_id = null) {
    const query = `
      SELECT
        i.*,
        c.full_name       AS customer_name,
        c.company_name    AS customer_company,
        c.tax_number      AS customer_tax_number,
        c.tax_office      AS customer_tax_office,
        c.phone_number    AS customer_phone,
        c.company_location AS customer_address,
        u.full_name       AS created_by_name,
        u.email           AS created_by_email,
        o.order_number    AS related_order_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users     u ON i.user_id = u.id
      LEFT JOIN orders    o ON i.order_id = o.id
      WHERE i.id = $1 ${company_id ? 'AND i.company_id = $2' : ''}
    `;
    const params = company_id ? [id, company_id] : [id];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) return null;

    const invoice = result.rows[0];
    invoice.items = await this.findItems(id);
    return invoice;
  }

  /**
   * Get invoice items
   */
  static async findItems(invoice_id) {
    const result = await pool.query(`
      SELECT ii.*, p.name AS product_name, p.sku AS product_sku
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [invoice_id]);
    return result.rows;
  }

  /**
   * Find all invoices with filters
   */
  static async findAll(filters = {}) {
    const { company_id, status, customer_id, search, limit = 20, offset = 0 } = filters;

    let query = `
      SELECT
        i.*,
        c.full_name    AS customer_name,
        c.company_name AS customer_company,
        o.order_number AS related_order_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN orders    o ON i.order_id = o.id
      WHERE 1=1
    `;

    const values = [];
    let p = 1;

    if (company_id) {
      query += ` AND i.company_id = $${p++}`;
      values.push(company_id);
    }
    if (status) {
      query += ` AND i.status = $${p++}`;
      values.push(status);
    }
    if (customer_id) {
      query += ` AND i.customer_id = $${p++}`;
      values.push(customer_id);
    }
    if (search) {
      query += ` AND (i.invoice_number ILIKE $${p} OR c.full_name ILIKE $${p} OR c.company_name ILIKE $${p})`;
      values.push(`%${search}%`);
      p++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${p} OFFSET $${p + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count invoices
   */
  static async count(filters = {}) {
    const { company_id, status, customer_id, search } = filters;

    let query = `
      SELECT COUNT(*) FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let p = 1;

    if (company_id) { query += ` AND i.company_id = $${p++}`; values.push(company_id); }
    if (status)     { query += ` AND i.status = $${p++}`;     values.push(status); }
    if (customer_id){ query += ` AND i.customer_id = $${p++}`;values.push(customer_id); }
    if (search) {
      query += ` AND (i.invoice_number ILIKE $${p} OR c.full_name ILIKE $${p} OR c.company_name ILIKE $${p})`;
      values.push(`%${search}%`);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Update invoice
   */
  static async update(id, company_id, data) {
    const fields = [];
    const values = [];
    let p = 1;

    const allowed = ['status', 'due_date', 'paid_date', 'notes', 'subtotal', 'tax_rate', 'tax_amount', 'discount_amount', 'total_amount'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id, company_id);

    values.push(id, company_id);
    const result = await pool.query(`
      UPDATE invoices SET ${fields.join(', ')}
      WHERE id = $${p} AND company_id = $${p + 1}
      RETURNING *
    `, values);

    if (result.rows.length === 0) return null;
    return await this.findById(id, company_id);
  }

  /**
   * Mark overdue invoices automatically
   */
  static async markOverdue(company_id) {
    const result = await pool.query(`
      UPDATE invoices
      SET status = 'overdue'
      WHERE status = 'sent'
        AND due_date < CURRENT_DATE
        AND company_id = $1
      RETURNING id
    `, [company_id]);
    return result.rowCount;
  }

  /**
   * Delete invoice
   */
  static async delete(id, company_id) {
    const result = await pool.query(
      `DELETE FROM invoices WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, company_id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get invoice summary stats
   */
  static async getStats(company_id) {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft')    AS draft_count,
        COUNT(*) FILTER (WHERE status = 'sent')     AS sent_count,
        COUNT(*) FILTER (WHERE status = 'paid')     AS paid_count,
        COUNT(*) FILTER (WHERE status = 'overdue')  AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)    AS total_paid,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent','overdue')), 0) AS total_outstanding
      FROM invoices
      WHERE company_id = $1
    `, [company_id]);
    return result.rows[0];
  }
}

module.exports = Invoice;
