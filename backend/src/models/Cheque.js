const pool = require('../config/database');

class Cheque {
  /**
   * Create a new cheque
   */
  static async create({
    user_id,
    check_serial_no,
    check_issuer,
    customer_id,
    bank_name,
    received_date,
    due_date,
    amount,
    currency = 'TRY',
    status = 'pending',
    notes
  }) {
    const query = `
      INSERT INTO cheques (
        user_id, check_serial_no, check_issuer, customer_id, bank_name,
        received_date, due_date, amount, currency, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      user_id, check_serial_no, check_issuer, customer_id, bank_name,
      received_date, due_date, amount, currency, status, notes
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find cheque by ID with customer and user information
   */
  static async findById(id) {
    const query = `
      SELECT
        ch.*,
        c.company_name as customer_company_name,
        c.full_name as customer_contact_name,
        c.phone_number as customer_phone,
        u.username as user_name,
        u.email as user_email,
        (ch.due_date - CURRENT_DATE) as days_until_due
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      LEFT JOIN users u ON ch.user_id = u.id
      WHERE ch.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find all cheques with filters and pagination
   */
  static async findAll(filters = {}) {
    const {
      user_id,
      status,
      customer_id,
      bank_name,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
      sort_by = 'due_date',
      sort_order = 'ASC'
    } = filters;

    let query = `
      SELECT
        ch.*,
        c.company_name as customer_company_name,
        c.full_name as customer_contact_name,
        (ch.due_date - CURRENT_DATE) as days_until_due
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // Filter by user_id
    if (user_id) {
      query += ` AND ch.user_id = $${paramCount}`;
      values.push(user_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND ch.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    // Filter by customer_id
    if (customer_id) {
      query += ` AND ch.customer_id = $${paramCount}`;
      values.push(customer_id);
      paramCount++;
    }

    // Filter by bank_name
    if (bank_name) {
      query += ` AND ch.bank_name ILIKE $${paramCount}`;
      values.push(`%${bank_name}%`);
      paramCount++;
    }

    // Filter by date range (due_date)
    if (start_date) {
      query += ` AND ch.due_date >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND ch.due_date <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }

    // Sorting
    const allowedSortFields = ['due_date', 'received_date', 'amount', 'created_at', 'check_serial_no'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'due_date';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    query += ` ORDER BY ch.${sortField} ${sortDirection} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count cheques with filters
   */
  static async count(filters = {}) {
    const { user_id, status, customer_id, bank_name, start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) FROM cheques WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(user_id);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND customer_id = $${paramCount}`;
      values.push(customer_id);
      paramCount++;
    }

    if (bank_name) {
      query += ` AND bank_name ILIKE $${paramCount}`;
      values.push(`%${bank_name}%`);
      paramCount++;
    }

    if (start_date) {
      query += ` AND due_date >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND due_date <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Update cheque
   */
  static async update(id, data) {
    const allowedFields = [
      'check_serial_no', 'check_issuer', 'customer_id', 'bank_name',
      'received_date', 'due_date', 'amount', 'currency', 'notes'
    ];

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
      UPDATE cheques
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update cheque status (separate method for audit trail)
   */
  static async updateStatus(id, new_status) {
    const query = `
      UPDATE cheques
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [new_status, id]);
    return result.rows[0];
  }

  /**
   * Delete cheque
   */
  static async delete(id) {
    const query = 'DELETE FROM cheques WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find cheque by serial number and bank
   */
  static async findBySerialAndBank(check_serial_no, bank_name) {
    const query = `
      SELECT * FROM cheques
      WHERE check_serial_no = $1 AND bank_name = $2
    `;

    const result = await pool.query(query, [check_serial_no, bank_name]);
    return result.rows[0];
  }

  /**
   * Get cheques due soon (within specified days)
   */
  static async getDueSoon(user_id, days = 7) {
    const query = `
      SELECT
        ch.*,
        c.company_name as customer_company_name,
        c.full_name as customer_contact_name,
        (ch.due_date - CURRENT_DATE) as days_until_due
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.user_id = $1
        AND ch.status = 'pending'
        AND ch.due_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND ch.due_date >= CURRENT_DATE
      ORDER BY ch.due_date ASC
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  /**
   * Get overdue cheques (past due date and still pending)
   */
  static async getOverdue(user_id) {
    const query = `
      SELECT
        ch.*,
        c.company_name as customer_company_name,
        c.full_name as customer_contact_name,
        (CURRENT_DATE - ch.due_date) as days_overdue
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.user_id = $1
        AND ch.status = 'pending'
        AND ch.due_date < CURRENT_DATE
      ORDER BY ch.due_date ASC
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  /**
   * Get statistics for cheques
   */
  static async getStatistics(user_id) {
    const query = `
      SELECT
        COUNT(*) as total_cheques,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'cleared' THEN 1 END) as cleared_count,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END) as cleared_amount,
        SUM(CASE WHEN status = 'bounced' THEN amount ELSE 0 END) as bounced_amount,
        SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) as cancelled_amount,
        COUNT(CASE WHEN status = 'pending' AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date >= CURRENT_DATE THEN 1 END) as due_soon_count,
        SUM(CASE WHEN status = 'pending' AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date >= CURRENT_DATE THEN amount ELSE 0 END) as due_soon_amount,
        COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END) as overdue_count,
        SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END) as overdue_amount
      FROM cheques
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  /**
   * Bulk create cheques (for Excel import)
   */
  static async bulkCreate(chequesData) {
    const client = await pool.connect();
    const insertedCheques = [];
    const errors = [];

    try {
      await client.query('BEGIN');

      for (let i = 0; i < chequesData.length; i++) {
        try {
          const cheque = chequesData[i];
          const query = `
            INSERT INTO cheques (
              user_id, check_serial_no, check_issuer, customer_id, bank_name,
              received_date, due_date, amount, currency, status, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `;

          const values = [
            cheque.user_id,
            cheque.check_serial_no,
            cheque.check_issuer,
            cheque.customer_id,
            cheque.bank_name,
            cheque.received_date,
            cheque.due_date,
            cheque.amount,
            cheque.currency || 'TRY',
            cheque.status || 'pending',
            cheque.notes || null
          ];

          const result = await client.query(query, values);
          insertedCheques.push(result.rows[0]);
        } catch (error) {
          errors.push({
            row: i + 1,
            data: chequesData[i],
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { insertedCheques, errors };
  }
}

// ChequeTransaction model for audit trail
class ChequeTransaction {
  /**
   * Create a cheque transaction record
   */
  static async create({ cheque_id, old_status, new_status, changed_by, notes, ip_address }) {
    const query = `
      INSERT INTO cheque_transactions (cheque_id, old_status, new_status, changed_by, notes, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [cheque_id, old_status, new_status, changed_by, notes, ip_address];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all transactions for a cheque
   */
  static async findByChequeId(cheque_id) {
    const query = `
      SELECT
        ct.*,
        u.username as changed_by_username,
        u.email as changed_by_email
      FROM cheque_transactions ct
      LEFT JOIN users u ON ct.changed_by = u.id
      WHERE ct.cheque_id = $1
      ORDER BY ct.changed_at DESC
    `;

    const result = await pool.query(query, [cheque_id]);
    return result.rows;
  }
}

module.exports = { Cheque, ChequeTransaction };