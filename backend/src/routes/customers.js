const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
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

/**
 * @swagger
 * tags:
 *   - name: Customers
 *     description: Müşteri yönetimi endpointleri
 */

// Customer import endpoints
router.post('/import/validate', authMiddleware, requirePermission('customers.import'), upload.single('file'), handleUploadError, validateCustomerImport);
router.post('/import/process', authMiddleware, requirePermission('customers.import'), processCustomerImport);

// All customer endpoints require authentication
/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Müşteri listesi
 *     tags: [Customers]
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
router.get('/', authMiddleware, requirePermission('customers.view'), validate(querySchemas.customerFilters, 'query'), getAllCustomers);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Tekil müşteri getir
 *     tags: [Customers]
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
 *         description: Müşteri bulunamadı
 */
router.get('/:id', authMiddleware, requirePermission('customers.view'), getCustomerById);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Yeni müşteri oluştur
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name]
 *             properties:
 *               company_name:
 *                 type: string
 *               contact_name:
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
router.post('/', authMiddleware, requirePermission('customers.create'), validate(customerSchemas.create), createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Müşteri güncelle
 *     tags: [Customers]
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
 *         description: Müşteri bulunamadı
 */
router.put('/:id', authMiddleware, requirePermission('customers.edit'), validate(customerSchemas.update), updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Müşteri sil
 *     tags: [Customers]
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
 *         description: Müşteri bulunamadı
 */
router.delete('/:id', authMiddleware, requirePermission('customers.delete'), deleteCustomer);

module.exports = router;
