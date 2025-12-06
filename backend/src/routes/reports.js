const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  exportReport,
  getDashboardStats,
  getInventoryReport,
  getTopProducts
} = require('../controllers/reportController');

// All report endpoints require authentication
router.get('/daily', authMiddleware, getDailyReport);
router.get('/weekly', authMiddleware, getWeeklyReport);
router.get('/monthly', authMiddleware, getMonthlyReport);
router.get('/export', authMiddleware, exportReport);
router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/inventory', authMiddleware, getInventoryReport);
router.get('/top-products', authMiddleware, getTopProducts);

module.exports = router;

