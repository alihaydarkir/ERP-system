const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  /**
   * Create a new user
   */
  static async create({ username, email, password, role = 'user', full_name = null, company_id = null, approval_status = 'approved' }) {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default company if not provided
    let finalCompanyId = company_id;
    if (!finalCompanyId) {
      const defaultCompany = await pool.query(
        "SELECT id FROM companies WHERE company_code = 'DEFAULT_COMPANY' LIMIT 1"
      );
      if (defaultCompany.rows.length > 0) {
        finalCompanyId = defaultCompany.rows[0].id;
      }
    }

    const query = `
      INSERT INTO users (username, email, password_hash, role, full_name, company_id, approval_status, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, role, full_name, company_id, approval_status, created_at
    `;

    const approvedAt = approval_status === 'approved' ? new Date() : null;
    const values = [username, email, hashedPassword, role, full_name, finalCompanyId, approval_status, approvedAt];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = 'SELECT id, username, email, role, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  /**
   * Get all users
   */
  static async findAll(filters = {}) {
    const { limit = 100, offset = 0, role, status } = filters;

    let query = `
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM users
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    if (status !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      values.push(status === 'active');
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Update user
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.username) {
      fields.push(`username = $${paramCount}`);
      values.push(data.username);
      paramCount++;
    }
    if (data.email) {
      fields.push(`email = $${paramCount}`);
      values.push(data.email);
      paramCount++;
    }
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      fields.push(`password_hash = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }
    if (data.role) {
      fields.push(`role = $${paramCount}`);
      values.push(data.role);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Count total users
   */
  static async count(filters = {}) {
    const { role, status } = filters;

    let query = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    if (status !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      values.push(status === 'active');
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }
}

module.exports = User;
