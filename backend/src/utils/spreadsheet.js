const ExcelJS = require('exceljs');
const { Readable } = require('stream');

/**
 * Tablo (xlsx/csv) okuma-yazma yardımcıları — exceljs tabanlı.
 * `xlsx` (SheetJS) paketinin yerini alır: npm'deki sürümünde yamalanmayacak
 * yüksek seviye açıklar var (prototype pollution + ReDoS).
 */

const XLSX_MAGIC = [0x50, 0x4b]; // "PK" — xlsx bir zip arşivi
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // eski ikili .xls (OLE)

const startsWith = (buffer, bytes) => bytes.every((b, i) => buffer[i] === b);

const detectFormat = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return 'empty';
  if (startsWith(buffer, XLSX_MAGIC)) return 'xlsx';
  if (startsWith(buffer, XLS_MAGIC)) return 'xls';
  return 'csv';
};

const pad2 = (n) => String(n).padStart(2, '0');

// Excel tarih hücreleri UTC gece yarısı olarak gelir → GG/AA/YYYY
const formatDate = (d) => `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

// Hücre değerini düz değere çevirir (formül sonucu, zengin metin, bağlantı, tarih)
const cellToValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'object') {
    if ('result' in value) return cellToValue(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return cellToValue(value.text);
    if ('error' in value) return '';
    return String(value);
  }
  return value;
};

const detectCsvDelimiter = (text) => {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
};

const loadWorksheet = async (buffer) => {
  const format = detectFormat(buffer);
  if (format === 'empty') throw new Error('Excel dosyası boş');
  if (format === 'xls') {
    throw new Error('Eski .xls biçimi desteklenmiyor. Dosyayı Excel\'de "Farklı Kaydet → .xlsx" ile kaydedip tekrar yükleyin.');
  }

  const workbook = new ExcelJS.Workbook();
  if (format === 'xlsx') {
    await workbook.xlsx.load(buffer);
  } else {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    await workbook.csv.read(Readable.from([text]), {
      // Değerleri metin olarak bırak: tarih/sayı dönüşümü çağıran tarafta yapılıyor
      map: (v) => v,
      parserOptions: { delimiter: detectCsvDelimiter(text) },
    });
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Excel dosyası boş');
  return worksheet;
};

/**
 * İlk sayfayı satır dizileri olarak döndürür (başlık dahil, boş hücreler '').
 * Eski `sheet_to_json(ws, { header: 1, defval: '' })` davranışının karşılığı.
 */
const readRows = async (buffer) => {
  const worksheet = await loadWorksheet(buffer);
  const width = worksheet.columnCount;
  const rows = [];
  for (let r = 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const values = [];
    for (let c = 1; c <= width; c++) values.push(cellToValue(row.getCell(c).value));
    rows.push(values);
  }
  return rows;
};

/**
 * İlk satırı başlık kabul edip her satırı { başlık: metin } nesnesine çevirir; tamamen
 * boş satırlar atlanır. Eski `sheet_to_json(ws, { raw: false })` davranışının karşılığı.
 */
const readObjects = async (buffer) => {
  const [header = [], ...body] = await readRows(buffer);
  const keys = header.map((h) => String(h).trim());
  return body
    .filter((row) => row.some((v) => v !== ''))
    .map((row) => {
      const obj = {};
      keys.forEach((key, i) => {
        if (key && row[i] !== '') obj[key] = String(row[i]);
      });
      return obj;
    });
};

/**
 * Nesne dizisinden tek sayfalık xlsx üretir.
 * @param {Object[]} rows - anahtarlar sütun başlığı olur
 * @param {string} sheetName
 * @param {number[]} [widths] - karakter cinsinden sütun genişlikleri
 * @returns {Promise<Buffer>}
 */
const buildXlsx = async (rows, sheetName, widths = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const keys = rows.length ? Object.keys(rows[0]) : [];
  worksheet.columns = keys.map((key, i) => ({ header: key, key, width: widths[i] || 15 }));
  worksheet.addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

module.exports = { detectFormat, readRows, readObjects, buildXlsx };
