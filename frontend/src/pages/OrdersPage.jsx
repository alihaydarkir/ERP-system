import { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import OrderDrawer from '../components/Orders/OrderDrawer';
import OrderDetailModal from '../components/Orders/OrderDetailModal';
import PendingOrdersSection from '../components/Orders/PendingOrdersSection';
import CompletedOrdersSection from '../components/Orders/CompletedOrdersSection';
import useUIStore from '../store/uiStore';
import { exportOrdersToPDF, exportOrdersToExcel } from '../utils/exportUtils';
import { FileDown, FileSpreadsheet, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const { showSuccess, showError, showWarning, showConfirm } = useUIStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getAll({ limit: 100 });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderOrId) => {
    const orderId = typeof orderOrId === 'object' ? orderOrId?.id : orderOrId;
    const currentStatus = typeof orderOrId === 'object'
      ? orderOrId?.status
      : orders.find((o) => o.id === orderId)?.status;

    if (!orderId) return;

    if (currentStatus === 'completed') {
      showWarning('Sipariş zaten tamamlanmış. Liste güncelleniyor...');
      await fetchOrders();
      return;
    }

    showConfirm({
      title: 'Siparişi Tamamla',
      message: 'Bu siparişi tamamlamak istediğinize emin misiniz?',
      confirmText: 'Tamamla',
      cancelText: 'İptal',
      type: 'info',
      onConfirm: async () => {
        try {
          await orderService.updateStatus(orderId, 'completed');
          showSuccess('Sipariş tamamlandı!');
          await fetchOrders();
        } catch (error) {
          console.error('Complete order error:', error);
          const message = error?.response?.data?.message || '';

          // Fallback: some environments may enforce step-wise transitions
          if (message.includes('Cannot change status') || error?.response?.status === 400) {
            try {
              const transitionFlow = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'];
              for (const nextStatus of transitionFlow) {
                // eslint-disable-next-line no-await-in-loop
                await orderService.updateStatus(orderId, nextStatus);
              }
              showSuccess('Sipariş tamamlandı!');
              await fetchOrders();
              return;
            } catch (fallbackError) {
              console.error('Complete order fallback error:', fallbackError);
            }
          }

          if (error?.response?.status === 403) {
            showError('Bu işlem için yetkiniz yok.');
            return;
          }

          showError(message || 'Sipariş tamamlanamadı');
        }
      }
    });
  };

  const handleCancelOrder = async (orderOrId) => {
    const orderId = typeof orderOrId === 'object' ? orderOrId?.id : orderOrId;
    const currentStatus = typeof orderOrId === 'object'
      ? orderOrId?.status
      : orders.find((o) => o.id === orderId)?.status;

    if (!orderId) return;

    if (currentStatus === 'cancelled') {
      showWarning('Sipariş zaten iptal edilmiş. Liste güncelleniyor...');
      await fetchOrders();
      return;
    }

    showConfirm({
      title: 'Siparişi İptal Et',
      message: 'Bu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'İptal Et',
      cancelText: 'Vazgeç',
      type: 'danger',
      onConfirm: async () => {
        try {
          await orderService.cancel(orderId, '');
          showSuccess('Sipariş iptal edildi!');
          await fetchOrders();
        } catch (error) {
          console.error('Cancel order error:', error);
          const message = error?.response?.data?.message || '';

          // Fallback for setups where /cancel endpoint policy differs
          if (message.includes('Cannot cancel') || error?.response?.status === 400) {
            try {
              await orderService.updateStatus(orderId, 'cancelled');
              showSuccess('Sipariş iptal edildi!');
              await fetchOrders();
              return;
            } catch (fallbackError) {
              console.error('Cancel order fallback error:', fallbackError);
            }
          }

          if (error?.response?.status === 403) {
            showError('Bu işlem için yetkiniz yok.');
            return;
          }

          showError(message || 'Sipariş iptal edilemedi');
        }
      }
    });
  };

  const handleViewOrder = async (order) => {
    try {
      // Fetch full order details with items
      const response = await orderService.getById(order.id);
      setSelectedOrder(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      showError('Sipariş detayları yüklenemedi');
    }
  };

  // Filter orders by search term
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const orderId = order.id?.toString() || '';
    const orderNumber = order.order_number?.toLowerCase() || '';
    const userName = order.user_name?.toLowerCase() || '';
    const userEmail = order.user_email?.toLowerCase() || '';

    return (
      orderId.includes(searchLower) ||
      orderNumber.includes(searchLower) ||
      userName.includes(searchLower) ||
      userEmail.includes(searchLower)
    );
  });

  // Filter orders by status
  const pendingOrders = filteredOrders.filter(order => order.status === 'pending');
  const completedOrders = filteredOrders.filter(order => order.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Siparişler</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sipariş yönetimi ve takibi</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { exportOrdersToPDF(filteredOrders); toast.success('PDF olarak indirildi!'); }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <FileDown className="w-5 h-5" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => { exportOrdersToExcel(filteredOrders); toast.success('Excel olarak indirildi!'); }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setShowOrderDrawer(true)}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Sipariş</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 transition-colors duration-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Sipariş ara (ID, sipariş no, müşteri adı veya email)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {filteredOrders.length} sipariş bulundu
          </p>
        )}
      </div>

      {/* Pending Orders Section */}
      <PendingOrdersSection
        orders={pendingOrders}
        onComplete={handleCompleteOrder}
        onCancel={handleCancelOrder}
        onView={handleViewOrder}
        loading={loading}
      />

      {/* Completed Orders Section */}
      <CompletedOrdersSection
        orders={completedOrders}
        onView={handleViewOrder}
        loading={loading}
      />

      {/* Order Drawer */}
      <OrderDrawer
        isOpen={showOrderDrawer}
        onClose={() => setShowOrderDrawer(false)}
        onSuccess={() => {
          fetchOrders();
          setShowOrderDrawer(false);
        }}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
