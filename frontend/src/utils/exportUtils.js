import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useSettingsStore from '../store/settingsStore';
import { downloadTablePdf, downloadTableExcel } from '../services/exportService';

/* ─── Türkçe karakter normalizer ─────────────────────────────────── */
const TR = (s) => {
  if (typeof s !== 'string') return String(s ?? '');
  return s
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/₺/g, 'TL')
    .replace(/€/g, 'EUR');
};

export const addTurkishSupport = (doc) => {
  const origText = doc.text.bind(doc);
  doc.text = function (text, x, y, options, transform) {
    if (typeof text === 'string') text = TR(text);
    else if (Array.isArray(text)) text = text.map(TR);
    return origText(text, x, y, options, transform);
  };
};

/* ─── Şirket bilgisi ─────────────────────────────────────────────── */
function company() {
  try {
    return useSettingsStore.getState()?.settings?.general || {};
  } catch {
    return {};
  }
}

/* ─── Renk sabitleri ─────────────────────────────────────────────── */
const BRAND   = [37, 99, 235];   // mavi
const DARK    = [30, 41, 59];    // koyu gri
const LIGHT   = [248, 250, 252]; // açık arka plan
const MUTED   = [100, 116, 139]; // gri
const WHITE   = [255, 255, 255];
const GREEN   = [16, 185, 129];
const AMBER   = [217, 119, 6];

/* ─── Yardımcı formatlayıcılar ───────────────────────────────────── */
const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');

/* ─── Ortak (backend) export yardımcıları ─────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];
const companyName = () => company().companyName || 'ERP SİSTEMİ';
// Meta satırında para — ₺ DejaVu fontunda destekleniyor
const moneyMeta = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

/* ─── Ortak Şirket Başlığı ───────────────────────────────────────── */
function drawCompanyHeader(doc, opts = {}) {
  const { title = 'RAPOR', badgeColor = BRAND, rightLines = [] } = opts;
  const co = company();
  const W  = doc.internal.pageSize.width;

  // Header arka plan
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 38, 'F');

  // Şirket adı
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(TR(co.companyName || 'Sirket Adi'), 14, 12);

  // Şirket bilgi satırları
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const lines = [];
  if (co.companyAddress) lines.push(TR(co.companyAddress) + (co.companyCity ? ', ' + TR(co.companyCity) : ''));
  if (co.companyTaxOffice || co.companyTaxNumber)
    lines.push(`Vergi Dairesi: ${TR(co.companyTaxOffice || '-')}  |  VKN: ${co.companyTaxNumber || '-'}`);
  if (co.companyPhone)   lines.push(`Tel: ${co.companyPhone}${co.companyFax ? '  Fax: ' + co.companyFax : ''}`);
  if (co.companyEmail || co.companyWebsite)
    lines.push([co.companyEmail, co.companyWebsite].filter(Boolean).join('  |  '));

  lines.slice(0, 3).forEach((l, i) => doc.text(l, 14, 20 + i * 6));

  // Sağ taraf — belge başlığı kutusu
  doc.setFillColor(...WHITE);
  doc.roundedRect(W - 80, 3, 66, 32, 3, 3, 'F');
  doc.setTextColor(...badgeColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, W - 47, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  rightLines.slice(0, 3).forEach((l, i) => doc.text(TR(l), W - 47, 20 + i * 6, { align: 'center' }));

  doc.setTextColor(...DARK);
}

/* ─── Sayfa Altbilgi ─────────────────────────────────────────────── */
function drawFooter(doc) {
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.3);
    doc.line(14, H - 14, W - 14, H - 14);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text('Bu belge elektronik ortamda olusturulmustur.', 14, H - 8);
    doc.text(`Sayfa ${i} / ${totalPages}`, W - 14, H - 8, { align: 'right' });
    doc.text(TR(company().companyName || ''), W / 2, H - 8, { align: 'center' });
  }
}

/* ══════════════════════════════════════════════════════════════════
   FATURA PDF — e-Fatura Stili
   ══════════════════════════════════════════════════════════════════ */
