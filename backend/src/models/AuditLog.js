const pool = require('../config/database');

class AuditLog {
  /**
   * Create a new audit log entry
   */
  static async create({ user_id, action, entity_type, entity_id, changes = {}, ip_address = null }) {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      user_id,
      action,
      entity_type,
      entity_id,
      JSON.stringify(changes),
      ip_address
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find audit log by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM audit_logs WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all audit logs with filters
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND action = $${paramCount}`;
      values.push(filters.action);
      paramCount++;
    }

    if (filters.entity_type) {
      query += ` AND entity_type = $${paramCount}`;
      values.push(filters.entity_type);
      paramCount++;
    }

    if (filters.entity_id) {
      query += ` AND entity_id = $${paramCount}`;
      values.push(filters.entity_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.end_date);
      paramCount++;
    }

    if (filters.ip_address) {
      query += ` AND ip_address = $${paramCount}`;
      values.push(filters.ip_address);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get audit logs for a specific user
   */
  static async findByUserId(user_id, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [user_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get audit logs for a specific entity
   */
  static async findByEntity(entity_type, entity_id, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM audit_logs
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await pool.query(query, [entity_type, entity_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get audit logs by action
   */
  static async findByAction(action, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM audit_logs
      WHERE action = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [action, limit, offset]);
    return result.rows;
  }

  /**
   * Get recent audit logs
   */
  static async getRecent(limit = 50) {
    const query = `
      SELECT al.*, u.username, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get audit statistics
   */
  static async getStats(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT entity_type) as entity_types,
        COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
        COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
        COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as logins
      FROM audit_logs
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.start_date) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.end_date);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Count audit logs
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND action = $${paramCount}`;
      values.push(filters.action);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete old audit logs (cleanup)
   */
  static async deleteOlderThan(days) {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING COUNT(*) as deleted_count
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Log user login
   */
  static async logLogin(user_id, ip_address) {
    return await this.create({
      user_id,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user_id,
      changes: { event: 'user_login' },
      ip_address
    });
  }

  /**
   * Log user logout
   */
  static async logLogout(user_id, ip_address) {
    return await this.create({
      user_id,
      action: 'LOGOUT',
      entity_type: 'user',
      entity_id: user_id,
      changes: { event: 'user_logout' },
      ip_address
    });
  }
}

module.exports = AuditLog;
