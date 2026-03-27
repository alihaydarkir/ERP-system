const pool = require('../config/database');

class ApprovalRequest {
  static async create({
    company_id,
    requested_by_user_id,
    approval_type = 'ai_agent',
    agent_tool,
    agent_input,
    risk_level,
    required_role,
    summary
  }) {
    const result = await pool.query(`
      INSERT INTO approval_requests (
        company_id,
        requested_by_user_id,
        approval_type,
        agent_tool,
        agent_input,
        risk_level,
        required_role,
        summary,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      company_id,
      requested_by_user_id,
      approval_type,
      agent_tool,
      JSON.stringify(agent_input || {}),
      risk_level,
      required_role,
      summary || null
    ]);

    return result.rows[0] || null;
  }

  static async getPendingForRequester({ company_id, user_id }) {
    const result = await pool.query(`
      SELECT id, approval_type, agent_tool, agent_input, risk_level, required_role, summary, status, created_at
      FROM approval_requests
      WHERE company_id = $1
        AND requested_by_user_id = $2
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 50
    `, [company_id, user_id]);

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM approval_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async approve({ id, approver_user_id, note }) {
    const result = await pool.query(`
      UPDATE approval_requests
      SET status = 'approved',
          approved_by_user_id = $2,
          approved_at = NOW(),
          approval_note = $3,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING *
    `, [id, approver_user_id, note || null]);

    return result.rows[0] || null;
  }

  static async reject({ id, approver_user_id, note }) {
    const result = await pool.query(`
      UPDATE approval_requests
      SET status = 'rejected',
          approved_by_user_id = $2,
          approved_at = NOW(),
          approval_note = $3,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING *
    `, [id, approver_user_id, note || null]);

    return result.rows[0] || null;
  }

  static async markExecuted({ id, result_payload }) {
    const result = await pool.query(`
      UPDATE approval_requests
      SET status = 'executed',
          executed_at = NOW(),
          execution_result = $2,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'approved'
      RETURNING *
    `, [id, JSON.stringify(result_payload || {})]);

    return result.rows[0] || null;
  }

  static async markExecutionFailed({ id, error_message }) {
    const result = await pool.query(`
      UPDATE approval_requests
      SET status = 'failed',
          execution_error = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, String(error_message || 'Bilinmeyen hata')]);

    return result.rows[0] || null;
  }
}

module.exports = ApprovalRequest;
