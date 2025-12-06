const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
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
router.post('/import/validate', authMiddleware, upload.single('file'), handleUploadError, validateCustomerImport);
router.post('/import/process', authMiddleware, processCustomerImport);

// All customer endpoints require authentication
router.get('/', authMiddleware, validate(querySchemas.customerFilters, 'query'), getAllCustomers);
router.get('/:id', authMiddleware, getCustomerById);
router.post('/', authMiddleware, validate(customerSchemas.create), createCustomer);
router.put('/:id', authMiddleware, validate(customerSchemas.update), updateCustomer);
router.delete('/:id', authMiddleware, deleteCustomer);

module.exports = router;
