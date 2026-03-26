const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { upload, handleUploadError } = require('../middleware/fileUpload');
const { validate, customerSchemas, querySchemas } = require('../utils/validators');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');
const {
  validateCustomerImport,
  processCustomerImport
} = require('../controllers/customerImportController');

// Customer import endpoints
router.post('/import/validate', authMiddleware, requirePermission('customers.import'), upload.single('file'), handleUploadError, validateCustomerImport);
router.post('/import/process', authMiddleware, requirePermission('customers.import'), processCustomerImport);

// All customer endpoints require authentication
router.get('/', authMiddleware, requirePermission('customers.view'), validate(querySchemas.customerFilters, 'query'), getAllCustomers);
router.get('/:id', authMiddleware, requirePermission('customers.view'), getCustomerById);
router.post('/', authMiddleware, requirePermission('customers.create'), validate(customerSchemas.create), createCustomer);
router.put('/:id', authMiddleware, requirePermission('customers.edit'), validate(customerSchemas.update), updateCustomer);
router.delete('/:id', authMiddleware, requirePermission('customers.delete'), deleteCustomer);

module.exports = router;
