const PDFDocument = require('pdfkit');
const fs = require('fs');

// Türkçe karakter (ş, ğ, ı, İ, ç) ve ₺ için Unicode font. Docker'da apk font-dejavu ile gelir;
// font yoksa pdfkit'in gömülü Helvetica'sına düşülür (yerel dev / jest).
const DEJAVU_REGULAR = '/usr/share/fonts/dejavu/DejaVuSans.ttf';
const DEJAVU_BOLD = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf';

// Kurumsal Lacivert/Slate palet — tüm PDF'lerde ortak.
const PALETTE = {
  accent: '#1e3a5f',  // koyu lacivert (header + tablo başlığı)
  foot:   '#0f1f33',  // toplam satırı (daha koyu)
  gray:   '#64748b',  // meta metin
  light:  '#f8fafc',  // meta kutu / footer arka plan
  zebra:  '#f1f5f9',  // tek satır zebra
  border: '#e2e8f0',  // ince çizgiler
  text:   '#334155',  // hücre metni
};

/** PDFDocument'e Türkçe fontu kaydeder, kullanılacak font adlarını döner */
const registerPdfFonts = (doc) => {
  if (fs.existsSync(DEJAVU_REGULAR) && fs.existsSync(DEJAVU_BOLD)) {
    doc.registerFont('TR-Regular', DEJAVU_REGULAR);
    doc.registerFont('TR-Bold', DEJAVU_BOLD);
    return { regular: 'TR-Regular', bold: 'TR-Bold' };
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
};

const fmtCurrency = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(n) || 0);

/**
 * Ortak tablo PDF üreticisi — res'e stream eder.
 * @param {object} res Express response
 * @param {object} opts
 *   - companyName: header'daki büyük başlık (varsayılan 'ERP SİSTEMİ')
 *   - documentTitle: belge adı (örn. 'Müşteri Listesi')
 *   - meta: string[] — meta kutusunda gösterilecek satırlar
 *   - columns: string[] — tablo başlıkları
 *   - rows: any[][] — satırlar (hücreler string/number)
 *   - currencyColumns: string[] — ₺ formatlanacak kolon başlıkları
 *   - rowStyles: { [rowIndex]: { color } } — satır metni rengi (örn. vadesi geçmiş çek)
 *   - footer: any[] | null — koyu TOPLAM satırı
 *   - orientation: 'portrait' | 'landscape'
 */
