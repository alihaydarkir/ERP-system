const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { avatarUpload, handleUploadError } = require('../middleware/fileUpload');
const { validate } = require('../validators/validate');
const { updateProfileSchema, changePasswordSchema } = require('../validators/userValidator');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  updatePreferences,
  getActivityHistory,
  getLoginHistory,
  enable2FA,
  disable2FA,
  completeOnboarding,
  exportMyData,
  deleteMyData
} = require('../controllers/userProfileController');

// All profile endpoints require authentication
router.use(authMiddleware);

// Get user profile
router.get('/profile', getProfile);

// Update profile
router.put('/profile', validate(updateProfileSchema), updateProfile);

// Upload avatar
router.post('/profile/avatar', avatarUpload.single('avatar'), handleUploadError, uploadAvatar);

// Change password
router.put('/profile/password', validate(changePasswordSchema), changePassword);
router.put('/password', validate(changePasswordSchema), changePassword);

// Update preferences
router.put('/profile/preferences', updatePreferences);

// Get activity history
router.get('/profile/activity', getActivityHistory);

// Get login history
router.get('/profile/login-history', getLoginHistory);

// Enable 2FA
router.post('/profile/2fa/enable', enable2FA);

// Disable 2FA
router.post('/profile/2fa/disable', disable2FA);

// Complete onboarding
router.put('/me/onboarding', completeOnboarding);

// Export my data
router.get('/me/export', exportMyData);

// Soft delete my data/account
router.delete('/me/data', deleteMyData);

module.exports = router;
