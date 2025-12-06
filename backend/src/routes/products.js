const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission, logActivity } = require('../middleware/permissions');
const { validate, productSchemas, querySchemas } = require('../utils/validators');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// All product endpoints now require authentication and specific permissions
router.get('/', 
  authMiddleware, 
  requirePermission('products.view'),
  validate(querySchemas.productFilters, 'query'), 
  getAllProducts
);

router.get('/:id', 
  authMiddleware, 
  requirePermission('products.view'),
  getProductById
);

router.post('/', 
  authMiddleware, 
  requirePermission('products.create'),
  validate(productSchemas.create),
  logActivity('create_product', 'products'),
  createProduct
);

router.put('/:id', 
  authMiddleware, 
  requirePermission('products.edit'),
  validate(productSchemas.update),
  logActivity('update_product', 'products'),
  updateProduct
);

router.delete('/:id', 
  authMiddleware, 
  requirePermission('products.delete'),
  logActivity('delete_product', 'products'),
  deleteProduct
);

module.exports = router;

