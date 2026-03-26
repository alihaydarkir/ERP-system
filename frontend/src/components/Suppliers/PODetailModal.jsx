import { X, Package, Truck, Calendar, Hash, Building2 } from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  confirmed: 'Onaylandı',
  partial: 'Kısmi Teslim',
  received: 'Teslim Alındı',
  cancelled: 'İptal',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  partial: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const fmt = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function PODetailModal({ po, onClose }) {
  if (!po) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Satın Alma Siparişi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{po.po_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200'}`}>
              {STATUS_LABELS[po.status] || po.status}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:bg-gray-700/50 rounded-lg transition-colors">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Meta bilgiler */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Building2 size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tedarikçi</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{po.supplier_name || '—'}</p>
                {po.supplier_contact && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{po.supplier_contact}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Calendar size={18} className="text-purple-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Beklenen Teslimat</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmtDate(po.expected_delivery)}</p>
                {po.actual_delivery && (
                  <p className="text-xs text-green-600">Teslim: {fmtDate(po.actual_delivery)}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Hash size={18} className="text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Oluşturulma</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmtDate(po.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <Truck size={18} className="text-green-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Toplam Tutar</p>
                <p className="text-lg font-bold text-green-700">{fmt(po.total_amount)}</p>
                {po.received_amount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Alınan: {fmt(po.received_amount)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notlar */}
          {po.notes && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl">
              <p className="text-xs font-medium text-yellow-700 mb-1">Notlar</p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{po.notes}</p>
            </div>
          )}

          {/* Ürün Listesi */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Package size={16} />
              Ürünler ({po.items?.length || 0} kalem)
            </h3>
            {po.items && po.items.length > 0 ? (
              <div className="border rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miktar</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Alınan</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Birim Fiyat</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-800">
                    {po.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50 dark:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.product_name || item.name || '—'}</p>
                          {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className={item.received_quantity >= item.quantity ? 'text-green-600 font-medium' : 'text-orange-500'}>
                            {item.received_quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">{fmt(item.unit_price || item.price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {fmt((item.unit_price || item.price || 0) * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">Genel Toplam</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100">{fmt(po.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Bu sipariş için ürün detayı bulunamadı</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
