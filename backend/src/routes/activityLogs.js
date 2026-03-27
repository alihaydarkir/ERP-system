const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const activityLogController = require('../controllers/activityLogController');
const { requirePermission } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const { activityLogSchemas } = require('../validators/activityLogValidators');

// Get all activity logs (admin only)
router.get('/',
  authMiddleware,
  requirePermission('logs.view'),
  validate(activityLogSchemas.query, 'query'),
  activityLogController.getActivityLogs
);

// Get activity statistics
router.get('/statistics',
  authMiddleware,
  requirePermission('logs.view'),
  activityLogController.getActivityStatistics
);

// Get my activity
router.get('/my-activity',
  authMiddleware,
  activityLogController.getMyActivity
);

// Clean up old logs (admin only)
router.delete('/cleanup',
  authMiddleware,
  requirePermission('logs.delete'),
  activityLogController.cleanupOldLogs
);

module.exports = router;
