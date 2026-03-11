import { X, Printer, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addTurkishSupport } from '../../utils/exportUtils';

const STATUS_MAP = {
  draft:     { label: 'Taslak',      color: 'bg-gray-100 text-gray-700' },
  sent:      { label: 'Gönderildi',  color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Ödendi',      color: 'bg-green-100 text-green-700' },
  overdue:   { label: 'Vadesi Geçti', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'İptal',       color: 'bg-orange-100 text-orange-700' },
};

export default function InvoiceDetail({ invoice, onClose, onMarkPaid }) {
  const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parseFloat(n) || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const status = STATUS_MAP[invoice.status] || STATUS_MAP.draft;

  /* ─── PDF export ─── */
  const downloadPDF = () => {
    const doc = new jsPDF();
    addTurkishSupport(doc);

    // Header background
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FATURA', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${invoice.invoice_number}`, 14, 28);
    doc.text(`Tarih: ${fmtDate(invoice.issue_date)}`, 14, 35);

    // Status badge area
    doc.setFontSize(12);
    doc.text(`Durum: ${status.label}`, 140, 22);
    doc.setFontSize(10);
    doc.text(`Vade: ${fmtDate(invoice.due_date)}`, 140, 32);

    // Customer info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Müşteri Bilgileri', 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.customer_name || 'Belirtilmemiş', 14, 60);
    if (invoice.customer_company) doc.text(invoice.customer_company, 14, 67);
    if (invoice.customer_tax_number) doc.text(`VKN/TCKN: ${invoice.customer_tax_number}`, 14, 74);
    if (invoice.customer_phone) doc.text(`Tel: ${invoice.customer_phone}`, 14, 81);

    // Items table
    autoTable(doc, {
      startY: 92,
      head: [['#', 'Açıklama', 'Adet', 'Birim Fiyat (₺)', 'Toplam (₺)']],
      body: (invoice.items || []).map((item, i) => [
        i + 1,
        item.description,
        item.quantity,
        fmt(item.unit_price),
        fmt(item.total_price)
      ]),
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    // Totals
    const totalsX = 130;
    doc.setFontSize(10);
    doc.text('Ara Toplam:', totalsX, finalY);
    doc.text(`₺${fmt(invoice.subtotal)}`, 190, finalY, { align: 'right' });

    doc.text(`İndirim:`, totalsX, finalY + 7);
    doc.text(`-₺${fmt(invoice.discount_amount)}`, 190, finalY + 7, { align: 'right' });

    doc.text(`KDV (%${invoice.tax_rate}):`, totalsX, finalY + 14);
    doc.text(`₺${fmt(invoice.tax_amount)}`, 190, finalY + 14, { align: 'right' });

    doc.setFillColor(37, 99, 235);
    doc.rect(totalsX - 2, finalY + 18, 65, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GENEL TOPLAM:', totalsX, finalY + 25);
    doc.text(`₺${fmt(invoice.total_amount)}`, 190, finalY + 25, { align: 'right' });

    // Notes
    if (invoice.notes) {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Notlar:', 14, finalY + 35);
      doc.text(invoice.notes, 14, finalY + 42, { maxWidth: 120 });
    }

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('Bu fatura elektronik ortamda oluşturulmuştur.', 105, 285, { align: 'center' });

    doc.save(`Fatura_${invoice.invoice_number}.pdf`);
  };

  /* ─── Print ─── */
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4" id="invoice-print-area">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b print:hidden">
          <h3 className="font-semibold text-gray-700">Fatura Detayı</h3>
          <div className="flex gap-2">
            {(invoice.status === 'sent' || invoice.status === 'overdue') && onMarkPaid && (
              <button onClick={() => onMarkPaid(invoice.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                <CheckCircle size={15} /> Ödendi İşaretle
              </button>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
              <Printer size={15} /> Yazdır
            </button>
            <button onClick={downloadPDF}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <Download size={15} /> PDF İndir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice body */}
        <div className="p-8">
          {/* Top header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-blue-700 tracking-tight">FATURA</h1>
              <p className="text-gray-500 text-sm mt-1">{invoice.invoice_number}</p>
              {invoice.related_order_number && (
                <p className="text-gray-400 text-xs">Sipariş: {invoice.related_order_number}</p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <div className="mt-2 text-sm text-gray-500">
                <div>Tarih: <span className="font-medium text-gray-800">{fmtDate(invoice.issue_date)}</span></div>
                <div>Vade: <span className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(invoice.due_date)}</span></div>
                {invoice.paid_date && <div>Ödeme: <span className="font-medium text-green-600">{fmtDate(invoice.paid_date)}</span></div>}
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Müşteri Bilgileri</p>
            <p className="font-semibold text-gray-900">{invoice.customer_name || 'Belirtilmemiş'}</p>
            {invoice.customer_company && <p className="text-gray-600 text-sm">{invoice.customer_company}</p>}
            {invoice.customer_tax_number && <p className="text-gray-500 text-sm">VKN/TCKN: {invoice.customer_tax_number}</p>}
            {invoice.customer_phone && <p className="text-gray-500 text-sm">Tel: {invoice.customer_phone}</p>}
            {invoice.customer_address && <p className="text-gray-500 text-sm">{invoice.customer_address}</p>}
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2 text-left rounded-tl-lg">#</th>
                <th className="px-4 py-2 text-left">Açıklama</th>
                <th className="px-4 py-2 text-right">Adet</th>
                <th className="px-4 py-2 text-right">Birim Fiyat</th>
                <th className="px-4 py-2 text-right rounded-tr-lg">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2 text-gray-800">
                    {item.description}
                    {item.product_sku && <span className="text-gray-400 text-xs ml-1">({item.product_sku})</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-2 text-right text-gray-700">₺{fmt(item.unit_price)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">₺{fmt(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ara Toplam</span>
                <span>₺{fmt(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>İndirim</span>
                  <span className="text-red-500">-₺{fmt(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>KDV (%{invoice.tax_rate})</span>
                <span>₺{fmt(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold bg-blue-600 text-white px-3 py-2 rounded-lg mt-2">
                <span>GENEL TOPLAM</span>
                <span>₺{fmt(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Notlar</p>
              <p className="text-gray-600 text-sm whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
