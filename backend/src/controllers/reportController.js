const reportService = require('../services/reportService');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');
const { formatSuccess, formatError } = require('../utils/formatters');

const REPORT_TYPES = new Set(['sales', 'inventory', 'financial']);

const buildDateRange = (startDate, endDate) => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: startDate ? new Date(startDate) : defaultStart,
    end: endDate ? new Date(endDate) : now
  };
};

const validateReportType = (type) => REPORT_TYPES.has(String(type || '').toLowerCase());

const fetchReportRows = async ({ type, startDate, endDate, company_id }) => {
  const range = buildDateRange(startDate, endDate);
  const normalizedType = String(type || '').toLowerCase();

  if (normalizedType === 'sales') {
    const { rows } = await pool.query(
      `SELECT
         o.id,
         COALESCE(c.company_name, c.full_name, '-') AS customer,
         o.total_amount,
         o.created_at,
         o.status
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.company_id = $1
         AND o.created_at >= $2
         AND o.created_at <= $3
       ORDER BY o.created_at DESC`,
      [company_id, range.start, range.end]
    );

    return {
      type: normalizedType,
      range,
      columns: ['ID', 'Müşteri', 'Tutar', 'Tarih', 'Durum'],
      rows: rows.map((row) => [
        row.id,
        row.customer,
        Number(row.total_amount || 0),
        row.created_at ? new Date(row.created_at).toLocaleDateString('tr-TR') : '-',
        row.status || '-'
      ])
    };
  }

  if (normalizedType === 'inventory') {
    const { rows } = await pool.query(
      `SELECT
         p.sku,
         p.name,
         p.stock_quantity,
         p.price,
         p.category
       FROM products p
       WHERE p.company_id = $1
       ORDER BY p.name ASC`,
      [company_id]
    );

    return {
      type: normalizedType,
      range,
      columns: ['SKU', 'İsim', 'Stok', 'Fiyat', 'Kategori'],
      rows: rows.map((row) => [
        row.sku || '-',
        row.name || '-',
        Number(row.stock_quantity || 0),
        Number(row.price || 0),
        row.category || '-'
      ])
    };
  }

  const { rows } = await pool.query(
    `SELECT
       i.id,
       COALESCE(c.company_name, c.full_name, '-') AS customer,
       i.total_amount,
       i.status,
       i.issue_date
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id = $1
       AND i.issue_date >= $2::date
       AND i.issue_date <= $3::date
     ORDER BY i.issue_date DESC`,
    [company_id, range.start, range.end]
  );

  return {
    type: normalizedType,
    range,
    columns: ['ID', 'Müşteri', 'Tutar', 'Durum', 'Tarih'],
    rows: rows.map((row) => [
      row.id,
      row.customer,
      Number(row.total_amount || 0),
      row.status || '-',
      row.issue_date ? new Date(row.issue_date).toLocaleDateString('tr-TR') : '-'
    ])
  };
};

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

/**
 * Export report as Excel
 */
const exportReportExcel = async (req, res) => {
  try {
    const { type = 'sales', startDate, endDate } = req.query;
    const { company_id } = req.user;

    if (!validateReportType(type)) {
      return res.status(400).json(formatError('Geçersiz rapor tipi. sales/inventory/financial kullanılabilir.'));
    }

    const dataset = await fetchReportRows({ type, startDate, endDate, company_id });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rapor');

    sheet.columns = dataset.columns.map((header) => ({ header, key: header, width: 22 }));
    dataset.rows.forEach((row) => sheet.addRow(row));

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rapor.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Export report excel error:', error);
    return res.status(500).json(formatError('Excel raporu oluşturulamadı'));
  }
};

/**
 * Export report as PDF
 */
const exportReportPDF = async (req, res) => {
  try {
    const { type = 'sales', startDate, endDate } = req.query;
    const { company_id } = req.user;

    if (!validateReportType(type)) {
      return res.status(400).json(formatError('Geçersiz rapor tipi. sales/inventory/financial kullanılabilir.'));
    }

    const dataset = await fetchReportRows({ type, startDate, endDate, company_id });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapor.pdf');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).text('ERP Raporu', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Rapor Tipi: ${dataset.type}`);
    doc.text(`Tarih Aralığı: ${dataset.range.start.toLocaleDateString('tr-TR')} - ${dataset.range.end.toLocaleDateString('tr-TR')}`);
    doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`);
    doc.moveDown();

    doc.fontSize(10).text(dataset.columns.join(' | '));
    doc.moveDown(0.4);

    dataset.rows.forEach((row) => {
      const line = row.map((cell) => String(cell ?? '-')).join(' | ');
      if (doc.y > 760) {
        doc.addPage();
      }
      doc.fontSize(9).text(line);
    });

    doc.end();
  } catch (error) {
    console.error('Export report pdf error:', error);
    return res.status(500).json(formatError('PDF raporu oluşturulamadı'));
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  exportReport,
  exportReportExcel,
  exportReportPDF,
  getDashboardStats,
  getDashboardSummary,
  getInventoryReport,
  getTopProducts
};
