const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validate } = require('../validators/validate');
const { settingsSchemas } = require('../validators/settingsValidators');
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

const injectSettingKeyFromParams = (req, _res, next) => {
  if (req.params?.key) {
    req.body = {
      ...req.body,
      key: req.params.key,
    };
  }
  next();
};

// All settings endpoints require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

// Get all settings
router.get('/', validate(settingsSchemas.getQuery, 'query'), getAllSettings);

// Get settings grouped by category
router.get('/categories', getSettingsByCategory);

// Test email configuration
router.post('/test-email', testEmail);

// Bulk update settings
router.put('/bulk', bulkUpdateSettings);

// Get single setting
router.get('/:key', getSettingByKey);

// Update single setting
router.put('/:key', injectSettingKeyFromParams, validate(settingsSchemas.update), updateSetting);

// Create new setting
router.post('/', validate(settingsSchemas.update), createSetting);

// Delete setting
router.delete('/:key', deleteSetting);

module.exports = router;
