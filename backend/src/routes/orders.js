const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission, logActivity } = require('../middleware/permissions');
const { validate, orderSchemas, querySchemas } = require('../utils/validators');
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
} = require('../controllers/orderController');

// All order endpoints require authentication and specific permissions
router.get('/', 
  authMiddleware, 
  requirePermission('orders.view'),
  validate(querySchemas.orderFilters, 'query'), 
  getAllOrders
);

router.get('/:id', 
  authMiddleware, 
  requirePermission('orders.view'),
  getOrderById
);

router.post('/', 
  authMiddleware, 
  requirePermission('orders.create'),
  validate(orderSchemas.create),
  logActivity('create_order', 'orders'),
  createOrder
);

router.put('/:id', 
  authMiddleware, 
  requirePermission('orders.edit'),
  validate(orderSchemas.update),
  logActivity('update_order', 'orders'),
  updateOrder
);

router.patch('/:id/status', 
  authMiddleware, 
  requirePermission('orders.complete'),
  validate(orderSchemas.updateStatus),
  logActivity('update_order_status', 'orders'),
  updateOrderStatus
);

router.post('/:id/cancel', 
  authMiddleware, 
  requirePermission('orders.cancel'),
  validate(orderSchemas.cancel),
  logActivity('cancel_order', 'orders'),
  cancelOrder
);

router.delete('/:id', 
  authMiddleware, 
  requirePermission('orders.delete'),
  logActivity('delete_order', 'orders'),
  deleteOrder
);

module.exports = router;

