const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validate, supplierSchemas, querySchemas } = require('../utils/validators');
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
  getSupplierStats
} = require('../controllers/supplierController');

/**
 * @route   GET /api/suppliers/stats
 * @desc    Get supplier statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, requirePermission('suppliers.view'), getSupplierStats);

/**
 * @route   GET /api/suppliers/search
 * @desc    Search suppliers
 * @access  Private
 */
router.get('/search', authMiddleware, requirePermission('suppliers.view'), searchSuppliers);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with pagination
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  requirePermission('suppliers.view'),
  validate(querySchemas.supplierFilters, 'query'),
  getAllSuppliers
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, requirePermission('suppliers.view'), getSupplierById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  requirePermission('suppliers.create'),
  validate(supplierSchemas.create),
  createSupplier
);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private
 */
router.put(
  '/:id',
  authMiddleware,
  requirePermission('suppliers.edit'),
  validate(supplierSchemas.update),
  updateSupplier
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier
 * @access  Private
 */
router.delete('/:id', authMiddleware, requirePermission('suppliers.delete'), deleteSupplier);

module.exports = router;
