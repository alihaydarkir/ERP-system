import { Trash2, Banknote } from 'lucide-react';

const fmt = (n) =>
  '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '-');

export default function BankTransferList({ transfers, onDelete, canDelete }) {
  if (!transfers || transfers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <Banknote size={40} className="mx-auto mb-3 opacity-30" />
        <p>Henüz banka havalesi yok</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            {['Müşteri', 'Banka', 'Dekont No', 'Tarih', 'Tutar', ''].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {transfers.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              <td className="px-5 py-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.customer_company_name || t.customer_contact_name || '-'}</p>
              </td>
              <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-200">{t.bank_name}</td>
              <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{t.receipt_no || '-'}</td>
              <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(t.transfer_date)}</td>
              <td className="px-5 py-3 text-sm font-bold text-green-700 dark:text-green-400">{fmt(t.amount)}</td>
              <td className="px-5 py-3 text-right">
                {canDelete && (
                  <button onClick={() => onDelete(t.id)} className="text-red-600 hover:text-red-800 p-1.5" title="Sil">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
