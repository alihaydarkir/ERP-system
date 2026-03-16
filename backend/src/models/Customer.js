const pool = require('../config/database');

class Customer {
  /**
   * Create a new customer
   */
  static async create({ user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id }) {
    const query = `
      INSERT INTO customers (user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find customer by ID
   */
  static async findById(id, company_id = null) {
    const query = `
      SELECT c.*, u.username as user_name, u.email as user_email
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1 ${company_id ? 'AND c.company_id = $2' : ''}
    `;

    const params = company_id ? [id, company_id] : [id];
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Find all customers with filters
   */
  static async findAll(filters = {}) {
    const { company_id, limit = 50, offset = 0, search } = filters;

    let query = `
      SELECT c.*, u.username as user_name, u.email as user_email
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // MULTI-TENANCY: Filter by company_id
    if (company_id) {
      query += ` AND c.company_id = $${paramCount}`;
      values.push(company_id);
      paramCount++;
    }

    // Search by name, company, or tax number
    if (search) {
      query += ` AND (
        c.full_name ILIKE $${paramCount} OR
        c.company_name ILIKE $${paramCount} OR
        c.tax_number ILIKE $${paramCount}
      )`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count customers with filters
   */
  static async count(filters = {}) {
    const { company_id, search } = filters;

    let query = 'SELECT COUNT(*) FROM customers WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // MULTI-TENANCY
    if (company_id) {
      query += ` AND company_id = $${paramCount}`;
      values.push(company_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (
        full_name ILIKE $${paramCount} OR
        company_name ILIKE $${paramCount} OR
        tax_number ILIKE $${paramCount}
      )`;
      values.push(`%${search}%`);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Update customer
   */
  static async update(id, data, company_id = null) {
    const allowedFields = ['full_name', 'company_name', 'tax_office', 'tax_number', 'phone_number', 'company_location'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);

    // Add id to values
    values.push(id);

    const query = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} ${company_id ? `AND company_id = $${paramCount + 1}` : ''}
      RETURNING *
    `;

    if (company_id) {
      values.push(company_id);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete customer
   */
  static async delete(id, company_id = null) {
    const query = `
      DELETE FROM customers
      WHERE id = $1 ${company_id ? 'AND company_id = $2' : ''}
      RETURNING *
    `;
    const result = await pool.query(query, company_id ? [id, company_id] : [id]);
    return result.rows[0];
  }

  /**
   * Find customer by tax number
   */
  static async findByTaxNumber(tax_number, company_id) {
    const query = `
      SELECT * FROM customers
      WHERE tax_number = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [tax_number, company_id]);
    return result.rows[0];
  }
}

module.exports = Customer;
