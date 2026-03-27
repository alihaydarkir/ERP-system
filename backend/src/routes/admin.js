const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const { validate } = require('../validators/validate');
const { adminSchemas } = require('../validators/adminValidators');
const {
  getAllUsers,
  getAdminStats,
  updateUserRole,
  deleteUser,
  getAuditLogs
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.get('/users', authMiddleware, rbacMiddleware('admin'), validate(adminSchemas.query, 'query'), getAllUsers);
router.get('/stats', authMiddleware, rbacMiddleware('admin'), getAdminStats);
router.put('/users/:userId/role', authMiddleware, rbacMiddleware('admin'), updateUserRole);
router.delete('/users/:userId', authMiddleware, rbacMiddleware('admin'), deleteUser);
router.get('/audit-logs', authMiddleware, rbacMiddleware('admin'), validate(adminSchemas.query, 'query'), getAuditLogs);

module.exports = router;

