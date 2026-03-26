import { useState, useEffect } from 'react';
import PurchaseOrderList from '../components/Suppliers/PurchaseOrderList';
import PODetailModal from '../components/Suppliers/PODetailModal';
import useSupplierStore from '../store/supplierStore';
import useUIStore from '../store/uiStore';
import { Plus } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [detailPO, setDetailPO] = useState(null);
  const { showSuccess, showError, showConfirm } = useUIStore();

  const {
    purchaseOrders,
    isLoading,
    error,
    fetchPurchaseOrders,
    sendPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    fetchPurchaseOrderById,
    clearError
  } = useSupplierStore();

  useEffect(() => {
    fetchPurchaseOrders({ limit: 100 });
  }, [fetchPurchaseOrders]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    fetchPurchaseOrders({ status: status || undefined, limit: 100 });
  };

  const handleView = async (po) => {
    try {
      const detailedPO = await fetchPurchaseOrderById(po.id);
      setDetailPO(detailedPO);
    } catch (error) {
      showError('PO detayı yüklenirken hata oluştu');
    }
  };

  const handleSend = async (po) => {
    showConfirm({
      title: 'Siparişi Gönder',
      message: `${po.po_number} numaralı siparişi tedarikçiye göndermek istediğinize emin misiniz?`,
      confirmText: 'Gönder',
      type: 'warning',
      onConfirm: async () => {
        try {
          await sendPurchaseOrder(po.id);
          showSuccess('Sipariş başarıyla tedarikçiye gönderildi');
          fetchPurchaseOrders({ status: statusFilter || undefined, limit: 100 });
        } catch (error) {
          showError(error.response?.data?.message || 'Sipariş gönderilirken hata oluştu');
        }
      },
    });
  };

  const handleReceive = async (po) => {
    showConfirm({
      title: 'Siparişi Teslim Al',
      message: `${po.po_number} numaralı siparişi teslim almak istediğinize emin misiniz? Stok otomatik güncellenecek.`,
      confirmText: 'Teslim Al',
      type: 'success',
      onConfirm: async () => {
        try {
          const detailedPO = await fetchPurchaseOrderById(po.id);
          if (!detailedPO.items || detailedPO.items.length === 0) {
            showError('Bu siparişte ürün bulunmuyor');
            return;
          }
          const items = detailedPO.items.map(item => ({
            po_item_id: item.id,
            received_quantity: item.quantity - (item.received_quantity || 0),
          }));
          await receivePurchaseOrder(po.id, items);
          showSuccess('Sipariş teslim alındı, stok güncellendi');
          fetchPurchaseOrders({ status: statusFilter || undefined, limit: 100 });
        } catch (error) {
          showError(error.response?.data?.message || 'Sipariş teslim alınırken hata oluştu');
        }
      },
    });
  };

  const handleCancel = async (po) => {
    showConfirm({
      title: 'Siparişi İptal Et',
      message: `${po.po_number} numaralı siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'İptal Et',
      type: 'danger',
      onConfirm: async () => {
        try {
          await cancelPurchaseOrder(po.id);
          showSuccess('Sipariş başarıyla iptal edildi');
          fetchPurchaseOrders({ status: statusFilter || undefined, limit: 100 });
        } catch (error) {
          showError(error.response?.data?.message || 'Sipariş iptal edilirken hata oluştu');
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Satın Alma Siparişleri</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Tedarikçilerden yapılan satın alma siparişlerini yönetin</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <a
            href="/suppliers"
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni PO Oluştur</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={clearError}
            className="absolute top-0 right-0 px-4 py-3"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: '', label: 'Tümü' },
          { id: 'draft', label: 'Taslak' },
          { id: 'sent', label: 'Gönderildi' },
          { id: 'partial', label: 'Kısmi' },
          { id: 'received', label: 'Teslim Alındı' },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => handleFilterChange(filter.id)}
            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              statusFilter === filter.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Purchase Order List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
        <PurchaseOrderList
          purchaseOrders={purchaseOrders}
          onView={handleView}
          onSend={handleSend}
          onReceive={handleReceive}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>

      {/* PO Detay Modal */}
      {detailPO && (
        <PODetailModal po={detailPO} onClose={() => setDetailPO(null)} />
      )}
    </div>
  );
}