export const exportInvoiceToPDF = (invoice) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);
  const co = company();
  const W  = doc.internal.pageSize.width;

  /* ── Sol üst: Firma bloğu ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(TR(co.companyName || 'Sirketiniz'), 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  let cy = 22;
  const coLines = [
    co.companyAddress && TR(co.companyAddress),
    co.companyCity && TR(co.companyCity),
    co.companyTaxOffice && `Vergi Dairesi: ${TR(co.companyTaxOffice)}`,
    co.companyTaxNumber && `Vergi No: ${co.companyTaxNumber}`,
    co.companyTradeRegistry && `Ticaret Sicil No: ${co.companyTradeRegistry}`,
    co.companyPhone && `Telefon: ${co.companyPhone}`,
    co.companyFax && `Faks: ${co.companyFax}`,
    co.companyEmail && `E-Posta: ${co.companyEmail}`,
    co.companyWebsite && `Web: ${co.companyWebsite}`,
  ].filter(Boolean);
  coLines.forEach(l => { doc.text(l, 14, cy); cy += 5; });

  /* ── Sağ üst: e-Fatura kutusu ── */
  const boxX = W - 82, boxW = 68;
  doc.setFillColor(...BRAND);
  doc.roundedRect(boxX, 10, boxW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text('e-FATURA', boxX + boxW / 2, 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  let ry = 27;
  const inv = invoice;
  const invLines = [
    `Fatura No  : ${inv.invoice_number || '-'}`,
    `Fatura Tipi: SATIS`,
    `Fatura Tarih: ${fmtDate(inv.issue_date)}`,
    `Vade Tarihi: ${fmtDate(inv.due_date)}`,
    inv.related_order_number ? `Siparis No : ${inv.related_order_number}` : null,
  ].filter(Boolean);
  invLines.forEach(l => { doc.text(l, boxX, ry); ry += 5; });

  /* ── Ayıraç çizgi ── */
  const lineY = Math.max(cy, ry) + 4;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(14, lineY, W - 14, lineY);

  /* ── Alıcı bilgisi ── */
  let ay = lineY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);
  doc.text('ALICI', 14, ay);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  ay += 5;
  const custLines = [
    inv.customer_name || 'Belirtilmemis',
    inv.customer_company || null,
    inv.customer_tax_number ? `VKN/TCKN: ${inv.customer_tax_number}` : null,
    inv.customer_phone ? `Tel: ${inv.customer_phone}` : null,
    inv.customer_address || null,
  ].filter(Boolean);
  custLines.forEach(l => { doc.text(TR(l), 14, ay); ay += 5; });

  /* ── Durum rozeti ── */
  const statusMap = {
    draft: ['Taslak', MUTED], sent: ['Gonderildi', BRAND],
    paid: ['Odendi', GREEN], overdue: ['Vadesi Gecti', [220, 38, 38]],
    cancelled: ['Iptal', AMBER],
  };
  const [statusLabel, statusColor] = statusMap[inv.status] || ['Bilinmiyor', MUTED];
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - 50, lineY + 4, 36, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(statusLabel, W - 32, lineY + 10, { align: 'center' });

  /* ── Kalemler Tablosu ── */
  const tableStartY = ay + 4;
  const items = inv.items || [];
  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Aciklama', 'Adet', 'Birim Fiyat', 'KDV %', 'Tutar']],
    body: items.map((item, i) => [
      i + 1,
      TR(item.description || item.product_name || '-'),
      item.quantity,
      fmtMoney(item.unit_price),
      `%${inv.tax_rate || 20}`,
      fmtMoney(item.total_price ?? (item.unit_price * item.quantity)),
    ]),
    headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  /* ── Toplamlar ── */
  const fy = doc.lastAutoTable.finalY + 5;
  const tx = W - 90, tw = 76;

  const totals = [
    ['Mal Hizmet Toplam Tutari', fmtMoney(inv.subtotal)],
    ['Iskonto', fmtMoney(inv.discount_amount)],
    ['Tutar', fmtMoney((parseFloat(inv.subtotal) || 0) - (parseFloat(inv.discount_amount) || 0))],
    [`KDV (%${inv.tax_rate || 20})`, fmtMoney(inv.tax_amount)],
    ['Vergiler Dahil Toplam Tutar', fmtMoney(inv.total_amount)],
  ];

  doc.setFontSize(8);
  let ty = fy;
  totals.forEach(([label, val]) => {
    doc.setFillColor(...LIGHT);
    doc.rect(tx, ty, tw, 7, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(tx, ty, tw, 7, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(label, tx + 2, ty + 5);
    doc.text(val, tx + tw - 2, ty + 5, { align: 'right' });
    ty += 7;
  });

  // Ödenecek Tutar — vurgulu
  doc.setFillColor(...BRAND);
  doc.rect(tx, ty, tw, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Odenecek Tutar', tx + 2, ty + 6.5);
  doc.text(fmtMoney(inv.total_amount), tx + tw - 2, ty + 6.5, { align: 'right' });

  /* ── Notlar ── */
  if (inv.notes) {
    const noteY = ty + 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Not:', 14, noteY);
    doc.text(TR(inv.notes), 14, noteY + 5, { maxWidth: W - 100 });
  }

  /* ── Altbilgi ── */
  drawFooter(doc);

  doc.save(`Fatura_${inv.invoice_number || 'export'}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   ÜRÜN LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportProductsToPDF = (products) =>
  downloadTablePdf({
    companyName: companyName(),
    documentTitle: 'Ürün Listesi',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${products.length} ürün`],
    columns: ['#', 'Ürün Adı', 'SKU', 'Kategori', 'Stok', 'Fiyat', 'Durum'],
    rows: products.map((p, i) => [
      i + 1,
      p.name || '-',
      p.sku || '-',
      p.category || '-',
      p.stock_quantity ?? 0,
      Number(p.price) || 0,
      p.is_active ? 'Aktif' : 'Pasif',
    ]),
    currencyColumns: ['Fiyat'],
    filename: `Urunler_${today()}`,
  });

/* ══════════════════════════════════════════════════════════════════
   SİPARİŞ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
const ORDER_STATUS = (s) => ({ pending: 'Bekleyen', completed: 'Tamamlandı', processing: 'İşlemde', cancelled: 'İptal', shipped: 'Kargoda', delivered: 'Teslim' }[s] || s);

export const exportOrdersToPDF = (orders) => {
  const total = orders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
  return downloadTablePdf({
    companyName: companyName(),
    documentTitle: 'Sipariş Listesi',
    meta: [`Tarih: ${fmtDate()}`, `${orders.length} sipariş`, `Toplam: ${moneyMeta(total)}`],
    columns: ['#', 'Sipariş No', 'Müşteri', 'Tarih', 'Durum', 'Tutar'],
    rows: orders.map((o, i) => [
      i + 1,
      o.order_number || o.id,
      o.customer_name || '-',
      fmtDate(o.created_at),
      ORDER_STATUS(o.status),
      Number(o.total_amount) || 0,
    ]),
    currencyColumns: ['Tutar'],
    footer: ['', '', '', '', 'TOPLAM', total],
    filename: `Siparisler_${today()}`,
  });
};

/* ══════════════════════════════════════════════════════════════════
   MÜŞTERİ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportCustomersToPDF = (customers) =>
  downloadTablePdf({
    companyName: companyName(),
    documentTitle: 'Müşteri Listesi',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${customers.length} müşteri`],
    columns: ['#', 'Ad Soyad', 'Şirket', 'Telefon', 'E-posta', 'Konum'],
    rows: customers.map((c, i) => [
      i + 1,
      c.full_name || c.name || '-',
      c.company_name || c.company || '-',
      c.phone_number || c.phone || '-',
      c.email || '-',
      c.company_location || c.location || '-',
    ]),
    filename: `Musteriler_${today()}`,
  });

/* ══════════════════════════════════════════════════════════════════
   ÇEK LİSTESİ PDF — Yatay A4
   ══════════════════════════════════════════════════════════════════ */
const CHEQUE_STATUS = (s) => ({
  pending: 'Beklemede', paid: 'Ödendi', cancelled: 'İptal',
  teminat: 'Teminat', musteriye_verildi: 'Müşteriye Verildi',
  cleared: 'Tahsil Edildi', bounced: 'Karşılıksız',
}[s] || s);

// Vadesi geçmiş = kırmızı, 7 gün içinde = amber (sadece beklemedeki çekler)
const chequeRowColor = (c) => {
  if (c.status !== 'pending') return null;
  const due = new Date(c.due_date);
  if (due < new Date()) return '#dc2626';
  if ((due - new Date()) / 86400000 <= 7) return '#d97706';
  return null;
};

export const exportChequesToPDF = (cheques) => {
  const total = cheques.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const rowStyles = {};
  cheques.forEach((c, i) => {
    const color = chequeRowColor(c);
    if (color) rowStyles[i] = { color };
  });
  return downloadTablePdf({
    companyName: companyName(),
    documentTitle: 'Çek Listesi',
    orientation: 'landscape',
    meta: [`Tarih: ${fmtDate()}`, `${cheques.length} çek`, `Toplam: ${moneyMeta(total)}`],
    columns: ['#', 'Seri No', 'Keşideci', 'Müşteri', 'Banka', 'Alınan', 'Vade', 'Tutar', 'Durum'],
    rows: cheques.map((c, i) => [
      i + 1,
      c.check_serial_no || '-',
      c.check_issuer || '-',
      c.customer_company_name || c.customer_contact_name || c.customer_name || '-',
      c.bank_name || '-',
      fmtDate(c.received_date),
      fmtDate(c.due_date),
      Number(c.amount) || 0,
      CHEQUE_STATUS(c.status),
    ]),
    currencyColumns: ['Tutar'],
    rowStyles,
    footer: ['', '', '', '', '', '', 'TOPLAM', total, ''],
    filename: `Cekler_${today()}`,
  });
};

/* ══════════════════════════════════════════════════════════════════
   TEDARİKÇİ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportSuppliersToPDF = (suppliers) =>
  downloadTablePdf({
    companyName: companyName(),
    documentTitle: 'Tedarikçi Listesi',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${suppliers.length} tedarikçi`],
    columns: ['#', 'Tedarikçi Adı', 'İletişim Kişisi', 'Telefon', 'E-posta', 'Ödeme Vadesi', 'Durum'],
    rows: suppliers.map((s, i) => [
      i + 1,
      s.supplier_name || s.company_name || '-',
      s.contact_person || s.contact_name || '-',
      s.phone || s.phone_number || '-',
      s.email || '-',
      s.payment_terms || '-',
      s.is_active ? 'Aktif' : 'Pasif',
    ]),
    filename: `Tedarikciler_${today()}`,
  });

/* ══════════════════════════════════════════════════════════════════
   RAPOR PDF (genel)
   ══════════════════════════════════════════════════════════════════ */
export const exportReportToPDF = (reportData, reportTitle) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);

  drawCompanyHeader(doc, {
    title: TR(reportTitle).toUpperCase(),
    badgeColor: BRAND,
    rightLines: [`Tarih: ${fmtDate()}`],
  });

  let y = 46;

  if (reportData.summary) {
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    Object.entries(reportData.summary).forEach(([k, v]) => {
      doc.text(`${TR(k)}: ${TR(String(v))}`, 14, y);
      y += 6;
    });
    y += 4;
  }

  if (reportData.details?.length) {
    autoTable(doc, {
      startY: y,
      head: [Object.keys(reportData.details[0]).map(TR)],
      body: reportData.details.map(row => Object.values(row).map(v => TR(String(v ?? '')))),
      headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      margin: { left: 14, right: 14 },
    });
  }

  drawFooter(doc);
  doc.save(`${TR(reportTitle).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   EXCEL EXPORT FONKSIYONLARI — ortak backend stili (utils/excelTable)
   ══════════════════════════════════════════════════════════════════ */
export const exportProductsToExcel = (products) =>
  downloadTableExcel({
    companyName: companyName(),
    documentTitle: 'Ürün Listesi',
    sheetName: 'Ürünler',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${products.length} ürün`],
    columns: ['ID', 'Ürün Adı', 'SKU', 'Kategori', 'Stok', 'Fiyat', 'Açıklama'],
    rows: products.map(p => [
      p.id, p.name || '-', p.sku || '-', p.category || '-',
      p.stock_quantity ?? 0, Number(p.price) || 0, p.description || '-',
    ]),
    currencyColumns: ['Fiyat'],
    filename: `Urunler_${today()}`,
  });

