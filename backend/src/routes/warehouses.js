const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const { warehouseSchemas } = require('../validators/warehouseValidators');
const { createWarehouseSchema, updateWarehouseSchema } = require('../validators/warehouseValidator');
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

/**
 * @swagger
 * tags:
 *   - name: Warehouses
 *     description: Depo yönetimi endpointleri
 */

// Get all warehouses
/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Depo listesi
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Kayıt bulunamadı
 */
router.get('/', authMiddleware, requirePermission('warehouses.view'), validate(warehouseSchemas.query, 'query'), getAllWarehouses);

// Get warehouse by ID
/**
 * @swagger
 * /api/warehouses/{id}:
 *   get:
 *     summary: Tekil depo getir
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Depo bulunamadı
 */
router.get('/:id', authMiddleware, requirePermission('warehouses.view'), getWarehouseById);

// Get warehouse stock
router.get('/:id/stock', authMiddleware, requirePermission('warehouses.view'), getWarehouseStock);

// Create new warehouse
/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Yeni depo oluştur
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Kayıt bulunamadı
 */
router.post('/', authMiddleware, requirePermission('warehouses.create'), validate(createWarehouseSchema), createWarehouse);

// Update warehouse stock (increment/decrement)
router.post('/:id/stock/update', authMiddleware, requirePermission('warehouses.edit'), updateWarehouseStock);

// Set warehouse stock (absolute value)
router.post('/:id/stock/set', authMiddleware, requirePermission('warehouses.edit'), setWarehouseStock);

// Update warehouse
/**
 * @swagger
 * /api/warehouses/{id}:
 *   put:
 *     summary: Depo güncelle
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Depo bulunamadı
 */
router.put('/:id', authMiddleware, requirePermission('warehouses.edit'), validate(updateWarehouseSchema), updateWarehouse);

// Delete warehouse
/**
 * @swagger
 * /api/warehouses/{id}:
 *   delete:
 *     summary: Depo sil
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Depo bulunamadı
 */
router.delete('/:id', authMiddleware, requirePermission('warehouses.delete'), deleteWarehouse);

module.exports = router;
