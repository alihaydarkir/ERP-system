import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import useSettingsStore from '../store/settingsStore';

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
const PURPLE  = [109, 40, 217];
const AMBER   = [217, 119, 6];

/* ─── Yardımcı formatlayıcılar ───────────────────────────────────── */
const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');

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
export const exportProductsToPDF = (products) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);

  drawCompanyHeader(doc, {
    title: 'URUN LISTESI',
    badgeColor: GREEN,
    rightLines: [`Tarih: ${fmtDate()}`, `Toplam: ${products.length} urun`],
  });

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Urun Adi', 'SKU', 'Kategori', 'Stok', 'Fiyat', 'Durum']],
    body: products.map((p, i) => [
      i + 1,
      TR(p.name || '-'),
      p.sku || '-',
      TR(p.category || '-'),
      p.stock_quantity ?? 0,
      fmtMoney(p.price),
      p.is_active ? 'Aktif' : 'Pasif',
    ]),
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  doc.save(`Urunler_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   SİPARİŞ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportOrdersToPDF = (orders) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);

  const statusLabel = (s) => ({ pending: 'Bekleyen', completed: 'Tamamlandi', processing: 'Islemde', cancelled: 'Iptal' }[s] || s);
  const total = orders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

  drawCompanyHeader(doc, {
    title: 'SIPARIS LISTESI',
    badgeColor: BRAND,
    rightLines: [`Tarih: ${fmtDate()}`, `${orders.length} siparis`, `Toplam: ${fmtMoney(total)}`],
  });

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Siparis No', 'Musteri', 'Tarih', 'Durum', 'Tutar']],
    body: orders.map((o, i) => [
      i + 1,
      o.order_number || o.id,
      TR(o.customer_name || '-'),
      fmtDate(o.created_at),
      statusLabel(o.status),
      fmtMoney(o.total_amount),
    ]),
    headStyles: { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    foot: [['', '', '', '', 'TOPLAM', fmtMoney(total)]],
    footStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  });

  drawFooter(doc);
  doc.save(`Siparisler_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   MÜŞTERİ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportCustomersToPDF = (customers) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);

  drawCompanyHeader(doc, {
    title: 'MUSTERI LISTESI',
    badgeColor: PURPLE,
    rightLines: [`Tarih: ${fmtDate()}`, `Toplam: ${customers.length} musteri`],
  });

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Ad Soyad', 'Sirket', 'Telefon', 'E-posta', 'Konum']],
    body: customers.map((c, i) => [
      i + 1,
      TR(c.full_name || c.name || '-'),
      TR(c.company_name || c.company || '-'),
      c.phone_number || c.phone || '-',
      c.email || '-',
      TR(c.company_location || c.location || '-'),
    ]),
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  doc.save(`Musteriler_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   ÇEK LİSTESİ PDF — Yatay A4
   ══════════════════════════════════════════════════════════════════ */
export const exportChequesToPDF = (cheques) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  addTurkishSupport(doc);

  const statusLabel = (s) => ({
    pending: 'Beklemede', cleared: 'Tahsil Edildi',
    bounced: 'Karsilıksiz', cancelled: 'Iptal',
    paid: 'Odendi', teminat: 'Teminat',
  }[s] || s);

  const total = cheques.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  drawCompanyHeader(doc, {
    title: 'CEK LISTESI',
    badgeColor: AMBER,
    rightLines: [`Tarih: ${fmtDate()}`, `${cheques.length} cek`, `Toplam: ${fmtMoney(total)}`],
  });

  const overdueStyle = (c) => {
    if (c.status !== 'pending') return {};
    const due = new Date(c.due_date);
    if (due < new Date()) return { textColor: [220, 38, 38] };
    const diff = (due - new Date()) / 86400000;
    if (diff <= 7) return { textColor: AMBER };
    return {};
  };

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Seri No', 'Kesideci', 'Musteri', 'Banka', 'Alınan', 'Vade', 'Tutar', 'Durum']],
    body: cheques.map((c, i) => [
      i + 1,
      c.check_serial_no || '-',
      TR(c.check_issuer || '-'),
      TR(c.customer_company_name || c.customer_contact_name || c.customer_name || '-'),
      TR(c.bank_name || '-'),
      fmtDate(c.received_date),
      fmtDate(c.due_date),
      fmtMoney(c.amount),
      statusLabel(c.status),
    ]),
    headStyles: { fillColor: AMBER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const c = cheques[data.row.index];
        Object.assign(data.cell.styles, overdueStyle(c));
      }
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    foot: [['', '', '', '', '', '', 'TOPLAM', fmtMoney(total), '']],
    footStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  });

  drawFooter(doc);
  doc.save(`Cekler_${new Date().toISOString().split('T')[0]}.pdf`);
};

/* ══════════════════════════════════════════════════════════════════
   TEDARİKÇİ LİSTESİ PDF
   ══════════════════════════════════════════════════════════════════ */
export const exportSuppliersToPDF = (suppliers) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addTurkishSupport(doc);

  drawCompanyHeader(doc, {
    title: 'TEDARIKCI LISTESI',
    badgeColor: PURPLE,
    rightLines: [`Tarih: ${fmtDate()}`, `Toplam: ${suppliers.length} tedarikci`],
  });

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Tedarikci Adi', 'Iletisim Kisisi', 'Telefon', 'E-posta', 'Odeme Vadesi', 'Durum']],
    body: suppliers.map((s, i) => [
      i + 1,
      TR(s.supplier_name || s.company_name || '-'),
      TR(s.contact_person || s.contact_name || '-'),
      s.phone || s.phone_number || '-',
      s.email || '-',
      s.payment_terms || '-',
      s.is_active ? 'Aktif' : 'Pasif',
    ]),
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  doc.save(`Tedarikciler_${new Date().toISOString().split('T')[0]}.pdf`);
};

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
   EXCEL EXPORT FONKSIYONLARI (değişmedi, sadece temizlendi)
   ══════════════════════════════════════════════════════════════════ */
export const exportProductsToExcel = (products) => {
  const ws = XLSX.utils.json_to_sheet(products.map(p => ({
    'ID': p.id, 'Urun Adi': p.name || '-', 'SKU': p.sku || '-',
    'Kategori': p.category || '-', 'Stok': p.stock_quantity ?? 0,
    'Fiyat (TL)': p.price || 0, 'Aciklama': p.description || '-',
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Urunler');
  XLSX.writeFile(wb, `Urunler_${Date.now()}.xlsx`);
};

export const exportOrdersToExcel = (orders) => {
  const statusLabel = (s) => ({ pending: 'Bekleyen', completed: 'Tamamlandi', cancelled: 'Iptal' }[s] || s);
  const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
    'Siparis No': o.order_number || o.id, 'Musteri': o.customer_name || '-',
    'Tarih': fmtDate(o.created_at), 'Durum': statusLabel(o.status),
    'Toplam Tutar (TL)': o.total_amount || 0, 'Notlar': o.notes || '-',
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Siparisler');
  XLSX.writeFile(wb, `Siparisler_${Date.now()}.xlsx`);
};

export const exportCustomersToExcel = (customers) => {
  const ws = XLSX.utils.json_to_sheet(customers.map(c => ({
    'ID': c.id, 'Ad Soyad': c.full_name || c.name || '-',
    'E-posta': c.email || '-', 'Telefon': c.phone_number || c.phone || '-',
    'Sirket': c.company_name || '-', 'Adres': c.address || '-',
    'Kayit Tarihi': fmtDate(c.created_at),
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Musteriler');
  XLSX.writeFile(wb, `Musteriler_${Date.now()}.xlsx`);
};

export const exportSuppliersToExcel = (suppliers) => {
  const ws = XLSX.utils.json_to_sheet(suppliers.map(s => ({
    'ID': s.id, 'Tedarikci Adi': s.supplier_name || s.company_name || '',
    'Iletisim Kisisi': s.contact_person || s.contact_name || '',
    'E-posta': s.email || '', 'Telefon': s.phone || s.phone_number || '',
    'Adres': s.address || s.location || '', 'Vergi Dairesi': s.tax_office || '',
    'Vergi No': s.tax_number || '', 'IBAN': s.iban || '',
    'Odeme Vadesi': s.payment_terms || '', 'Durum': s.is_active ? 'Aktif' : 'Pasif',
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tedarikciler');
  XLSX.writeFile(wb, `Tedarikciler_${Date.now()}.xlsx`);
};
