const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
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
router.get('/stats', authMiddleware, getSupplierStats);

/**
 * @route   GET /api/suppliers/search
 * @desc    Search suppliers
 * @access  Private
 */
router.get('/search', authMiddleware, searchSuppliers);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with pagination
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  validate(querySchemas.supplierFilters, 'query'),
  getAllSuppliers
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, getSupplierById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
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
  validate(supplierSchemas.update),
  updateSupplier
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier
 * @access  Private
 */
router.delete('/:id', authMiddleware, deleteSupplier);

module.exports = router;
