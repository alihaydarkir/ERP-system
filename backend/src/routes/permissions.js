const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const permissionController = require('../controllers/permissionController');
const { requirePermission } = require('../middleware/permissions');
const { requirePlatformScope } = require('../middleware/rbac');

// Get all permissions
router.get('/', 
  authMiddleware,
  requirePermission('settings.view'),
  permissionController.getAllPermissions
);

// Get current user's permissions
router.get('/my-permissions',
  authMiddleware,
  permissionController.getMyPermissions
);

// Get permissions for a specific role
router.get('/role/:role',
  authMiddleware,
  requirePermission('settings.view'),
  permissionController.getRolePermissions
);

// Update permissions for a role
router.put('/role/:role',
  authMiddleware,
  requirePermission('settings.edit'),
  requirePlatformScope,
  permissionController.updateRolePermissions
);

// Get user-specific permissions
router.get('/user/:userId',
  authMiddleware,
  requirePermission('users.view'),
  permissionController.getUserPermissions
);

module.exports = router;
