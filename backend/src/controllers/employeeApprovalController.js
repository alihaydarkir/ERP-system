const pool = require('../config/database');
const { formatSuccess, formatError } = require('../utils/formatters');
const AuditLog = require('../models/AuditLog');
const { getClientIP } = require('../utils/helpers');

/**
 * Get pending employee approval requests
 */
const getPendingApprovals = async (req, res) => {
  try {
    const { company_id, role } = req.user;

    console.log('🔍 getPendingApprovals called:', { company_id, role, user_id: req.user.userId });

    // Only admins can view pending approvals
    if (role !== 'admin') {
      return res.status(403).json(formatError('Bu işlem için yetkiniz yok'));
    }

    const result = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name,
        u.role,
        u.approval_status,
        u.created_at,
        c.company_name,
        c.company_code
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.company_id = $1 
      AND u.approval_status = 'pending'
      ORDER BY u.created_at DESC
    `, [company_id]);

    console.log('📊 Found pending users:', result.rows.length, result.rows);

    res.json(formatSuccess({
      requests: result.rows,
      count: result.rows.length
    }));

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json(formatError('Bekleyen istekler getirilemedi'));
  }
};

/**
 * Approve employee
 */
const approveEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    const { company_id, role, userId: approverId } = req.user;

    // Only admins can approve
    if (role !== 'admin') {
      return res.status(403).json(formatError('Bu işlem için yetkiniz yok'));
    }

    // Check if user exists and belongs to same company
    const userCheck = await pool.query(
      'SELECT id, username, email, company_id, approval_status FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json(formatError('Kullanıcı bulunamadı'));
    }

    const user = userCheck.rows[0];

    if (user.company_id !== company_id) {
      return res.status(403).json(formatError('Bu kullanıcıyı onaylama yetkiniz yok'));
    }

    if (user.approval_status !== 'pending') {
      return res.status(400).json(formatError('Bu kullanıcı zaten onaylanmış veya reddedilmiş'));
    }

    // Approve user
    await pool.query(`
      UPDATE users 
      SET approval_status = 'approved',
          approved_by = $1,
          approved_at = NOW()
      WHERE id = $2
    `, [approverId, userId]);

    // Log activity
    await AuditLog.create({
      user_id: approverId,
      action: 'APPROVE_EMPLOYEE',
      entity_type: 'user',
      entity_id: userId,
      changes: { 
        status: 'approved',
        username: user.username,
        email: user.email
      },
      ip_address: getClientIP(req)
    });

    console.log(`Employee approved: ${user.username} by admin ${approverId}`);

    res.json(formatSuccess({
      message: `${user.username} onaylandı`,
      userId: user.id
    }));

  } catch (error) {
    console.error('Approve employee error:', error);
    res.status(500).json(formatError('Kullanıcı onaylanamadı'));
  }
};

/**
 * Reject employee
 */
const rejectEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const { company_id, role, userId: approverId } = req.user;

    // Only admins can reject
    if (role !== 'admin') {
      return res.status(403).json(formatError('Bu işlem için yetkiniz yok'));
    }

    // Check if user exists and belongs to same company
    const userCheck = await pool.query(
      'SELECT id, username, email, company_id, approval_status FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json(formatError('Kullanıcı bulunamadı'));
    }

    const user = userCheck.rows[0];

    if (user.company_id !== company_id) {
      return res.status(403).json(formatError('Bu kullanıcıyı reddetme yetkiniz yok'));
    }

    if (user.approval_status !== 'pending') {
      return res.status(400).json(formatError('Bu kullanıcı zaten onaylanmış veya reddedilmiş'));
    }

    // Reject user
    await pool.query(`
      UPDATE users 
      SET approval_status = 'rejected',
          approved_by = $1,
          approved_at = NOW(),
          rejection_reason = $2
      WHERE id = $3
    `, [approverId, reason || 'Yönetici tarafından reddedildi', userId]);

    // Log activity
    await AuditLog.create({
      user_id: approverId,
      action: 'REJECT_EMPLOYEE',
      entity_type: 'user',
      entity_id: userId,
      changes: { 
        status: 'rejected',
        username: user.username,
        email: user.email,
        reason: reason
      },
      ip_address: getClientIP(req)
    });

    console.log(`Employee rejected: ${user.username} by admin ${approverId}`);

    res.json(formatSuccess({
      message: `${user.username} reddedildi`,
      userId: user.id
    }));

  } catch (error) {
    console.error('Reject employee error:', error);
    res.status(500).json(formatError('Kullanıcı reddedilemedi'));
  }
};

/**
 * Get all employees with their approval status
 */
const getAllEmployees = async (req, res) => {
  try {
    const { company_id, role } = req.user;

    // Only admins can view all employees
    if (role !== 'admin') {
      return res.status(403).json(formatError('Bu işlem için yetkiniz yok'));
    }

    const result = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name,
        u.role,
        u.approval_status,
        u.approved_at,
        u.rejection_reason,
        u.created_at,
        approver.username as approved_by_username
      FROM users u
      LEFT JOIN users approver ON u.approved_by = approver.id
      WHERE u.company_id = $1
      ORDER BY 
        CASE u.approval_status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'rejected' THEN 3
        END,
        u.created_at DESC
    `, [company_id]);

    res.json(formatSuccess({
      employees: result.rows,
      total: result.rows.length,
      pending: result.rows.filter(u => u.approval_status === 'pending').length,
      approved: result.rows.filter(u => u.approval_status === 'approved').length,
      rejected: result.rows.filter(u => u.approval_status === 'rejected').length
    }));

  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json(formatError('Çalışanlar getirilemedi'));
  }
};

module.exports = {
  getPendingApprovals,
  approveEmployee,
  rejectEmployee,
  getAllEmployees
};
