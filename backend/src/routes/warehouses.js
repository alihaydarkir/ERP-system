const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
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
router.get('/', authMiddleware, getAllWarehouses);

// Get warehouse by ID
router.get('/:id', authMiddleware, getWarehouseById);

// Get warehouse stock
router.get('/:id/stock', authMiddleware, getWarehouseStock);

// Create new warehouse
router.post('/', authMiddleware, createWarehouse);

// Update warehouse stock (increment/decrement)
router.post('/:id/stock/update', authMiddleware, updateWarehouseStock);

// Set warehouse stock (absolute value)
router.post('/:id/stock/set', authMiddleware, setWarehouseStock);

// Update warehouse
router.put('/:id', authMiddleware, updateWarehouse);

// Delete warehouse
router.delete('/:id', authMiddleware, deleteWarehouse);

module.exports = router;
