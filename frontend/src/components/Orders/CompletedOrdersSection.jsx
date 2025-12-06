import { useState } from 'react';
import OrderCard from './OrderCard';

export default function CompletedOrdersSection({ orders, onView, loading }) {
  const [displayCount, setDisplayCount] = useState(6);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 6);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">✅ TAMAMLANAN SİPARİŞLER</h2>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  const displayedOrders = orders.slice(0, displayCount);
  const hasMore = displayCount < orders.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ✅ TAMAMLANAN SİPARİŞLER
          <span className="ml-2 text-green-600">({orders.length})</span>
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Tamamlanan sipariş bulunmamaktadır.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onView={onView}
                isPending={false}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
              >
                Daha Fazla Yükle ({orders.length - displayCount} kaldı)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
