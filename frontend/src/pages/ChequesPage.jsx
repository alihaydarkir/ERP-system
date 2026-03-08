import React, { useState, useEffect } from 'react';
import useChequeStore from '../store/chequeStore';
import chequeService from '../services/chequeService';
import ChequeStatistics from '../components/Cheques/ChequeStatistics';
import ChequeList from '../components/Cheques/ChequeList';
import ChequeForm from '../components/Cheques/ChequeForm';
import ChequeDetailView from '../components/Cheques/ChequeDetailView';
import ChequeExcelImport from '../components/Cheques/ChequeExcelImport';
import ChequeStatusChangeModal from '../components/Cheques/ChequeStatusChangeModal';
import DueSoonAlert from '../components/Cheques/DueSoonAlert';
import useUIStore from '../store/uiStore';

const ChequesPage = () => {
  const { showSuccess, showError, showConfirm } = useUIStore();
  const {
    setCheques,
    addCheque,
    updateCheque,
    deleteCheque,
    setStatistics,
    setDueSoonCheques,
    setOverdueCheques,
    setPagination,
    setLoading,
    setError,
    getQueryParams
  } = useChequeStore();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editingCheque, setEditingCheque] = useState(null);

  // Load data on mount and when filters/pagination change
  useEffect(() => {
    loadCheques();
    loadStatistics();
    loadDueSoon();
  }, []);

  // Reload cheques when filters or pagination change
  const store = useChequeStore();
  useEffect(() => {
    loadCheques();
  }, [store.filters, store.pagination.page, store.pagination.limit, store.sorting]);

  const loadCheques = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = getQueryParams();
      const response = await chequeService.getAll(params);

      if (response.success) {
        setCheques(response.data);
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total
        });
      }
    } catch (error) {
      console.error('Failed to load cheques:', error);
      setError('Çekler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await chequeService.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const loadDueSoon = async () => {
    try {
      const response = await chequeService.getDueSoon(7);
      if (response.success) {
        setDueSoonCheques(response.data.dueSoon || []);
        setOverdueCheques(response.data.overdue || []);
      }
    } catch (error) {
      console.error('Failed to load due soon cheques:', error);
    }
  };

  const handleCreateCheque = async (data) => {
    try {
      const response = await chequeService.create(data);
      if (response.success) {
        addCheque(response.data);
        setShowForm(false);
        loadCheques();
        loadStatistics();
        loadDueSoon();
        showSuccess('Çek başarıyla eklendi');
      }
    } catch (error) {
      console.error('Failed to create cheque:', error);
      showError('Çek eklenirken hata oluştu');
    }
  };

  const handleUpdateCheque = async (data) => {
    try {
      const response = await chequeService.update(editingCheque.id, data);
      if (response.success) {
        updateCheque(editingCheque.id, response.data);
        setEditingCheque(null);
        setShowForm(false);
        loadCheques();
        loadStatistics();
        showSuccess('Çek başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Failed to update cheque:', error);
      showError('Çek güncellenirken hata oluştu');
    }
  };

  const handleDeleteCheque = async (cheque) => {
    showConfirm({
      title: 'Çeki Sil',
      message: `${cheque.check_serial_no} numaralı çeki silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await chequeService.delete(cheque.id);
          if (response.success) {
            deleteCheque(cheque.id);
            loadCheques();
            loadStatistics();
            loadDueSoon();
            showSuccess('Çek başarıyla silindi');
          }
        } catch (error) {
          console.error('Failed to delete cheque:', error);
          showError('Çek silinirken hata oluştu');
        }
      }
    });
  };

  const handleChangeStatus = async (chequeId, updateData) => {
    try {
      const response = await chequeService.update(chequeId, updateData);
      if (response.success) {
        updateCheque(chequeId, response.data);
        setShowDetail(false);
        setSelectedCheque(null);
        loadCheques();
        loadStatistics();
        loadDueSoon();
        showSuccess('Çek durumu başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Failed to change status:', error);
      showError('Durum değiştirirken hata oluştu');
    }
  };

  const handleChequeClick = async (cheque) => {
    try {
      const response = await chequeService.getById(cheque.id);
      if (response.success) {
        setSelectedCheque(response.data);
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Failed to load cheque details:', error);
      showError('Çek detayları yüklenemedi');
    }
  };

  const handleEditClick = (cheque) => {
    setEditingCheque(cheque);
    setShowForm(true);
  };

  const handleStatusClick = async (cheque) => {
    try {
      const response = await chequeService.getById(cheque.id);
      if (response.success) {
        setSelectedCheque(response.data);
        setShowStatusModal(true);
      }
    } catch (error) {
      console.error('Failed to load cheque details:', error);
      showError('Çek detayları yüklenemedi');
    }
  };

  const handleStatusUpdate = async (chequeId, updateData) => {
    try {
      const response = await chequeService.update(chequeId, updateData);
      if (response.success) {
        updateCheque(chequeId, response.data);
        setShowStatusModal(false);
        setSelectedCheque(null);
        loadCheques();
        loadStatistics();
        loadDueSoon();
        showSuccess('Çek durumu başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showError('Durum güncellenirken hata oluştu');
    }
  };

  const handleImportComplete = () => {
    setShowImport(false);
    loadCheques();
    loadStatistics();
    loadDueSoon();
  };

  const handleExportToExcel = async () => {
    try {
      const params = getQueryParams();
      await chequeService.exportToExcel(params);
    } catch (error) {
      console.error('Failed to export:', error);
      showError('Excel export sırasında hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Çek Yönetimi</h1>
              <p className="text-gray-600 mt-1">Müşterilerden alınan çekleri yönetin</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Excel'e Aktar</span>
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center space-x-2"
              >
                <span>📥</span>
                <span>Excel'den Yükle</span>
              </button>

              <button
                onClick={() => {
                  setEditingCheque(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Yeni Çek</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <ChequeStatistics />

        {/* Due Soon Alerts */}
        <DueSoonAlert onChequeClick={handleChequeClick} />

        {/* Cheques List */}
        <ChequeList
          onChequeClick={handleChequeClick}
          onEditCheque={handleEditClick}
          onDeleteCheque={handleDeleteCheque}
          onChangeStatus={handleStatusClick}
        />

        {/* Modals */}
        {showForm && (
          <ChequeForm
            cheque={editingCheque}
            onSubmit={editingCheque ? handleUpdateCheque : handleCreateCheque}
            onCancel={() => {
              setShowForm(false);
              setEditingCheque(null);
            }}
          />
        )}

        {showDetail && selectedCheque && (
          <ChequeDetailView
            cheque={selectedCheque}
            onClose={() => {
              setShowDetail(false);
              setSelectedCheque(null);
            }}
            onChangeStatus={handleChangeStatus}
          />
        )}

        {showImport && (
          <ChequeExcelImport
            onClose={() => setShowImport(false)}
            onImportComplete={handleImportComplete}
          />
        )}

        {showStatusModal && selectedCheque && (
          <ChequeStatusChangeModal
            cheque={selectedCheque}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedCheque(null);
            }}
            onSubmit={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ChequesPage;
