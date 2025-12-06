const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { avatarUpload, handleUploadError } = require('../middleware/fileUpload');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  updatePreferences,
  getActivityHistory,
  getLoginHistory,
  enable2FA,
  disable2FA
} = require('../controllers/userProfileController');

// All profile endpoints require authentication
router.use(authMiddleware);

// Get user profile
router.get('/profile', getProfile);

// Update profile
router.put('/profile', updateProfile);

// Upload avatar
router.post('/profile/avatar', avatarUpload.single('avatar'), handleUploadError, uploadAvatar);

// Change password
router.put('/profile/password', changePassword);

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

module.exports = router;
