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
 * @swagger
 * tags:
 *   - name: Suppliers
 *     description: Tedarikçi yönetimi endpointleri
 */

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
/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Tedarikçi listesi
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
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
/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Tekil tedarikçi getir
 *     tags: [Suppliers]
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
 *         description: Tedarikçi bulunamadı
 */
router.get('/:id', authMiddleware, requirePermission('suppliers.view'), getSupplierById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Yeni tedarikçi oluştur
 *     tags: [Suppliers]
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
 *               contact_person:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
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
/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     summary: Tedarikçi güncelle
 *     tags: [Suppliers]
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
 *         description: Tedarikçi bulunamadı
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
/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Tedarikçi sil
 *     tags: [Suppliers]
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
 *         description: Tedarikçi bulunamadı
 */
router.delete('/:id', authMiddleware, requirePermission('suppliers.delete'), deleteSupplier);

module.exports = router;
