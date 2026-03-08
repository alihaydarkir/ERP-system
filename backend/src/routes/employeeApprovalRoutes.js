const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const { canApproveUsers } = require('../middleware/approvalMiddleware');

// Get pending employees (Admin/Manager only)
router.get('/pending', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!canApproveUsers(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $1';
    const params = req.isSuperAdmin ? [] : [req.companyId];

    const result = await pool.query(
      `SELECT id, username, email, full_name, role, company_id, 
              approval_status, created_at
       FROM users 
       WHERE approval_status = 'pending' ${companyFilter}
       ORDER BY created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching pending employees:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen çalışanlar alınamadı',
    });
  }
});

// Approve employee
router.post('/:userId/approve', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!canApproveUsers(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    const { userId } = req.params;

    // Check if user exists and belongs to same company
    const userCheck = await pool.query(
      'SELECT id, company_id, username, email FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Super admin can approve anyone, others only their company
    if (!req.isSuperAdmin && userCheck.rows[0].company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Bu kullanıcıyı onaylama yetkiniz yok',
      });
    }

    // Approve user
    await pool.query(
      `UPDATE users 
       SET approval_status = 'approved', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, userId]
    );

    res.json({
      success: true,
      message: 'Kullanıcı onaylandı',
    });
  } catch (error) {
    console.error('Error approving employee:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı onaylanamadı',
    });
  }
});

// Reject employee
router.post('/:userId/reject', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!canApproveUsers(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    // Check if user exists and belongs to same company
    const userCheck = await pool.query(
      'SELECT id, company_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    if (!req.isSuperAdmin && userCheck.rows[0].company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Bu kullanıcıyı reddetme yetkiniz yok',
      });
    }

    // Reject user
    await pool.query(
      `UPDATE users 
       SET approval_status = 'rejected', 
           rejection_reason = $1,
           approved_by = $2
       WHERE id = $3`,
      [reason || 'Onaylanmadı', req.user.id, userId]
    );

    res.json({
      success: true,
      message: 'Kullanıcı reddedildi',
    });
  } catch (error) {
    console.error('Error rejecting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı reddedilemedi',
    });
  }
});

module.exports = router;
