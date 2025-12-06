import OrderCard from './OrderCard';

export default function PendingOrdersSection({ orders, onComplete, onCancel, onView, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 BEKLEYEN SİPARİŞLER</h2>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          📋 BEKLEYEN SİPARİŞLER
          <span className="ml-2 text-orange-600">({orders.length})</span>
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Bekleyen sipariş bulunmamaktadır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onComplete={onComplete}
              onCancel={onCancel}
              onView={onView}
              isPending={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
