import { useState, useEffect } from 'react';
import CustomerForm from '../components/Customers/CustomerForm';
import CustomerList from '../components/Customers/CustomerList';
import ImportCustomersDialog from '../components/Customers/ImportCustomersDialog';
import { customerService } from '../services/customerService';
import useUIStore from '../store/uiStore';
import { exportCustomersToPDF, exportCustomersToExcel } from '../utils/exportUtils';
import { FileDown, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getAll({ limit: 100 });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Fetch customers error:', error);
      showError('Müşteriler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchCustomers();
      return;
    }

    try {
      setIsLoading(true);
      const response = await customerService.search(searchTerm);
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
      showError('Arama sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (formData) => {
    try {
      await customerService.create(formData);
      showSuccess('Müşteri başarıyla eklendi!');
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Create customer error:', error);
      const errorMessage = error.response?.data?.message || 'Müşteri eklenirken bir hata oluştu';
      showError(errorMessage);
      throw error; // Re-throw to let form handle it
    }
  };

  const handleUpdateCustomer = async (formData) => {
    try {
      await customerService.update(selectedCustomer.id, formData);
      showSuccess('Müşteri başarıyla güncellendi!');
      setShowModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Update customer error:', error);
      const errorMessage = error.response?.data?.message || 'Müşteri güncellenirken bir hata oluştu';
      showError(errorMessage);
      throw error; // Re-throw to let form handle it
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (customer) => {
    showConfirm({
      title: 'Müşteriyi Sil',
      message: `${customer.company_name} adlı müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: async () => {
        try {
          await customerService.delete(customer.id);
          showSuccess('Müşteri başarıyla silindi');
          fetchCustomers();
        } catch (error) {
          console.error('Delete customer error:', error);
          showError('Müşteri silinirken bir hata oluştu');
        }
      }
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(search) ||
      customer.company_name?.toLowerCase().includes(search) ||
      customer.tax_number?.toLowerCase().includes(search) ||
      customer.phone_number?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Müşteri Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Müşteri/tedarikçi bilgilerini yönetin</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { exportCustomersToPDF(filteredCustomers); toast.success('PDF olarak indirildi!'); }}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-red-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FileDown className="w-5 h-5 mr-2" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => { exportCustomersToExcel(filteredCustomers); toast.success('Excel olarak indirildi!'); }}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow-green-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
            <span>Yeni Müşteri Ekle</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Müşteri ara (ad, şirket, vergi no, telefon)..."
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

      {/* Customer List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
        <CustomerList
          customers={filteredCustomers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Modal for Add/Edit Customer */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 transition-opacity" aria-hidden="true">
               <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/500 dark:bg-black opacity-75 backdrop-blur-sm"></div>
             </div>
             <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <CustomerForm
                customer={selectedCustomer}
                onSave={selectedCustomer ? handleUpdateCustomer : handleCreateCustomer}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      <ImportCustomersDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
