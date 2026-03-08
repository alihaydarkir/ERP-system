import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * PDF Export Utilities
 */

// PDF'e Türkçe karakter desteği için font ekleme (opsiyonel)
const addTurkishSupport = (doc) => {
  // Not: Türkçe karakterler için custom font gerekebilir
  // Şimdilik varsayılan font ile devam ediyoruz
};

/**
 * Ürünleri PDF olarak export et
 */
export const exportProductsToPDF = (products) => {
  const doc = new jsPDF();
  
  // Başlık
  doc.setFontSize(18);
  doc.text('Ürün Listesi', 14, 22);
  
  // Tarih
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
  
  // Tablo
  const tableData = products.map(p => [
    p.id,
    p.name || '-',
    p.sku || '-',
    p.category || '-',
    p.stock_quantity || 0,
    `${p.price || 0} TL`
  ]);
  
  doc.autoTable({
    head: [['ID', 'Ürün Adı', 'SKU', 'Kategori', 'Stok', 'Fiyat']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`urunler_${new Date().getTime()}.pdf`);
};

/**
 * Siparişleri PDF olarak export et
 */
export const exportOrdersToPDF = (orders) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Sipariş Listesi', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
  
  const tableData = orders.map(o => [
    o.id,
    o.customer_name || '-',
    new Date(o.order_date).toLocaleDateString('tr-TR'),
    o.status === 'pending' ? 'Bekleyen' : o.status === 'completed' ? 'Tamamlandı' : 'İptal',
    `${o.total_amount || 0} TL`
  ]);
  
  doc.autoTable({
    head: [['Sipariş No', 'Müşteri', 'Tarih', 'Durum', 'Tutar']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`siparisler_${new Date().getTime()}.pdf`);
};

/**
 * Müşterileri PDF olarak export et
 */
export const exportCustomersToPDF = (customers) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Müşteri Listesi', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
  
  const tableData = customers.map(c => [
    c.id,
    c.name || '-',
    c.email || '-',
    c.phone || '-',
    c.company || '-'
  ]);
  
  doc.autoTable({
    head: [['ID', 'Ad Soyad', 'E-posta', 'Telefon', 'Şirket']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [139, 92, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`musteriler_${new Date().getTime()}.pdf`);
};

/**
 * Excel Export Utilities
 */

/**
 * Ürünleri Excel olarak export et
 */
export const exportProductsToExcel = (products) => {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(p => ({
      'ID': p.id,
      'Ürün Adı': p.name || '-',
      'SKU': p.sku || '-',
      'Kategori': p.category || '-',
      'Stok Miktarı': p.stock_quantity || 0,
      'Fiyat (TL)': p.price || 0,
      'Açıklama': p.description || '-'
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürünler');
  
  XLSX.writeFile(workbook, `urunler_${new Date().getTime()}.xlsx`);
};

/**
 * Siparişleri Excel olarak export et
 */
export const exportOrdersToExcel = (orders) => {
  const worksheet = XLSX.utils.json_to_sheet(
    orders.map(o => ({
      'Sipariş No': o.id,
      'Müşteri': o.customer_name || '-',
      'Sipariş Tarihi': new Date(o.order_date).toLocaleDateString('tr-TR'),
      'Durum': o.status === 'pending' ? 'Bekleyen' : o.status === 'completed' ? 'Tamamlandı' : 'İptal',
      'Toplam Tutar (TL)': o.total_amount || 0,
      'Notlar': o.notes || '-'
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler');
  
  XLSX.writeFile(workbook, `siparisler_${new Date().getTime()}.xlsx`);
};

/**
 * Müşterileri Excel olarak export et
 */
export const exportCustomersToExcel = (customers) => {
  const worksheet = XLSX.utils.json_to_sheet(
    customers.map(c => ({
      'ID': c.id,
      'Ad Soyad': c.name || '-',
      'E-posta': c.email || '-',
      'Telefon': c.phone || '-',
      'Şirket': c.company || '-',
      'Adres': c.address || '-',
      'Kayıt Tarihi': new Date(c.created_at).toLocaleDateString('tr-TR')
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
  
  XLSX.writeFile(workbook, `musteriler_${new Date().getTime()}.xlsx`);
};

/**
 * Rapor PDF export
 */
export const exportReportToPDF = (reportData, reportTitle) => {
  const doc = new jsPDF();
  
  // Başlık
  doc.setFontSize(20);
  doc.text(reportTitle, 14, 22);
  
  // Tarih
  doc.setFontSize(10);
  doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
  
  let yPosition = 40;
  
  // Özet istatistikler
  doc.setFontSize(14);
  doc.text('Özet', 14, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  if (reportData.summary) {
    Object.entries(reportData.summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 20, yPosition);
      yPosition += 6;
    });
  }
  
  yPosition += 10;
  
  // Detay tablosu (varsa)
  if (reportData.details && Array.isArray(reportData.details)) {
    doc.autoTable({
      head: [Object.keys(reportData.details[0] || {})],
      body: reportData.details.map(item => Object.values(item)),
      startY: yPosition,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`${reportTitle.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.pdf`);
};

/**
 * Tedarikçileri PDF olarak export et
 */
export const exportSuppliersToPDF = (suppliers) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Tedarikçi Listesi', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
  
  const tableData = suppliers.map(s => [
    s.id,
    s.supplier_name || s.company_name || '-',
    s.contact_person || s.contact_name || '-',
    s.email || '-',
    s.phone || s.phone_number || '-',
    s.payment_terms || '-',
    s.is_active ? 'Aktif' : 'Pasif'
  ]);
  
  doc.autoTable({
    head: [['ID', 'Tedarikçi Adı', 'İletişim Kişisi', 'E-posta', 'Telefon', 'Ödeme Vadesi', 'Durum']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [139, 92, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`tedarikciler_${new Date().getTime()}.pdf`);
};

/**
 * Tedarikçileri Excel olarak export et
 */
export const exportSuppliersToExcel = (suppliers) => {
  const data = suppliers.map(s => ({
    'ID': s.id,
    'Tedarikçi Adı': s.supplier_name || s.company_name || '',
    'İletişim Kişisi': s.contact_person || s.contact_name || '',
    'E-posta': s.email || '',
    'Telefon': s.phone || s.phone_number || '',
    'Adres': s.address || s.location || '',
    'Vergi Dairesi': s.tax_office || '',
    'Vergi No': s.tax_number || '',
    'IBAN': s.iban || '',
    'Ödeme Vadesi': s.payment_terms || '',
    'Para Birimi': s.currency || 'TRY',
    'Değerlendirme': s.rating || '',
    'Durum': s.is_active ? 'Aktif' : 'Pasif',
    'Notlar': s.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tedarikçiler');
  
  // Sütun genişliklerini ayarla
  const colWidths = [
    { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 25 },
    { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
    { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 30 }
  ];
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, `tedarikciler_${new Date().getTime()}.xlsx`);
};
