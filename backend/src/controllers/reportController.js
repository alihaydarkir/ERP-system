const reportService = require('../services/reportService');
const { formatSuccess, formatError } = require('../utils/formatters');

/**
 * Get daily report
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY
    const reportDate = date ? new Date(date) : new Date();

    const report = await reportService.getDailyReport(reportDate, company_id);

    if (!report.success) {
      throw new Error(report.error || 'Failed to generate daily report');
    }

    res.json(formatSuccess(report.report, 'Daily report generated'));

  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json(formatError('Failed to generate daily report'));
  }
};

/**
 * Get weekly report
 */
const getWeeklyReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    // Default to current week if not provided
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date
      ? new Date(start_date)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const report = await reportService.getSalesReport(startDate, endDate, company_id);

    if (!report.success) {
      throw new Error(report.error || 'Failed to generate weekly report');
    }

    res.json(formatSuccess({
      period: 'weekly',
      start_date: startDate,
      end_date: endDate,
      ...report
    }, 'Weekly report generated'));

  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json(formatError('Failed to generate weekly report'));
  }
};

/**
 * Get monthly report
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    const report = await reportService.getMonthlyReport(reportYear, reportMonth, company_id);

    if (!report.success) {
      throw new Error(report.error || 'Failed to generate monthly report');
    }

    res.json(formatSuccess({
      period: 'monthly',
      year: reportYear,
      month: reportMonth,
      ...report
    }, 'Monthly report generated'));

  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json(formatError('Failed to generate monthly report'));
  }
};

/**
 * Export report
 */
const exportReport = async (req, res) => {
  try {
    const { type = 'sales', format = 'json', start_date, end_date } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    let reportData;

    switch (type) {
      case 'sales':
        reportData = await reportService.getSalesReport(
          new Date(start_date),
          new Date(end_date),
          company_id
        );
        break;

      case 'inventory':
        reportData = await reportService.getInventoryReport(company_id);
        break;

      case 'low-stock':
        reportData = await reportService.getLowStockReport(10, company_id);
        break;

      case 'top-products':
        reportData = await reportService.getTopSellingProducts(10, {
          start_date,
          end_date,
          company_id
        });
        break;

      default:
        return res.status(400).json(formatError('Invalid report type'));
    }

    if (!reportData.success) {
      throw new Error(reportData.error || 'Failed to generate report');
    }

    // For now, only JSON export
    // TODO: Add CSV, Excel, PDF export formats
    if (format === 'json') {
      res.json(formatSuccess(reportData, 'Report exported'));
    } else {
      res.status(400).json(formatError('Export format not supported yet'));
    }

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json(formatError('Failed to export report'));
  }
};

/**
 * Get dashboard statistics (legacy simple version)
 */
const getDashboardStats = async (req, res) => {
  try {
    const { company_id } = req.user; // MULTI-TENANCY
    const stats = await reportService.getDashboardStats(company_id);

    if (!stats.success) {
      throw new Error(stats.error || 'Failed to get dashboard stats');
    }

    res.json(formatSuccess(stats.stats));

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(formatError('Failed to get dashboard statistics'));
  }
};

/**
 * ⚡ GET /api/reports/summary — Tek çağrıyla tüm dashboard verisi
 */
const getDashboardSummary = async (req, res) => {
  try {
    const { company_id } = req.user;
    const result = await reportService.getDashboardSummary(company_id);

    if (!result.success) {
      throw new Error(result.error || 'Failed to get dashboard summary');
    }

    res.json(formatSuccess(result.summary, 'Dashboard summary loaded'));
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json(formatError('Dashboard özeti yüklenemedi'));
  }
};

/**
 * Get inventory report
 */
const getInventoryReport = async (req, res) => {
  try {
    const { company_id } = req.user; // MULTI-TENANCY
    const report = await reportService.getInventoryReport(company_id);

    if (!report.success) {
      throw new Error(report.error || 'Failed to generate inventory report');
    }

    res.json(formatSuccess(report));

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json(formatError('Failed to generate inventory report'));
  }
};

/**
 * Get top selling products
 */
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, start_date, end_date } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    const report = await reportService.getTopSellingProducts(parseInt(limit), {
      start_date,
      end_date,
      company_id
    });

    if (!report.success) {
      throw new Error(report.error || 'Failed to get top products');
    }

    res.json(formatSuccess(report));

  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json(formatError('Failed to get top products'));
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  exportReport,
  getDashboardStats,
  getDashboardSummary,
  getInventoryReport,
  getTopProducts
};
