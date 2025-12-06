const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  updateSetting,
  bulkUpdateSettings,
  testEmail,
  createSetting,
  deleteSetting
} = require('../controllers/settingsController');

// Admin middleware - check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// All settings endpoints require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

// Get all settings
router.get('/', getAllSettings);

// Get settings grouped by category
router.get('/categories', getSettingsByCategory);

// Test email configuration
router.post('/test-email', testEmail);

// Bulk update settings
router.put('/bulk', bulkUpdateSettings);

// Get single setting
router.get('/:key', getSettingByKey);

// Update single setting
router.put('/:key', updateSetting);

// Create new setting
router.post('/', createSetting);

// Delete setting
router.delete('/:key', deleteSetting);

module.exports = router;
