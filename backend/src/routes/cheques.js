const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/fileUpload');
const { requirePermission, requireAnyPermission, logActivity } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const { createChequeSchema, updateChequeStatusSchema } = require('../validators/chequeValidator');

// Controllers
const {
  getAllCheques,
  getChequeById,
  createCheque,
  updateCheque,
  changeChequeStatus,
  deleteCheque,
  getDueSoonCheques,
  getChequeStatistics
} = require('../controllers/chequeController');

const {
  validateChequeImport,
  importCheques,
  exportChequesToExcel,
  downloadTemplate
} = require('../controllers/chequeImportController');

/**
 * @swagger
 * tags:
 *   - name: Cheques
 *     description: Çek yönetimi endpointleri
 */

// All routes require authentication
router.use(auth);

// Statistics and summary routes
router.get('/statistics', requirePermission('cheques.view'), getChequeStatistics);

/**
 * @swagger
 * /api/cheques/overdue:
 *   get:
 *     summary: Vadesi geçen/yaklaşan çekler
 *     tags: [Cheques]
 *     security:
 *       - bearerAuth: []
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
router.get('/due-soon', requirePermission('cheques.view'), getDueSoonCheques);

// Import/Export routes
router.get('/import/template', requirePermission('cheques.view'), downloadTemplate);
router.post('/import/validate', requirePermission('cheques.create'), upload.single('file'), handleUploadError, validateChequeImport);
router.post('/import', requirePermission('cheques.create'), upload.single('file'), handleUploadError, importCheques);
router.get('/export/excel', requirePermission('cheques.view'), exportChequesToExcel);

// CRUD routes
/**
 * @swagger
 * /api/cheques:
 *   get:
 *     summary: Çek listesi
 *     tags: [Cheques]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
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
router.get('/', requirePermission('cheques.view'), getAllCheques);

/**
 * @swagger
 * /api/cheques/{id}:
 *   get:
 *     summary: Tekil çek getir
 *     tags: [Cheques]
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
 *         description: Çek bulunamadı
 */
router.get('/:id', requirePermission('cheques.view'), getChequeById);

/**
 * @swagger
 * /api/cheques:
 *   post:
 *     summary: Yeni çek oluştur
 *     tags: [Cheques]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cheque_number, amount]
 *             properties:
 *               cheque_number:
 *                 type: string
 *               amount:
 *                 type: number
 *               due_date:
 *                 type: string
 *                 format: date
 *               status:
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
router.post('/', requirePermission('cheques.create'), validate(createChequeSchema), logActivity('create_cheque', 'cheques'), createCheque);
router.put('/:id', requirePermission('cheques.edit'), logActivity('update_cheque', 'cheques'), updateCheque);
router.put('/:id/status', requireAnyPermission(['cheques.change_status', 'cheques.edit']), validate(updateChequeStatusSchema), logActivity('change_cheque_status', 'cheques'), changeChequeStatus);

/**
 * @swagger
 * /api/cheques/{id}/status:
 *   patch:
 *     summary: Çek durumu güncelle
 *     tags: [Cheques]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Başarılı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz
 *       404:
 *         description: Çek bulunamadı
 */
router.patch('/:id/status', requireAnyPermission(['cheques.change_status', 'cheques.edit']), validate(updateChequeStatusSchema), logActivity('change_cheque_status', 'cheques'), changeChequeStatus);
router.delete('/:id', requirePermission('cheques.delete'), logActivity('delete_cheque', 'cheques'), deleteCheque);

module.exports = router;