export const exportOrdersToExcel = (orders) =>
  downloadTableExcel({
    companyName: companyName(),
    documentTitle: 'Sipariş Listesi',
    sheetName: 'Siparişler',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${orders.length} sipariş`],
    columns: ['Sipariş No', 'Müşteri', 'Tarih', 'Durum', 'Toplam Tutar', 'Notlar'],
    rows: orders.map(o => [
      o.order_number || o.id, o.customer_name || '-', fmtDate(o.created_at),
      ORDER_STATUS(o.status), Number(o.total_amount) || 0, o.notes || '-',
    ]),
    currencyColumns: ['Toplam Tutar'],
    filename: `Siparisler_${today()}`,
  });

export const exportCustomersToExcel = (customers) =>
  downloadTableExcel({
    companyName: companyName(),
    documentTitle: 'Müşteri Listesi',
    sheetName: 'Müşteriler',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${customers.length} müşteri`],
    columns: ['ID', 'Ad Soyad', 'Şirket', 'E-posta', 'Telefon', 'Vergi Dairesi', 'Vergi No', 'Konum'],
    rows: customers.map(c => [
      c.id, c.full_name || c.name || '-', c.company_name || '-', c.email || '-',
      c.phone_number || c.phone || '-', c.tax_office || '-', c.tax_number || '-',
      c.company_location || c.address || '-',
    ]),
    filename: `Musteriler_${today()}`,
  });

