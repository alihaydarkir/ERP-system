const { streamTablePdf } = require('../utils/pdfTable');
const { streamTableExcel } = require('../utils/excelTable');
const { formatError } = require('../utils/formatters');

const MAX_ROWS = 5000;

// Frontend'den gelen ortak export payload'unu doğrula + normalize et
const parsePayload = (body) => {
  const {
    companyName, documentTitle, meta, columns, rows,
    currencyColumns, rowStyles, footer, orientation, sheetName,
  } = body || {};

  if (!Array.isArray(columns) || columns.length === 0) {
    return { error: 'columns (kolon başlıkları) zorunlu' };
  }
  if (!Array.isArray(rows)) {
    return { error: 'rows (satırlar) bir dizi olmalı' };
  }
  if (rows.length > MAX_ROWS) {
    return { error: `En fazla ${MAX_ROWS} satır export edilebilir` };
  }

  return {
    value: {
      companyName: typeof companyName === 'string' && companyName.trim() ? companyName : 'ERP SİSTEMİ',
      documentTitle: typeof documentTitle === 'string' ? documentTitle : 'Rapor',
      meta: Array.isArray(meta) ? meta.map(String) : [],
      columns: columns.map(String),
      rows: rows.map((r) => (Array.isArray(r) ? r : [r])),
      currencyColumns: Array.isArray(currencyColumns) ? currencyColumns.map(String) : [],
      rowStyles: rowStyles && typeof rowStyles === 'object' ? rowStyles : {},
      footer: Array.isArray(footer) ? footer : null,
      orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
      sheetName: typeof sheetName === 'string' ? sheetName : 'Rapor',
    },
  };
};

const sanitizeFilename = (name) =>
  String(name || 'rapor').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

/** POST /api/export/pdf */
const exportPdf = (req, res) => {
  try {
    const { value, error } = parsePayload(req.body);
    if (error) return res.status(400).json(formatError(error));

    const filename = sanitizeFilename(req.body.filename || value.documentTitle);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    streamTablePdf(res, value);
  } catch (err) {
    console.error('Export PDF error:', err);
    if (!res.headersSent) res.status(500).json(formatError('PDF oluşturulamadı'));
  }
};

/** POST /api/export/excel */
const exportExcel = async (req, res) => {
  try {
    const { value, error } = parsePayload(req.body);
    if (error) return res.status(400).json(formatError(error));

    const filename = sanitizeFilename(req.body.filename || value.documentTitle);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    await streamTableExcel(res, value);
  } catch (err) {
    console.error('Export Excel error:', err);
    if (!res.headersSent) res.status(500).json(formatError('Excel oluşturulamadı'));
  }
};

module.exports = { exportPdf, exportExcel };
