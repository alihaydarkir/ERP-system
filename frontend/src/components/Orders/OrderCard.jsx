export default function OrderCard({ order, onComplete, onCancel, onView, isPending }) {
  const totalAmount = Number(order.total_amount || 0);
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
    };

    const config = statusConfig[status] || { text: status, className: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getProductNames = () => {
    if (!order.items || order.items.length === 0) return 'Ürün yok';

    // If items is an array of objects with product_name or name
    const names = order.items.map(item => item.product_name || item.name || 'Bilinmeyen').slice(0, 3);
    const remaining = order.items.length - 3;

    return names.join(', ') + (remaining > 0 ? ` +${remaining} diğer` : '');
  };

  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">Sipariş #{order.id}</h3>
          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Customer Info */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Müşteri:</span> {order.customer_name || order.user_name || 'Bilinmiyor'}
        </p>
        {order.customer_company && (
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-medium">Şirket:</span> {order.customer_company}
          </p>
        )}
      </div>

      {/* Products */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Ürünler:</span> {getProductNames()}
        </p>
      </div>

      {/* Total Amount */}
      <div className="mb-4 pt-3 border-t">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Toplam:</span>{' '}
          <span className="text-lg font-bold text-blue-600">
            ₺{totalAmount.toFixed(2)}
          </span>
        </p>
      </div>

      {/* Completed Date (for completed orders) */}
      {!isPending && order.completed_at && (
        <div className="mb-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Tamamlanma:</span> {formatDate(order.completed_at)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => onView(order)}
          className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm"
        >
          👁️ Göster
        </button>

        {isPending ? (
          <>
            <button
              onClick={() => onComplete(order.id)}
              className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm"
            >
              ✅ Tamamla
            </button>
            <button
              onClick={() => onCancel(order.id)}
              className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition font-medium text-sm"
            >
              ❌ İptal
            </button>
          </>
        ) : (
          <button
            onClick={() => onView(order)}
            className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
          >
            👁️ Detay
          </button>
        )}
      </div>
    </div>
  );
}
