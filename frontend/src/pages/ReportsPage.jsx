import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    products: [],
    orders: [],
    loading: true,
    stats: {
      totalRevenue: 0,
      totalProducts: 0,
      averageOrderValue: 0,
      topSellingCategory: '',
    },
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setReportData((prev) => ({ ...prev, loading: true }));

      // Fetch all data
      const productsRes = await productService.getAll({ limit: 100 });
      const ordersRes = await orderService.getAll({ limit: 100 });

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];

      // Calculate stats
      const completedOrders = orders.filter((o) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      );
      const averageOrderValue =
        completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Get categories
      const categories = {};
      products.forEach((product) => {
        if (product.category) {
          categories[product.category] = (categories[product.category] || 0) + 1;
        }
      });

      const topSellingCategory =
        Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Yok';

      setReportData({
        products,
        orders,
        loading: false,
        stats: {
          totalRevenue,
          totalProducts: products.length,
          averageOrderValue,
          topSellingCategory,
        },
      });
    } catch (error) {
      console.error('Report data fetch error:', error);
      setReportData((prev) => ({ ...prev, loading: false }));
    }
  };

  if (reportData.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Raporlar</h1>
        <p className="text-gray-600 mt-2">Sistem istatistikleri ve analizleri</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Toplam Gelir</h3>
          <p className="text-3xl font-bold">₺{reportData.stats.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Toplam Ürün</h3>
          <p className="text-3xl font-bold">{reportData.stats.totalProducts}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Ortalama Sipariş</h3>
          <p className="text-3xl font-bold">₺{reportData.stats.averageOrderValue.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">En Popüler Kategori</h3>
          <p className="text-2xl font-bold">{reportData.stats.topSellingCategory}</p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sipariş Durumu Dağılımı</h2>
        <div className="grid grid-cols-4 gap-4">
          {['pending', 'completed', 'cancelled', 'processing'].map((status) => {
            const count = reportData.orders.filter((o) => o.status === status).length;
            const percentage = reportData.orders.length > 0 
              ? ((count / reportData.orders.length) * 100).toFixed(1) 
              : '0';
            
            const statusText = {
              pending: 'Bekleyen',
              completed: 'Tamamlanan',
              cancelled: 'İptal',
              processing: 'İşleniyor',
            };

            const statusColor = {
              pending: 'bg-yellow-500',
              completed: 'bg-green-500',
              cancelled: 'bg-red-500',
              processing: 'bg-blue-500',
            };

            return (
              <div key={status} className="text-center">
                <div className={`${statusColor[status]} w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-2xl font-bold`}>
                  {count}
                </div>
                <p className="text-sm font-medium text-gray-700">{statusText[status]}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Kategori Dağılımı</h2>
        <div className="space-y-2">
          {Object.entries(
            reportData.products.reduce((acc, product) => {
              const cat = product.category || 'Diğer';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {})
          ).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">{category}</span>
              </div>
              <span className="font-semibold text-gray-800">{count} ürün</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
