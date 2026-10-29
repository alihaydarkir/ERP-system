const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { generalLimiter, sensitiveOperationsLimiter } = require('../middleware/rateLimit');
const securityController = require('../controllers/securityController');
const { requirePlatformScope } = require('../middleware/rbac');

// All security routes require admin permissions
router.use(authMiddleware);
router.use(requirePermission('admin.security'));

// Security statistics
router.get('/stats',
  generalLimiter,
  securityController.getSecurityStats
);

// IP Blacklist management
router.get('/blacklist',
  requirePlatformScope,
  generalLimiter,
  securityController.getBlacklist
);

router.post('/blacklist',
  requirePlatformScope,
  sensitiveOperationsLimiter,
  securityController.blockIP
);

router.delete('/blacklist/:ip_address',
  requirePlatformScope,
  sensitiveOperationsLimiter,
  securityController.unblockIP
);

// Login attempts monitoring
router.get('/login-attempts',
  generalLimiter,
  securityController.getLoginAttempts
);

// Active sessions management
router.get('/sessions',
  generalLimiter,
  securityController.getActiveSessions
);

router.delete('/sessions/:session_id',
  sensitiveOperationsLimiter,
  securityController.terminateSession
);

module.exports = router;
