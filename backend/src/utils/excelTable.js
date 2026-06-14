const ExcelJS = require('exceljs');

// Kurumsal Lacivert/Slate palet (PDF ile aynı) — ARGB
const XL = {
  accent: 'FF1E3A5F',  // lacivert (title + header)
  headerBg: 'FF1E3A5F',
  gray: 'FF64748B',
  light: 'FFF8FAFC',
  zebra: 'FFF1F5F9',
  border: 'FFE2E8F0',
};

/**
 * Ortak tablo Excel üreticisi — res'e yazar.
 * @param {object} res Express response
 * @param {object} opts
 *   - companyName, documentTitle, meta (string[]), columns (string[]), rows (any[][])
 *   - currencyColumns: string[] — ₺ numFmt uygulanacak kolon başlıkları
 *   - sheetName: çalışma sayfası adı
 */
const streamTableExcel = async (res, opts = {}) => {
  const {
    companyName = 'ERP SİSTEMİ',
    documentTitle = 'Rapor',
    meta = [],
    columns = [],
    rows = [],
    currencyColumns = [],
    sheetName = 'Rapor',
  } = opts;

  const colCount = columns.length || 1;
  const currencySet = new Set(currencyColumns);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP Sistemi';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || 'Rapor');

  // Title
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${String(companyName).toUpperCase()} — ${documentTitle}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.accent } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Meta
  sheet.mergeCells(2, 1, 2, colCount);
  const metaCell = sheet.getCell('A2');
  metaCell.value = meta.join('   |   ');
  metaCell.font = { italic: true, size: 9, color: { argb: XL.gray } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.light } };
  metaCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(2).height = 18;

  // Header (row 3)
  const headerRow = sheet.addRow(columns);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: XL.accent } } };
  });
  headerRow.height = 22;

  sheet.columns = columns.map((header) => ({ header, key: header, width: 22 }));

  // Data
  rows.forEach((row, idx) => {
    const dataRow = sheet.addRow(row);
    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : XL.zebra;
    dataRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        bottom: { style: 'hair', color: { argb: XL.border } },
        right: { style: 'hair', color: { argb: XL.border } },
      };
      cell.alignment = { vertical: 'middle' };
      if (typeof row[colNum - 1] === 'number' && currencySet.has(columns[colNum - 1])) {
        cell.numFmt = '#,##0.00 [$₺-tr-TR]';
      }
    });
    dataRow.height = 18;
  });

  sheet.views = [{ state: 'frozen', ySplit: 3 }];
  if (colCount > 0) {
    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: colCount } };
  }

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { streamTableExcel };