export const exportChequesToExcel = (cheques) =>
  downloadTableExcel({
    companyName: companyName(),
    documentTitle: 'Çek Listesi',
    sheetName: 'Çekler',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${cheques.length} çek`],
    columns: ['#', 'Seri No', 'Keşideci', 'Müşteri', 'Banka', 'Alınan', 'Vade', 'Tutar', 'Durum'],
    rows: cheques.map((c, i) => [
      i + 1,
      c.check_serial_no || '-',
      c.check_issuer || '-',
      c.customer_company_name || c.customer_contact_name || c.customer_name || '-',
      c.bank_name || '-',
      fmtDate(c.received_date),
      fmtDate(c.due_date),
      Number(c.amount) || 0,
      CHEQUE_STATUS(c.status),
    ]),
    currencyColumns: ['Tutar'],
    filename: `Cekler_${today()}`,
  });

export const exportSuppliersToExcel = (suppliers) =>
  downloadTableExcel({
    companyName: companyName(),
    documentTitle: 'Tedarikçi Listesi',
    sheetName: 'Tedarikçiler',
    meta: [`Tarih: ${fmtDate()}`, `Toplam: ${suppliers.length} tedarikçi`],
    columns: ['ID', 'Tedarikçi Adı', 'İletişim Kişisi', 'E-posta', 'Telefon', 'Adres', 'Vergi Dairesi', 'Vergi No', 'IBAN', 'Ödeme Vadesi', 'Durum'],
    rows: suppliers.map(s => [
      s.id, s.supplier_name || s.company_name || '', s.contact_person || s.contact_name || '',
      s.email || '', s.phone || s.phone_number || '', s.address || s.location || '',
      s.tax_office || '', s.tax_number || '', s.iban || '',
      s.payment_terms || '', s.is_active ? 'Aktif' : 'Pasif',
    ]),
    filename: `Tedarikciler_${today()}`,
  });
