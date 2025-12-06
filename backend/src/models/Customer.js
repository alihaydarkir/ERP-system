const pool = require('../config/database');

class Customer {
  /**
   * Create a new customer
   */
  static async create({ user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location }) {
    const query = `
      INSERT INTO customers (user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find customer by ID
   */
  static async findById(id) {
    const query = `
      SELECT c.*, u.username as user_name, u.email as user_email
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find all customers with filters
   */
  static async findAll(filters = {}) {
    const { user_id, limit = 50, offset = 0, search } = filters;

    let query = `
      SELECT c.*, u.username as user_name, u.email as user_email
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // Filter by user_id if provided
    if (user_id) {
      query += ` AND c.user_id = $${paramCount}`;
      values.push(user_id);
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
    const { user_id, search } = filters;

    let query = 'SELECT COUNT(*) FROM customers WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(user_id);
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
  static async update(id, data) {
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
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete customer
   */
  static async delete(id) {
    const query = 'DELETE FROM customers WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find customer by tax number
   */
  static async findByTaxNumber(tax_number, user_id) {
    const query = `
      SELECT * FROM customers
      WHERE tax_number = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [tax_number, user_id]);
    return result.rows[0];
  }
}

module.exports = Customer;
