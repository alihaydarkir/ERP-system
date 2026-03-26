import { useState } from 'react';
import OrderCard from './OrderCard';
import LoadingState from '../UI/LoadingState';
import EmptyState from '../UI/EmptyState';

export default function CompletedOrdersSection({ orders, onView, loading }) {
  const [displayCount, setDisplayCount] = useState(6);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 6);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">✅ TAMAMLANAN SİPARİŞLER</h2>
        <LoadingState title="Tamamlanan siparişler yükleniyor..." />
      </div>
    );
  }

  const displayedOrders = orders.slice(0, displayCount);
  const hasMore = displayCount < orders.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          ✅ TAMAMLANAN SİPARİŞLER
          <span className="ml-2 text-green-600 dark:text-green-400">({orders.length})</span>
        </h2>
      </div>

      {orders.length === 0 ? (
        <EmptyState message="Tamamlanan sipariş bulunmamaktadır." />
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
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold"
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
