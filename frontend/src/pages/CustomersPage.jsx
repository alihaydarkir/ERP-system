import { useState, useEffect } from 'react';
import CustomerForm from '../components/Customers/CustomerForm';
import CustomerList from '../components/Customers/CustomerList';
import ImportCustomersDialog from '../components/Customers/ImportCustomersDialog';
import { customerService } from '../services/customerService';
import useUIStore from '../store/uiStore';
import { exportCustomersToPDF, exportCustomersToExcel } from '../utils/exportUtils';
import { FileDown, FileSpreadsheet } from 'lucide-react';
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
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Müşteri Yönetimi</h1>
        <p className="text-gray-600 mt-2">Müşteri/tedarikçi bilgilerini yönetin</p>
      </div>

      {/* Search and Add Button */}
      <div className="mb-6 flex gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Müşteri ara (ad, şirket, vergi no, telefon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { exportCustomersToPDF(filteredCustomers); toast.success('PDF olarak indirildi!'); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => { exportCustomersToExcel(filteredCustomers); toast.success('Excel olarak indirildi!'); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            📥 Excel'den Yükle
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Yeni Müşteri Ekle
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow-md">
        <CustomerList
          customers={filteredCustomers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Modal for Add/Edit Customer */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
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
