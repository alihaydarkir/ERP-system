import { useState, useEffect } from 'react';
import PurchaseOrderList from '../components/Suppliers/PurchaseOrderList';
import PODetailModal from '../components/Suppliers/PODetailModal';
import useSupplierStore from '../store/supplierStore';
import useUIStore from '../store/uiStore';

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
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Satın Alma Siparişleri</h1>
        <p className="text-gray-600 mt-2">Tedarikçilerden yapılan satın alma siparişlerini yönetin</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
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
      <div className="mb-6 flex gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => handleFilterChange('draft')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'draft'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Taslak
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Gönderildi
          </button>
          <button
            onClick={() => handleFilterChange('partial')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'partial'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Kısmi
          </button>
          <button
            onClick={() => handleFilterChange('received')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'received'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Teslim Alındı
          </button>
        </div>

        <a
          href="/suppliers"
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          Yeni PO Oluştur
        </a>
      </div>

      {/* Purchase Order List */}
      <div className="bg-white rounded-lg shadow-md">
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
