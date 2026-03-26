export default function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: '⏳ Beklemede', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
      completed: { text: '✅ Tamamlandı', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      cancelled: { text: '❌ İptal Edildi', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      processing: { text: '🔄 İşleniyor', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    };

    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getTotalPrice = () => {
    if (!order.items || order.items.length === 0) return order.total_amount || 0;
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Sipariş Detayları #{order.id}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sipariş No: {order.order_number || `ORD-${order.id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Müşteri</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {order.user_name || order.customer_name || `Kullanıcı #${order.user_id}`}
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Durum</p>
              <div>{getStatusBadge(order.status)}</div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Oluşturulma Tarihi</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{formatDate(order.created_at)}</p>
            </div>

            {order.completed_at && (
              <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Tamamlanma Tarihi</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{formatDate(order.completed_at)}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Sipariş Ürünleri</h3>

            <div className="bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Ürün
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Birim Fiyat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Miktar
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {item.name || item.product_name || 'Bilinmeyen Ürün'}
                            </p>
                            {item.sku && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100">
                          ₺{item.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                            {item.quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                          ₺{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Ürün bilgisi bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">TOPLAM TUTAR</span>
              <span className="text-3xl font-bold text-blue-600">
                ₺{getTotalPrice().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Notlar</h3>
              <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t p-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 transition font-semibold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
