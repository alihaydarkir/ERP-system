import { Eye, Send, CheckCircle, XCircle } from 'lucide-react';

export default function PurchaseOrderList({ purchaseOrders, onView, onSend, onReceive, onCancel, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 bg-white dark:bg-gray-800 transition-colors duration-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 transition-colors duration-200">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Henüz satın alma siparişi bulunmuyor</p>
        <p className="text-gray-400 dark:text-gray-400 text-sm mt-2">Yeni bir sipariş oluşturmak için yukarıdaki butona tıklayın</p>
      </div>
    );
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500';
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      confirmed: 'Onaylandı',
      partial: 'Kısmi Teslim',
      received: 'Teslim Alındı',
      cancelled: 'İptal'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              PO Numarası
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tedarikçi
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Toplam Tutar
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Durum
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Beklenen Tarih
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {purchaseOrders.map((po) => (
            <tr key={po.id} className="hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                  {po.po_number}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(po.created_at)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{po.supplier_name}</div>
                {po.supplier_contact && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{po.supplier_contact}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(po.total_amount)}
                </div>
                {po.received_amount > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Alınan: {formatCurrency(po.received_amount)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(po.status)}`}>
                  {getStatusLabel(po.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {formatDate(po.expected_delivery)}
                </div>
                {po.actual_delivery && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Teslim: {formatDate(po.actual_delivery)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={() => onView(po)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    title="Detay"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {po.status === 'draft' && (
                    <button
                      onClick={() => onSend(po)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/20 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      title="Gönder"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}

                  {['sent', 'confirmed', 'partial'].includes(po.status) && (
                    <button
                      onClick={() => onReceive(po)}
                      className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:bg-green-900/20 dark:hover:bg-green-900/20 rounded-md transition-colors"
                      title="Teslim Al"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}

                  {!['received', 'cancelled'].includes(po.status) && (
                    <button
                      onClick={() => onCancel(po)}
                      className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="İptal"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
