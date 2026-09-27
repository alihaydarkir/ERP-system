const ExcelJS = require('exceljs');
const { detectFormat, readRows, readObjects, buildXlsx } = require('./spreadsheet');
const ExcelService = require('../services/excelService');

const makeXlsx = async (rows) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sayfa1');
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
};

describe('spreadsheet', () => {
  test('dosya biçimini ilk baytlardan tanır', async () => {
    expect(detectFormat(await makeXlsx([['a']]))).toBe('xlsx');
    expect(detectFormat(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).toBe('xls');
    expect(detectFormat(Buffer.from('a,b\n1,2'))).toBe('csv');
    expect(detectFormat(Buffer.alloc(0))).toBe('empty');
  });

  test('xlsx satırlarını boş hücreleri doldurarak okur; tarih ve formül sonucunu düzleştirir', async () => {
    const buf = await makeXlsx([
      ['Ad', 'Tarih', 'Tutar', 'Not'],
      ['Çek 1', new Date(Date.UTC(2026, 0, 15)), { formula: '1+1', result: 2 }],
    ]);
    const rows = await readRows(buf);
    expect(rows).toEqual([
      ['Ad', 'Tarih', 'Tutar', 'Not'],
      ['Çek 1', '15/01/2026', 2, ''],
    ]);
  });

  test('readObjects başlıkları anahtar yapar, değerleri metne çevirir, boş satırları atlar', async () => {
    const buf = await makeXlsx([
      ['Seri No', 'Tutar', 'Vade Tarihi'],
      ['123', 50000, new Date(Date.UTC(2026, 11, 5))],
      [],
      ['456', 1200.5],
    ]);
    expect(await readObjects(buf)).toEqual([
      { 'Seri No': '123', Tutar: '50000', 'Vade Tarihi': '05/12/2026' },
      { 'Seri No': '456', Tutar: '1200.5' },
    ]);
  });

  test("Türkçe Excel'in noktalı virgüllü CSV'sini okur, değerleri metin bırakır", async () => {
    const csv = Buffer.from('﻿Seri No;Vade Tarihi;Tutar\n123;05/11/2025;50000\n', 'utf8');
    expect(await readObjects(csv)).toEqual([{ 'Seri No': '123', 'Vade Tarihi': '05/11/2025', Tutar: '50000' }]);
  });

  test('eski .xls için anlaşılır hata verir', async () => {
    await expect(readRows(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).rejects.toThrow('.xls biçimi desteklenmiyor');
  });

  test('buildXlsx yazdığı dosya geri okunabilir', async () => {
    const buf = await buildXlsx([{ 'Seri No': 'A1', Tutar: 10 }, { 'Seri No': 'A2', Tutar: 20 }], 'Çekler', [15, 12]);
    expect(await readRows(buf)).toEqual([['Seri No', 'Tutar'], ['A1', 10], ['A2', 20]]);
  });

  test('ExcelService.parseExcelFile ürün şablonunu ayrıştırır', async () => {
    const buf = await makeXlsx([
      ExcelService.EXPECTED_HEADERS,
      ['Laptop', 'Bilgisayar', 25000, 3, 'Açıklama', 5],
      [],
    ]);
    const result = await ExcelService.parseExcelFile(buf);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { rowIndex: 2, name: 'Laptop', category: 'Bilgisayar', price: 25000, stock: 3, description: 'Açıklama', low_stock_threshold: 5 },
    ]);
  });

  test('ExcelService yanlış başlıkta hata döndürür', async () => {
    const result = await ExcelService.parseCustomerExcelFile(await makeXlsx([['Yanlış'], ['x']]));
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Beklenen başlık');
  });
});
