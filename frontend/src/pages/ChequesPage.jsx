import React, { useState, useEffect } from 'react';
import useChequeStore from '../store/chequeStore';
import chequeService from '../services/chequeService';
import { exportChequesToPDF, exportChequesToExcel } from '../utils/exportUtils';
import ChequeStatistics from '../components/Cheques/ChequeStatistics';
import ChequeList from '../components/Cheques/ChequeList';
import ChequeForm from '../components/Cheques/ChequeForm';
import ChequeDetailView from '../components/Cheques/ChequeDetailView';
import ChequeExcelImport from '../components/Cheques/ChequeExcelImport';
import ChequeStatusChangeModal from '../components/Cheques/ChequeStatusChangeModal';
import DueSoonAlert from '../components/Cheques/DueSoonAlert';
import BankTransferForm from '../components/Cheques/BankTransferForm';
import BankTransferList from '../components/Cheques/BankTransferList';
import bankTransferService from '../services/bankTransferService';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import usePermissionStore from '../store/permissionStore';
import { FileSpreadsheet, FileText, Upload, Plus, CreditCard, Banknote } from 'lucide-react';

const ChequesPage = () => {
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer';
  const { showSuccess, showError, showConfirm } = useUIStore();
  const {
    cheques,
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

  // Ödemeler sekmeleri: çek | banka havalesi
  const [activeTab, setActiveTab] = useState('cheque');
  const [transfers, setTransfers] = useState([]);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const canDeleteTransfer = usePermissionStore((s) => s.permissions).includes('cheques.delete') || ['admin', 'manager'].includes(user?.role);

  const loadTransfers = async () => {
    try {
      const res = await bankTransferService.getAll({ limit: 200 });
      if (res.success) setTransfers(res.data || []);
    } catch (e) {
      console.error('Havaleler yüklenemedi:', e);
    }
  };

  useEffect(() => { if (activeTab === 'transfer') loadTransfers(); }, [activeTab]);

  const handleCreateTransfer = async (payload) => {
    try {
      const res = await bankTransferService.create(payload);
      if (res.success) {
        showSuccess('Banka havalesi kaydedildi, cari hesaba işlendi');
        setShowTransferForm(false);
        loadTransfers();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Havale kaydedilemedi');
    }
  };

  const handleDeleteTransfer = (id) => {
    showConfirm({
      title: 'Havaleyi Sil',
      message: 'Bu banka havalesini silmek istediğinize emin misiniz? Cari hesaptan da geri alınır.',
      confirmText: 'Sil', cancelText: 'İptal', type: 'danger',
      onConfirm: async () => {
        try {
          await bankTransferService.delete(id);
          showSuccess('Havale silindi');
          loadTransfers();
        } catch (error) {
          showError(error.response?.data?.message || 'Havale silinemedi');
        }
      },
    });
  };

  // Load data on mount and when filters/pagination change
  useEffect(() => {
    loadCheques();
    loadStatistics();
    loadDueSoon();
  }, []);

  // Reload when AI chatbot creates/updates a cheque
  useEffect(() => {
    const handler = (e) => {
      const tool = e.detail?.tool || '';
      if (/cheque|çek/.test(tool)) {
        loadCheques();
        loadStatistics();
      }
    };
    window.addEventListener('erp:data_changed', handler);
    return () => window.removeEventListener('erp:data_changed', handler);
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
      const response = await chequeService.changeStatus(chequeId, updateData);
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
      const response = await chequeService.changeStatus(chequeId, updateData);
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
      if (!cheques || cheques.length === 0) {
        showError('Excel oluşturmak için önce çekleri yükleyin');
        return;
      }
      await exportChequesToExcel(cheques);
      showSuccess('Excel başarıyla indirildi');
    } catch (error) {
      console.error('Failed to export:', error);
      showError('Excel export sırasında hata oluştu');
    }
  };

  const handleExportToPDF = async () => {
    try {
      if (!cheques || cheques.length === 0) {
        showError('PDF oluşturmak için önce çekleri yükleyin');
        return;
      }
      await exportChequesToPDF(cheques);
      showSuccess('PDF başarıyla indirildi');
    } catch (error) {
      console.error('PDF export error:', error);
      showError('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ödemeler</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Çek ve banka havalesi ödemelerini yönetin</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {activeTab === 'cheque' ? (
                <>
                  <button
                    onClick={handleExportToExcel}
                    className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    <span>Excel'e Aktar</span>
                  </button>

                  <button
                    onClick={handleExportToPDF}
                    className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg shadow-md hover:from-rose-600 hover:to-rose-700 hover:shadow-rose-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span>PDF'e Aktar</span>
                  </button>

                  {!isCustomer && (
                    <>
                      <button
                        onClick={() => setShowImport(true)}
                        className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg shadow-md hover:from-violet-600 hover:to-violet-700 hover:shadow-violet-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        <span>Excel'den Yükle</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingCheque(null);
                          setShowForm(true);
                        }}
                        className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Yeni Çek</span>
                      </button>
                    </>
                  )}
                </>
              ) : (
                !isCustomer && (
                  <button
                    onClick={() => setShowTransferForm(true)}
                    className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Yeni Banka Havalesi</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Sekmeler: Çek | Banka Havalesi */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('cheque')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === 'cheque' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <CreditCard size={16} /> Çekler
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === 'transfer' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <Banknote size={16} /> Banka Havalesi
            </button>
          </div>
        </div>

        {/* ── ÇEK SEKMESİ (birebir aynı) ── */}
        {activeTab === 'cheque' && (
          <>
            <ChequeStatistics />
            <DueSoonAlert onChequeClick={handleChequeClick} />
            <ChequeList
              onChequeClick={handleChequeClick}
              onEditCheque={handleEditClick}
              onDeleteCheque={handleDeleteCheque}
              onChangeStatus={handleStatusClick}
            />
          </>
        )}

        {/* ── BANKA HAVALESİ SEKMESİ ── */}
        {activeTab === 'transfer' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <BankTransferList
              transfers={transfers}
              onDelete={handleDeleteTransfer}
              canDelete={canDeleteTransfer}
            />
          </div>
        )}

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

        {showTransferForm && (
          <BankTransferForm
            onSubmit={handleCreateTransfer}
            onCancel={() => setShowTransferForm(false)}
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
