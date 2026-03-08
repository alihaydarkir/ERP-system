const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getDailyReport, getWeeklyReport, getMonthlyReport,
  exportReport, getDashboardStats, getDashboardSummary,
  getInventoryReport, getTopProducts,
} = require('../controllers/reportController');

/**
 * @openapi
 * /api/reports/summary:
 *   get:
 *     tags: [Reports]
 *     summary: ⚡ Dashboard özeti — tek çağrıda tüm KPI verisi
 *     description: >
 *       AI agent'lar için optimize edilmiş tek endpoint.
 *       6 paralel PostgreSQL sorgusu ile döner.
 *       İçerir: kpi, lowStockProducts, recentOrders,
 *       topProducts, weeklyChart (7 gün), monthlyTrend (6 ay)
 *     responses:
 *       200:
 *         description: Dashboard özeti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     kpi:
 *                       type: object
 *                       properties:
 *                         totalProducts:       { type: integer }
 *                         totalCustomers:      { type: integer }
 *                         totalOrders:         { type: integer }
 *                         pendingOrders:       { type: integer }
 *                         completedOrders:     { type: integer }
 *                         totalRevenue:        { type: number }
 *                         monthlyRevenue:      { type: number }
 *                         revenueChangePercent:
 *                           type: number
 *                           description: Onceki aya gore yuzde degisim
 *                         lowStockCount:       { type: integer }
 *                         outstandingInvoices: { type: integer }
 *                     lowStockProducts: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *                     recentOrders:     { type: array, items: { $ref: '#/components/schemas/Order' } }
 *                     topProducts:      { type: array }
 *                     weeklyChart:      { type: array, description: 'Son 7 gün: {date, label, orders, revenue}' }
 *                     monthlyTrend:     { type: array, description: 'Son 6 ay: {label, orders, revenue}' }
 *                     generatedAt:      { type: string, format: date-time }
 */
router.get('/summary',      authMiddleware, getDashboardSummary);

/**
 * @openapi
 * /api/reports/top-products:
 *   get:
 *     tags: [Reports]
 *     summary: En çok satan ürünler
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Satış sıralaması
 */
router.get('/top-products', authMiddleware, getTopProducts);

router.get('/daily',     authMiddleware, getDailyReport);
router.get('/weekly',    authMiddleware, getWeeklyReport);
router.get('/monthly',   authMiddleware, getMonthlyReport);
router.get('/export',    authMiddleware, exportReport);
router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/inventory', authMiddleware, getInventoryReport);

module.exports = router;


