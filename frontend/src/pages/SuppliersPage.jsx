import { useState, useEffect } from 'react';
import SupplierForm from '../components/Suppliers/SupplierForm';
import SupplierList from '../components/Suppliers/SupplierList';
import useSupplierStore from '../store/supplierStore';
import { exportSuppliersToPDF, exportSuppliersToExcel } from '../utils/exportUtils';
import { FileDown, FileSpreadsheet, Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import useUIStore from '../store/uiStore';

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showConfirm } = useUIStore();

  const {
    suppliers,
    isLoading,
    error,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    clearError
  } = useSupplierStore();

  useEffect(() => {
    fetchSuppliers({ limit: 100 });
  }, [fetchSuppliers]);

  const handleSearch = () => {
    fetchSuppliers({ search: searchTerm, limit: 100 });
  };

  const handleCreateSupplier = async (formData) => {
    try {
      await createSupplier(formData);
      toast.success('Tedarikçi başarıyla eklendi!');
      setShowModal(false);
      fetchSuppliers({ limit: 100 });
    } catch (error) {
      console.error('Create supplier error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Tedarikçi eklenirken bir hata oluştu');
      throw error;
    }
  };

  const handleUpdateSupplier = async (formData) => {
    try {
      await updateSupplier(selectedSupplier.id, formData);
      toast.success('Tedarikçi başarıyla güncellendi!');
      setShowModal(false);
      setSelectedSupplier(null);
      fetchSuppliers({ limit: 100 });
    } catch (error) {
      console.error('Update supplier error:', error);
      toast.error(error.response?.data?.message || 'Tedarikçi güncellenirken bir hata oluştu');
      throw error;
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (supplier) => {
    showConfirm({
      title: 'Tedarikçi Sil',
      message: `${supplier.company_name} adlı tedarikçiyi silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: async () => {
        try {
          await deleteSupplier(supplier.id);
          toast.success('Tedarikçi başarıyla silindi');
          fetchSuppliers({ limit: 100 });
        } catch (error) {
          console.error('Delete supplier error:', error);
          toast.error(error.response?.data?.message || 'Tedarikçi silinirken bir hata oluştu');
        }
      }
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSupplier(null);
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      supplier.supplier_name?.toLowerCase().includes(search) ||
      supplier.contact_person?.toLowerCase().includes(search) ||
      supplier.tax_number?.toLowerCase().includes(search) ||
      supplier.phone?.toLowerCase().includes(search) ||
      supplier.address?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Tedarikçi Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tedarikçi bilgilerini yönetin ve satın alma siparişleri oluşturun</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              exportSuppliersToPDF(suppliers);
              toast.success('PDF olarak indirildi!');
            }}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-red-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="PDF olarak indir"
          >
            <FileDown className="w-5 h-5 mr-2" />
            <span>PDF</span>
          </button>
          
          <button
            onClick={() => {
              exportSuppliersToExcel(suppliers);
              toast.success('Excel olarak indirildi!');
            }}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow-green-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            title="Excel olarak indir"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => setShowImportDialog(true)}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Upload className="w-5 h-5 mr-2" />
            <span>Excel'den Yükle</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span>Yeni Tedarikçi Ekle</span>
          </button>
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Tedarikçi ara (şirket, kişi, vergi no, telefon)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <div className="absolute top-2.5 left-3 text-gray-400 dark:text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
          </div>
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
        <SupplierList
          suppliers={filteredSuppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Modal for Add/Edit Supplier */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 transition-opacity" aria-hidden="true">
               <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/500 dark:bg-black opacity-75 backdrop-blur-sm"></div>
             </div>
             <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block w-full max-w-3xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <SupplierForm
                supplier={selectedSupplier}
                onSave={selectedSupplier ? handleUpdateSupplier : handleCreateSupplier}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
