import { Eye, Trash2, CheckCircle, Send, FileText } from 'lucide-react';

const STATUS_MAP = {
  draft:     { label: 'Taslak',       color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:bg-gray-700 dark:text-gray-300',   dot: 'bg-gray-400 dark:bg-gray-50 dark:bg-gray-800/500' },
  sent:      { label: 'Gönderildi',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   dot: 'bg-blue-50 dark:bg-blue-900/200 dark:bg-blue-400' },
  paid:      { label: 'Ödendi',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-50 dark:bg-green-900/200 dark:bg-green-400' },
  overdue:   { label: 'Vadesi Geçti', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',     dot: 'bg-red-50 dark:bg-red-900/200 dark:bg-red-400' },
  cancelled: { label: 'İptal',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', dot: 'bg-orange-400 dark:bg-orange-400' },
};

export default function InvoiceList({ invoices, onView, onDelete, onMarkPaid, onMarkSent }) {
  const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parseFloat(n) || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex flex-col items-center justify-center">
            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-full mb-3">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Henüz fatura yok</h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm">Yeni fatura oluşturmak için yukarıdaki butonu kullanın.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fatura No</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Müşteri</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vade</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {invoices.map((inv) => {
            const s = (STATUS_MAP[inv.status] || STATUS_MAP.draft) || {};
            const isOverdue = inv.status === 'overdue';
            return (
              <tr key={inv.id} className="hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    {inv.invoice_number}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900 dark:text-white">{inv.customer_name || '—'}</div>
                  {inv.customer_company && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inv.customer_company}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDate(inv.issue_date)}</td>
                <td className={`px-6 py-4 whitespace-nowrap font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {fmtDate(inv.due_date)}
                  {isOverdue && <span className="ml-1 text-xs">⚠️</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 dark:text-white">
                  ₺{fmt(inv.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${s.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                    {s.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onView(inv)}
                      title="Görüntüle / PDF"
                      className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/20 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>

                    {inv.status === 'draft' && onMarkSent && (
                      <button
                        onClick={() => onMarkSent(inv.id)}
                        title="Gönderildi olarak işaretle"
                        className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    )}

                    {(inv.status === 'sent' || inv.status === 'overdue') && onMarkPaid && (
                      <button
                        onClick={() => onMarkPaid(inv.id)}
                        title="Ödendi olarak işaretle"
                        className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:bg-green-900/20 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(inv.id)}
                      title="Sil"
                      className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
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
