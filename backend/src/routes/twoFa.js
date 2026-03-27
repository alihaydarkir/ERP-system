const express = require('express');
const router = express.Router();
const { twoFaAuthMiddleware, checkTwoFaTokenUsage } = require('../middleware/twoFaAuth');
const { generalLimiter } = require('../middleware/rateLimit');
const { validate } = require('../validators/validate');
const { twoFaSchemas } = require('../validators/twoFaValidators');
const {
  startSetup,
  verifySetup,
  getStatus,
  disable,
  verifyLogin,
  getBackupCodes,
  regenerateBackupCodes,
  deleteUserTwoFA
} = require('../controllers/user2faController');

// Use special 2FA middleware that accepts both regular tokens and temporary 2FA tokens
router.use(twoFaAuthMiddleware);

// Check that temporary 2FA tokens only access /verify endpoint
router.use(checkTwoFaTokenUsage);

// Get current 2FA status
router.get('/status', generalLimiter, getStatus);

// Start 2FA setup (generate secret & QR code)
router.post('/setup', generalLimiter, validate(twoFaSchemas.enable), startSetup);

// Verify token during setup
router.post('/setup/verify', generalLimiter, validate(twoFaSchemas.verify), verifySetup);

// Verify token during login (accepts temporary 2FA token)
router.post('/verify', generalLimiter, validate(twoFaSchemas.verify), verifyLogin);

// Get backup codes
router.get('/backup-codes', generalLimiter, getBackupCodes);

// Regenerate backup codes
router.post('/backup-codes/regenerate', generalLimiter, regenerateBackupCodes);

// Disable 2FA for current user
router.post('/disable', generalLimiter, validate(twoFaSchemas.disable), disable);

// Delete 2FA for user (admin only)
router.delete('/:userId', generalLimiter, deleteUserTwoFA);

module.exports = router;