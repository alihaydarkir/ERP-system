const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const { upload, handleUploadError } = require('../middleware/fileUpload');
const { validateImport, processImport } = require('../controllers/importController');

/**
 * Import Routes - Excel file import for products
 */

// POST /api/import/validate - Validate Excel file
router.post(
  '/validate',
  authMiddleware,
  rbacMiddleware('admin', 'manager'),
  upload.single('file'),
  handleUploadError,
  validateImport
);

// POST /api/import/process - Process validated import data
router.post(
  '/process',
  authMiddleware,
  rbacMiddleware('admin', 'manager'),
  processImport
);

module.exports = router;
