const pool = require('../config/database');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Product = require('../models/Product');
const Order = require('../models/Order');
const reportService = require('../services/reportService');
const { formatSuccess, formatError, formatUser } = require('../utils/formatters');

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, status } = req.query;

    const filters = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      company_id: req.user.company_id
    };

    if (role) filters.role = role;
    if (status) filters.status = status;

    const users = await User.findAll(filters);

    const formattedUsers = users.map(user => formatUser(user));

    const total = await User.count({ role: filters.role, status: filters.status, company_id: filters.company_id });

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json(formatError('Failed to fetch users'));
  }
};

/**
 * Get admin statistics (Admin only)
 */
const getAdminStats = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    // Get comprehensive stats
    const [dashboardStats, recentOrders, lowStock, recentActivity] = await Promise.all([
      reportService.getDashboardStats(companyId),
      Order.findAll({ company_id: companyId, limit: 10, sort: 'created_at', order: 'DESC' }),
      Product.getLowStock(10, companyId),
      AuditLog.findAll({ company_id: companyId, limit: 20, sort: 'created_at', order: 'DESC' })
    ]);

    // Kullanıcı istatistikleri (yalnız bu şirket)
    const roleRows = await pool.query(
      'SELECT role, COUNT(*)::int AS count FROM users WHERE company_id = $1 GROUP BY role',
      [companyId]
    );
    const byRole = Object.fromEntries(roleRows.rows.map((r) => [r.role, r.count]));
    const userStats = { total: roleRows.rows.reduce((n, r) => n + r.count, 0), byRole, recent: [] };

    // Sipariş istatistikleri
    const orderStats = await reportService.getOrderStatistics({ company_id: companyId });

    res.json(formatSuccess({
      dashboard: dashboardStats.stats || {},
      users: {
        total: userStats.total || 0,
        byRole: userStats.byRole || {},
        recentRegistrations: userStats.recent || []
      },
      orders: {
        recent: recentOrders.slice(0, 10),
        statistics: orderStats
      },
      inventory: {
        lowStock: lowStock,
        lowStockCount: lowStock.length
      },
      activity: {
        recent: recentActivity.map(log => ({
          id: log.id,
          user_id: log.user_id,
          action: log.action,
          entity_type: log.entity_type || log.resource,
          entity_id: log.entity_id || log.resource_id,
          timestamp: log.created_at
        }))
      },
      lastUpdated: new Date()
    }, 'Admin statistics retrieved'));

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json(formatError('Failed to fetch admin statistics'));
  }
};

/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'manager'].includes(role)) {
      return res.status(400).json(formatError('Invalid role'));
    }

    // Don't allow self-demotion from admin
    if (req.user.userId === parseInt(userId) && role !== 'admin') {
      return res.status(400).json(formatError('Cannot change your own admin role'));
    }

    const updatedUser = await User.update(userId, { role }, req.user.company_id);
    if (!updatedUser) {
      return res.status(404).json(formatError('User not found'));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      company_id: req.user.company_id,
      action: 'UPDATE_ROLE',
      entity_type: 'user',
      entity_id: parseInt(userId),
      changes: { role },
      ip_address: req.ip
    });

    res.json(formatSuccess(formatUser(updatedUser), 'User role updated'));

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json(formatError('Failed to update user role'));
  }
};

/**
 * Delete user (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow self-deletion
    if (req.user.userId === parseInt(userId)) {
      return res.status(400).json(formatError('Cannot delete your own account'));
    }

    const deleted = await User.delete(userId, req.user.company_id);
    if (!deleted) {
      return res.status(404).json(formatError('User not found'));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      company_id: req.user.company_id,
      action: 'DELETE',
      entity_type: 'user',
      entity_id: parseInt(userId),
      changes: {},
      ip_address: req.ip
    });

    res.json(formatSuccess(null, 'User deleted successfully'));

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(formatError('Failed to delete user'));
  }
};

/**
 * Get audit logs (Admin only)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action, start_date, end_date } = req.query;

    const filters = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      company_id: req.user.company_id
    };

    if (user_id) filters.user_id = parseInt(user_id);
    if (action) filters.action = action;
    if (start_date) filters.start_date = new Date(start_date);
    if (end_date) filters.end_date = new Date(end_date);

    const logs = await AuditLog.findAll(filters);

    res.json(formatSuccess({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }));

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json(formatError('Failed to fetch audit logs'));
  }
};

module.exports = {
  getAllUsers,
  getAdminStats,
  updateUserRole,
  deleteUser,
  getAuditLogs
};
