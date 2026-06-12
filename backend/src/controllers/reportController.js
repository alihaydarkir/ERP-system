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

    // Tarih parametreleri yoksa son 30 günü varsayılan al
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const startDate = start_date ? new Date(start_date) : thirtyDaysAgo;
    const endDate   = end_date   ? new Date(end_date)   : now;

    let reportData;

    switch (type) {
      case 'sales':
        reportData = await reportService.getSalesReport(startDate, endDate, company_id);
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
    workbook.creator = 'ERP Sistemi';
    workbook.created = new Date();

    const typeLabels = { sales: 'Satış Raporu', inventory: 'Envanter Raporu', financial: 'Finansal Rapor' };
    const sheet = workbook.addWorksheet(typeLabels[dataset.type] || 'Rapor');

    // Title row
    sheet.mergeCells(1, 1, 1, dataset.columns.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = `ERP SİSTEMİ — ${(typeLabels[dataset.type] || 'Rapor').toUpperCase()}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // Meta row
    sheet.mergeCells(2, 1, 2, dataset.columns.length);
    const metaCell = sheet.getCell('A2');
    metaCell.value = `Tarih Aralığı: ${dataset.range.start.toLocaleDateString('tr-TR')} — ${dataset.range.end.toLocaleDateString('tr-TR')}   |   Toplam Kayıt: ${dataset.rows.length}   |   Oluşturulma: ${new Date().toLocaleString('tr-TR')}`;
    metaCell.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    metaCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    // Header row (row 3)
    const headerRow = sheet.addRow(dataset.columns);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF7C3AED' } } };
    });
    headerRow.height = 22;

    // Set column widths
    sheet.columns = dataset.columns.map((header) => ({ header, key: header, width: 22 }));

    // Data rows
    dataset.rows.forEach((row, idx) => {
      const dataRow = sheet.addRow(row);
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      dataRow.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          right: { style: 'hair', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
        // Format currency columns
        if (typeof row[colNum - 1] === 'number' && (dataset.columns[colNum - 1] === 'Tutar' || dataset.columns[colNum - 1] === 'Fiyat')) {
          cell.numFmt = '#,##0.00 [$₺-tr-TR]';
        }
      });
      dataRow.height = 18;
    });

    // Freeze header rows
    sheet.views = [{ state: 'frozen', ySplit: 3 }];

    // Auto filter on header
    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: dataset.columns.length } };

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
 * Export report as PDF — professional table layout
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
    res.setHeader('Content-Disposition', `attachment; filename=erp-rapor-${type}-${Date.now()}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    doc.pipe(res);

    const ACCENT = '#7c3aed';   // violet-600
    const GRAY   = '#64748b';
    const LIGHT  = '#f8fafc';
    const BORDER = '#e2e8f0';

    const PAGE_W = doc.page.width;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 80).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('ERP SİSTEMİ', MARGIN, 22, { align: 'left' });

    const typeLabels = { sales: 'Satış Raporu', inventory: 'Envanter Raporu', financial: 'Finansal Rapor' };
    doc.fontSize(11).font('Helvetica')
      .text(typeLabels[dataset.type] || 'Rapor', MARGIN, 46, { align: 'left' });

    const now = new Date().toLocaleString('tr-TR');
    doc.fontSize(9).text(now, 0, 58, { align: 'right', width: PAGE_W - MARGIN });

    doc.fillColor('#000000');

    // ── Meta info box ─────────────────────────────────────────────────────────
    let y = 100;
    doc.rect(MARGIN, y, CONTENT_W, 36).fillAndStroke(LIGHT, BORDER);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(`Tarih Aralığı: ${dataset.range.start.toLocaleDateString('tr-TR')} — ${dataset.range.end.toLocaleDateString('tr-TR')}`, MARGIN + 10, y + 7)
      .text(`Toplam Kayıt: ${dataset.rows.length}`, MARGIN + 10, y + 20);
    y += 50;

    // ── Table header ──────────────────────────────────────────────────────────
    const colCount = dataset.columns.length;
    const colW = CONTENT_W / colCount;

    doc.rect(MARGIN, y, CONTENT_W, 22).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    dataset.columns.forEach((col, i) => {
      doc.text(String(col), MARGIN + i * colW + 4, y + 7, { width: colW - 8, ellipsis: true });
    });
    y += 22;

    // ── Table rows ────────────────────────────────────────────────────────────
    doc.fillColor('#000000').font('Helvetica').fontSize(8);
    dataset.rows.forEach((row, rowIdx) => {
      if (y > doc.page.height - 70) {
        doc.addPage();
        y = MARGIN;
        // Repeat header on new page
        doc.rect(MARGIN, y, CONTENT_W, 22).fill(ACCENT);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        dataset.columns.forEach((col, i) => {
          doc.text(String(col), MARGIN + i * colW + 4, y + 7, { width: colW - 8, ellipsis: true });
        });
        y += 22;
        doc.fillColor('#000000').font('Helvetica').fontSize(8);
      }

      const rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(MARGIN, y, CONTENT_W, 18).fillAndStroke(rowBg, BORDER);
      row.forEach((cell, i) => {
        const cellStr = typeof cell === 'number' && dataset.columns[i] === 'Tutar'
          ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(cell)
          : String(cell ?? '-');
        doc.fillColor('#334155').text(cellStr, MARGIN + i * colW + 4, y + 5, { width: colW - 8, ellipsis: true });
      });
      y += 18;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 30, PAGE_W, 30).fill(LIGHT);
      doc.fillColor(GRAY).fontSize(8)
        .text(`ERP Sistemi — Gizli`, MARGIN, doc.page.height - 18, { align: 'left' })
        .text(`Sayfa ${i + 1} / ${range.count}`, 0, doc.page.height - 18, { align: 'right', width: PAGE_W - MARGIN });
    }

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
