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
      pending: { text: '⏳ Beklemede', className: 'bg-orange-100 text-orange-700' },
      completed: { text: '✅ Tamamlandı', className: 'bg-green-100 text-green-700' },
      cancelled: { text: '❌ İptal Edildi', className: 'bg-red-100 text-red-700' },
      processing: { text: '🔄 İşleniyor', className: 'bg-blue-100 text-blue-700' },
    };

    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-700' };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Sipariş Detayları #{order.id}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Sipariş No: {order.order_number || `ORD-${order.id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Müşteri</p>
              <p className="font-semibold text-gray-800">
                {order.user_name || order.customer_name || `Kullanıcı #${order.user_id}`}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Durum</p>
              <div>{getStatusBadge(order.status)}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Oluşturulma Tarihi</p>
              <p className="font-semibold text-gray-800">{formatDate(order.created_at)}</p>
            </div>

            {order.completed_at && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Tamamlanma Tarihi</p>
                <p className="font-semibold text-gray-800">{formatDate(order.completed_at)}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Sipariş Ürünleri</h3>

            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ürün
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Birim Fiyat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Miktar
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800">
                              {item.name || item.product_name || 'Bilinmeyen Ürün'}
                            </p>
                            {item.sku && (
                              <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">
                          ₺{item.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                            {item.quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          ₺{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                        Ürün bilgisi bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">TOPLAM TUTAR</span>
              <span className="text-3xl font-bold text-blue-600">
                ₺{getTotalPrice().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Notlar</h3>
              <p className="text-gray-600 bg-gray-50 rounded-lg p-4">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
