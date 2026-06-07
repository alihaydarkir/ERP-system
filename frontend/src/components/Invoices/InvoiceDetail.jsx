import { X, Printer, Download, CheckCircle } from 'lucide-react';
import { exportInvoiceToPDF } from '../../utils/exportUtils';

const STATUS_MAP = {
  draft:     { label: 'Taslak',       color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200' },
  sent:      { label: 'Gönderildi',   color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Ödendi',       color: 'bg-green-100 text-green-700' },
  overdue:   { label: 'Vadesi Geçti', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'İptal',        color: 'bg-orange-100 text-orange-700' },
};

export default function InvoiceDetail({ invoice, onClose, onMarkPaid }) {
  const fmt     = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parseFloat(n) || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const status  = STATUS_MAP[invoice.status] || STATUS_MAP.draft;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4" id="invoice-print-area">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 print:hidden">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Fatura Detayı</h3>
          <div className="flex gap-2">
            {(invoice.status === 'sent' || invoice.status === 'overdue') && onMarkPaid && (
              <button onClick={() => onMarkPaid(invoice.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                <CheckCircle size={15} /> Ödendi İşaretle
              </button>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <Printer size={15} /> Yazdır
            </button>
            <button onClick={() => exportInvoiceToPDF(invoice)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <Download size={15} /> PDF İndir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice body — görsel önizleme */}
        <div className="p-8">

          {/* Üst başlık */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-blue-700 tracking-tight">FATURA</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{invoice.invoice_number}</p>
              {invoice.related_order_number && (
                <p className="text-gray-400 text-xs">Sipariş: {invoice.related_order_number}</p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div>Tarih: <span className="font-medium text-gray-800 dark:text-gray-100">{fmtDate(invoice.issue_date)}</span></div>
                <div>Vade:  <span className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>{fmtDate(invoice.due_date)}</span></div>
                {invoice.paid_date && <div>Ödeme: <span className="font-medium text-green-600">{fmtDate(invoice.paid_date)}</span></div>}
              </div>
            </div>
          </div>

          {/* Müşteri */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Alıcı Bilgileri</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.customer_name || 'Belirtilmemiş'}</p>
            {invoice.customer_company    && <p className="text-gray-600 dark:text-gray-300 text-sm">{invoice.customer_company}</p>}
            {invoice.customer_tax_number && <p className="text-gray-500 dark:text-gray-400 text-sm">VKN/TCKN: {invoice.customer_tax_number}</p>}
            {invoice.customer_phone      && <p className="text-gray-500 dark:text-gray-400 text-sm">Tel: {invoice.customer_phone}</p>}
            {invoice.customer_address    && <p className="text-gray-500 dark:text-gray-400 text-sm">{invoice.customer_address}</p>}
          </div>

          {/* Kalemler tablosu */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2 text-left rounded-tl-lg">#</th>
                <th className="px-4 py-2 text-left">Açıklama</th>
                <th className="px-4 py-2 text-right">Adet</th>
                <th className="px-4 py-2 text-right">Birim Fiyat</th>
                <th className="px-4 py-2 text-center">KDV %{invoice.tax_rate || 20}</th>
                <th className="px-4 py-2 text-right rounded-tr-lg">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                    {item.description}
                    {item.product_sku && <span className="text-gray-400 text-xs ml-1">({item.product_sku})</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{item.quantity}</td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">₺{fmt(item.unit_price)}</td>
                  <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">%{invoice.tax_rate || 20}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">₺{fmt(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Toplamlar — e-Fatura stilinde */}
          <div className="flex justify-end">
            <div className="w-72 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-sm">
              <TotalRow label="Mal Hizmet Toplam Tutarı" value={`₺${fmt(invoice.subtotal)}`} />
              {parseFloat(invoice.discount_amount) > 0 && (
                <TotalRow label="İskonto" value={`-₺${fmt(invoice.discount_amount)}`} red />
              )}
              <TotalRow label="Tutar"
                value={`₺${fmt((parseFloat(invoice.subtotal) || 0) - (parseFloat(invoice.discount_amount) || 0))}`} />
              <TotalRow label={`KDV (%${invoice.tax_rate || 20})`} value={`₺${fmt(invoice.tax_amount)}`} />
              <TotalRow label="Vergiler Dahil Toplam" value={`₺${fmt(invoice.total_amount)}`} />
              <div className="flex justify-between font-bold bg-blue-600 text-white px-4 py-2.5">
                <span>Ödenecek Tutar</span>
                <span>₺{fmt(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notlar */}
          {invoice.notes && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Notlar</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, red }) {
  return (
    <div className={`flex justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 ${red ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
