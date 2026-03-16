const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission, requireAnyPermission, logActivity } = require('../middleware/permissions');
const { validate, orderSchemas, querySchemas } = require('../utils/validators');
const {
  getAllOrders, getOrderById, createOrder, updateOrder,
  updateOrderStatus, cancelOrder, deleteOrder,
} = require('../controllers/orderController');


/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Siparışleri listele
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending,confirmed,processing,shipped,delivered,completed,cancelled]
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Siparış listesi
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 */
router.get('/', authMiddleware, requirePermission('orders.view'),
  validate(querySchemas.orderFilters, 'query'), getAllOrders);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Tekil siparış + kalemleri
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Siparış detayı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/:id', authMiddleware, requirePermission('orders.view'), getOrderById);

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Yeni siparış oluştur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customer_id: { type: integer }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product_id, quantity]
 *                   properties:
 *                     product_id: { type: integer }
 *                     quantity:   { type: integer }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Siparış oluşturuldu
 */
router.post('/', authMiddleware, requirePermission('orders.create'),
  validate(orderSchemas.create), logActivity('create_order', 'orders'), createOrder);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Siparış durumunu güncelle
 *     description: >
 *       Geçerli geçişler:
 *       pending → confirmed | cancelled
 *       confirmed → processing | cancelled
 *       processing → shipped
 *       shipped → delivered
 *       delivered → completed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed,processing,shipped,delivered,completed,cancelled]
 *     responses:
 *       200:
 *         description: Durum güncellendi
 *       400:
 *         description: Geçersiz durum geçişi
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch('/:id/status', authMiddleware, requireAnyPermission(['orders.complete', 'orders.edit']),
  validate(orderSchemas.updateStatus), logActivity('update_order_status', 'orders'), updateOrderStatus);

router.put('/:id', authMiddleware, requirePermission('orders.edit'),
  validate(orderSchemas.update), logActivity('update_order', 'orders'), updateOrder);
router.post('/:id/cancel', authMiddleware, requireAnyPermission(['orders.cancel', 'orders.edit']),
  validate(orderSchemas.cancel), logActivity('cancel_order', 'orders'), cancelOrder);
router.delete('/:id', authMiddleware, requirePermission('orders.delete'),
  logActivity('delete_order', 'orders'), deleteOrder);

module.exports = router;