const streamTablePdf = (res, opts = {}) => {
  const {
    companyName = 'ERP SİSTEMİ',
    documentTitle = 'Rapor',
    meta = [],
    columns = [],
    rows = [],
    currencyColumns = [],
    rowStyles = {},
    footer = null,
    orientation = 'portrait',
  } = opts;

  const doc = new PDFDocument({ margin: 50, size: 'A4', layout: orientation, bufferPages: true });
  doc.pipe(res);

  const FONT = registerPdfFonts(doc);
  const currencySet = new Set(currencyColumns);

  const PAGE_W = doc.page.width;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Değişken kolon genişlikleri: '#' gibi kısa kolonlar dar, kalanlar eşit ──
  const NARROW = new Set(['#', 'ID']);
  const NARROW_W = 28;
  const narrowCount = columns.filter((c) => NARROW.has(c)).length;
  const restW = (CONTENT_W - narrowCount * NARROW_W) / Math.max(1, columns.length - narrowCount);
  const colW = columns.map((c) => (NARROW.has(c) ? NARROW_W : restW));
  const colX = [];
  columns.reduce((acc, _, i) => { colX[i] = acc; return acc + colW[i]; }, MARGIN);

  // Tek satıra sığdır, taşarsa kırp (…) — satır kaymasını ve boş sayfayı önler
  const cellOpts = (i) => ({ width: colW[i] - 8, height: 11, ellipsis: true, lineBreak: false });

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 80).fill(PALETTE.accent);
  doc.fillColor('#ffffff').fontSize(20).font(FONT.bold)
    .text(String(companyName).toUpperCase(), MARGIN, 22, { width: CONTENT_W, height: 24, ellipsis: true, lineBreak: false });
  doc.fontSize(11).font(FONT.regular)
    .text(documentTitle, MARGIN, 48, { lineBreak: false });
  doc.fontSize(9)
    .text(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), 0, 58, { align: 'right', width: PAGE_W - MARGIN, lineBreak: false });

  doc.fillColor('#000000');

  // ── Meta kutusu ───────────────────────────────────────────────────────────
  let y = 100;
  if (meta.length) {
    const boxH = 14 + meta.length * 13;
    doc.rect(MARGIN, y, CONTENT_W, boxH).fillAndStroke(PALETTE.light, PALETTE.border);
    doc.fillColor(PALETTE.gray).fontSize(9).font(FONT.regular);
    meta.forEach((line, i) => doc.text(String(line), MARGIN + 10, y + 7 + i * 13, { width: CONTENT_W - 20, lineBreak: false, ellipsis: true }));
    y += boxH + 14;
  }

  // ── Tablo başlığı ───────────────────────────────────────────────────────────
  const drawHeader = () => {
    doc.rect(MARGIN, y, CONTENT_W, 22).fill(PALETTE.accent);
    doc.fillColor('#ffffff').fontSize(8).font(FONT.bold);
    columns.forEach((col, i) => {
      doc.text(String(col), colX[i] + 4, y + 7, cellOpts(i));
    });
    y += 22;
  };
  drawHeader();

  // ── Satırlar ───────────────────────────────────────────────────────────────
  doc.fillColor(PALETTE.text).font(FONT.regular).fontSize(8);
  rows.forEach((row, rowIdx) => {
    if (y > doc.page.height - 70) {
      doc.addPage();
      y = MARGIN;
      drawHeader();
      doc.fillColor(PALETTE.text).font(FONT.regular).fontSize(8);
    }

    const rowBg = rowIdx % 2 === 0 ? '#ffffff' : PALETTE.zebra;
    doc.rect(MARGIN, y, CONTENT_W, 18).fillAndStroke(rowBg, PALETTE.border);
    const textColor = rowStyles[rowIdx]?.color || PALETTE.text;
    row.forEach((cell, i) => {
      const cellStr = typeof cell === 'number' && currencySet.has(columns[i])
        ? fmtCurrency(cell)
        : String(cell ?? '-');
      doc.fillColor(textColor).text(cellStr, colX[i] + 4, y + 5, cellOpts(i));
    });
    y += 18;
  });

  // ── TOPLAM satırı ────────────────────────────────────────────────────────────
  if (footer && footer.length) {
    if (y > doc.page.height - 70) { doc.addPage(); y = MARGIN; }
    doc.rect(MARGIN, y, CONTENT_W, 20).fill(PALETTE.foot);
    doc.fillColor('#ffffff').font(FONT.bold).fontSize(8);
    footer.forEach((cell, i) => {
      const cellStr = typeof cell === 'number' && currencySet.has(columns[i])
        ? fmtCurrency(cell)
        : String(cell ?? '');
      doc.text(cellStr, colX[i] + 4, y + 6, cellOpts(i));
    });
    y += 20;
  }

  // ── Footer (her sayfa) ────────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Alt margin içine yazınca pdfkit otomatik yeni sayfa açmasın diye geçici 0'la
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(0, doc.page.height - 30, PAGE_W, 30).fill(PALETTE.light);
    doc.fillColor(PALETTE.gray).font(FONT.regular).fontSize(8)
      .text('Bu belge elektronik ortamda oluşturulmuştur.', MARGIN, doc.page.height - 18, { align: 'left', lineBreak: false })
      .text(`Sayfa ${i + 1} / ${range.count}`, 0, doc.page.height - 18, { align: 'right', width: PAGE_W - MARGIN, lineBreak: false });
    doc.page.margins.bottom = oldBottom;
  }

  doc.end();
};

module.exports = { streamTablePdf, registerPdfFonts, PALETTE, fmtCurrency };
