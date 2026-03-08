import { Eye, Trash2, CheckCircle, Send } from 'lucide-react';

const STATUS_MAP = {
  draft:     { label: 'Taslak',       color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  sent:      { label: 'Gönderildi',   color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  paid:      { label: 'Ödendi',       color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  overdue:   { label: 'Vadesi Geçti', color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  cancelled: { label: 'İptal',        color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
};

export default function InvoiceList({ invoices, onView, onDelete, onMarkPaid, onMarkSent }) {
  const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parseFloat(n) || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  if (invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🧾</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Henüz fatura yok</h3>
        <p className="text-gray-400 text-sm">Yeni fatura oluşturmak için yukarıdaki butonu kullanın.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
            <th className="px-4 py-3 text-left">Fatura No</th>
            <th className="px-4 py-3 text-left">Müşteri</th>
            <th className="px-4 py-3 text-left">Tarih</th>
            <th className="px-4 py-3 text-left">Vade</th>
            <th className="px-4 py-3 text-right">Tutar</th>
            <th className="px-4 py-3 text-center">Durum</th>
            <th className="px-4 py-3 text-center">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const s = STATUS_MAP[inv.status] || STATUS_MAP.draft;
            const isOverdue = inv.status === 'overdue';
            return (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-blue-700 text-xs">
                    {inv.invoice_number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{inv.customer_name || '—'}</div>
                  {inv.customer_company && (
                    <div className="text-xs text-gray-400">{inv.customer_company}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(inv.issue_date)}</td>
                <td className={`px-4 py-3 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                  {fmtDate(inv.due_date)}
                  {isOverdue && <span className="ml-1 text-xs">⚠️</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  ₺{fmt(inv.total_amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onView(inv)}
                      title="Görüntüle / PDF"
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Eye size={15} />
                    </button>

                    {inv.status === 'draft' && onMarkSent && (
                      <button
                        onClick={() => onMarkSent(inv.id)}
                        title="Gönderildi olarak işaretle"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                      >
                        <Send size={15} />
                      </button>
                    )}

                    {(inv.status === 'sent' || inv.status === 'overdue') && onMarkPaid && (
                      <button
                        onClick={() => onMarkPaid(inv.id)}
                        title="Ödendi olarak işaretle"
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(inv.id)}
                      title="Sil"
                      className="p-1.5 text-red-400 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
