const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAccountList,
  getAccountSummary,
  getAccountDetail,
  getTransactions,
} = require('../controllers/currentAccountController');

/**
 * @openapi
 * /api/current-accounts/summary:
 *   get:
 *     tags: [CurrentAccounts]
 *     summary: Genel cari hesap özeti
 *     description: >
 *       Tüm müşterilerin toplam alacak, ödenen ve açık bakiye özeti.
 *       AI agent için: toplam alacak durumunu öğrenmek için kullan.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Özet başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_customers:        { type: integer }
 *                     customers_with_balance: { type: integer }
 *                     total_outstanding:      { type: number }
 *                     total_invoiced:         { type: number }
 *                     total_paid:             { type: number }
 */
router.get('/summary', authMiddleware, getAccountSummary);

/**
 * @openapi
 * /api/current-accounts:
 *   get:
 *     tags: [CurrentAccounts]
 *     summary: Müşteri cari hesap listesi
 *     description: >
 *       Her müşteri için toplam satış, fatura, ödenen tutar ve açık bakiye.
 *       AI agent için: hangi müşterilerin borcu var öğrenmek için kullan.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Müşteri adı veya firma adı ile ara
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Cari hesap listesi
 */
router.get('/', authMiddleware, getAccountList);

/**
 * @openapi
 * /api/current-accounts/{customerId}:
 *   get:
 *     tags: [CurrentAccounts]
 *     summary: Tek müşteri cari hesap detayı
 *     description: >
 *       Bir müşterinin detaylı bakiye bilgisi: sipariş özeti, fatura özeti, açık bakiye.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detay başarılı
 *       404:
 *         description: Müşteri bulunamadı
 */
router.get('/:customerId', authMiddleware, getAccountDetail);

/**
 * @openapi
 * /api/current-accounts/{customerId}/transactions:
 *   get:
 *     tags: [CurrentAccounts]
 *     summary: Müşteri hareket geçmişi
 *     description: >
 *       Sipariş ve fatura hareketlerini birleşik olarak listeler.
 *       type=order veya type=invoice ile filtrelenebilir.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [order, invoice] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Hareketler listesi
 */
router.get('/:customerId/transactions', authMiddleware, getTransactions);

module.exports = router;
