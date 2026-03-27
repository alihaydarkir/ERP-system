const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const { warehouseSchemas } = require('../validators/warehouseValidators');
const {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock,
  updateWarehouseStock,
  setWarehouseStock
} = require('../controllers/warehouseController');

// Get all warehouses
router.get('/', authMiddleware, requirePermission('warehouses.view'), validate(warehouseSchemas.query, 'query'), getAllWarehouses);

// Get warehouse by ID
router.get('/:id', authMiddleware, requirePermission('warehouses.view'), getWarehouseById);

// Get warehouse stock
router.get('/:id/stock', authMiddleware, requirePermission('warehouses.view'), getWarehouseStock);

// Create new warehouse
router.post('/', authMiddleware, requirePermission('warehouses.create'), validate(warehouseSchemas.create), createWarehouse);

// Update warehouse stock (increment/decrement)
router.post('/:id/stock/update', authMiddleware, requirePermission('warehouses.edit'), updateWarehouseStock);

// Set warehouse stock (absolute value)
router.post('/:id/stock/set', authMiddleware, requirePermission('warehouses.edit'), setWarehouseStock);

// Update warehouse
router.put('/:id', authMiddleware, requirePermission('warehouses.edit'), validate(warehouseSchemas.update), updateWarehouse);

// Delete warehouse
router.delete('/:id', authMiddleware, requirePermission('warehouses.delete'), deleteWarehouse);

module.exports = router;
