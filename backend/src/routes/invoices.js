const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../middleware/permissions');
const {
  getAllInvoices, getInvoiceById, getInvoiceStats,
  createInvoice, updateInvoice, deleteInvoice,
} = require('../controllers/invoiceController');

/**
 * @openapi
 * /api/invoices/stats:
 *   get:
 *     tags: [Invoices]
 *     summary: Fatura istatistikleri (toplam, ödenen, bekleyen)
 *     responses:
 *       200:
 *         description: İstatistik özeti
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/stats', authMiddleware, getInvoiceStats);

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: Faturaları listele
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue, cancelled]
 *       - in: query
 *         name: customer_id
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Fatura listesi
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 *   post:
 *     tags: [Invoices]
 *     summary: Yeni fatura oluştur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customer_id:  { type: integer }
 *               order_id:     { type: integer }
 *               tax_rate:     { type: number, default: 20, description: 'KDV %' }
 *               discount_amount: { type: number, default: 0 }
 *               issue_date:   { type: string, format: date }
 *               due_date:     { type: string, format: date }
 *               notes:        { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [description, quantity, unit_price]
 *                   properties:
 *                     product_id:  { type: integer }
 *                     description: { type: string }
 *                     quantity:    { type: number }
 *                     unit_price:  { type: number }
 *     responses:
 *       201:
 *         description: Fatura oluşturuldu
 */
router.get('/',  authMiddleware, getAllInvoices);
router.post('/', authMiddleware, logActivity('create_invoice', 'invoices'), createInvoice);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Tekil fatura + kalemleri
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fatura detayı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   put:
 *     tags: [Invoices]
 *     summary: Fatura güncelle (durum değişikliği dahil)
 *     description: >
 *       status alanını değiştirerek faturayu ödendi/gönderildi olarak işaretle.
 *       Geçerli durumlar: draft → sent → paid | cancelled
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Invoice' }
 *     responses:
 *       200:
 *         description: Güncellendi
 *   delete:
 *     tags: [Invoices]
 *     summary: Fatura sil
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Silindi
 */
router.get('/:id',    authMiddleware, getInvoiceById);
router.put('/:id',    authMiddleware, logActivity('update_invoice', 'invoices'), updateInvoice);
router.delete('/:id', authMiddleware, logActivity('delete_invoice', 'invoices'), deleteInvoice);

module.exports = router;

