const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const {
  getAllUsers,
  getAdminStats,
  updateUserRole,
  deleteUser,
  getAuditLogs
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.get('/users', authMiddleware, rbacMiddleware('admin'), getAllUsers);
router.get('/stats', authMiddleware, rbacMiddleware('admin'), getAdminStats);
router.put('/users/:userId/role', authMiddleware, rbacMiddleware('admin'), updateUserRole);
router.delete('/users/:userId', authMiddleware, rbacMiddleware('admin'), deleteUser);
router.get('/audit-logs', authMiddleware, rbacMiddleware('admin'), getAuditLogs);

module.exports = router;

