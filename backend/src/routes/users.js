const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userManagementController = require('../controllers/userManagementController');
const { requirePermission } = require('../middleware/permissions');
const { generalLimiter, sensitiveOperationsLimiter } = require('../middleware/rateLimit');

// Get all users (admin only)
router.get('/',
  authMiddleware,
  requirePermission('users.view'),
  generalLimiter,
  userManagementController.getAllUsers
);

// Get user statistics
router.get('/statistics',
  authMiddleware,
  requirePermission('users.view'),
  generalLimiter,
  userManagementController.getUserStatistics
);

// Get single user
router.get('/:id',
  authMiddleware,
  requirePermission('users.view'),
  generalLimiter,
  userManagementController.getUserById
);

// Create new user (sensitive operation)
router.post('/',
  authMiddleware,
  requirePermission('users.create'),
  sensitiveOperationsLimiter,
  userManagementController.createUser
);

// Update user (sensitive operation)
router.put('/:id',
  authMiddleware,
  requirePermission('users.edit'),
  sensitiveOperationsLimiter,
  userManagementController.updateUser
);

// Delete user (sensitive operation)
router.delete('/:id',
  authMiddleware,
  requirePermission('users.delete'),
  sensitiveOperationsLimiter,
  userManagementController.deleteUser
);

// Change user password (sensitive operation)
router.post('/:id/change-password',
  authMiddleware,
  requirePermission('users.edit'),
  sensitiveOperationsLimiter,
  userManagementController.changeUserPassword
);

module.exports = router;
