import { useState, useEffect } from 'react';
import SupplierForm from '../components/Suppliers/SupplierForm';
import SupplierList from '../components/Suppliers/SupplierList';
import useSupplierStore from '../store/supplierStore';

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      alert('Tedarikçi başarıyla eklendi!');
      setShowModal(false);
      fetchSuppliers({ limit: 100 });
    } catch (error) {
      console.error('Create supplier error:', error);
      alert(error.response?.data?.message || 'Tedarikçi eklenirken bir hata oluştu');
      throw error;
    }
  };

  const handleUpdateSupplier = async (formData) => {
    try {
      await updateSupplier(selectedSupplier.id, formData);
      alert('Tedarikçi başarıyla güncellendi!');
      setShowModal(false);
      setSelectedSupplier(null);
      fetchSuppliers({ limit: 100 });
    } catch (error) {
      console.error('Update supplier error:', error);
      alert(error.response?.data?.message || 'Tedarikçi güncellenirken bir hata oluştu');
      throw error;
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`${supplier.company_name} adlı tedarikçiyi silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await deleteSupplier(supplier.id);
      alert('Tedarikçi başarıyla silindi');
      fetchSuppliers({ limit: 100 });
    } catch (error) {
      console.error('Delete supplier error:', error);
      alert(error.response?.data?.message || 'Tedarikçi silinirken bir hata oluştu');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSupplier(null);
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      supplier.company_name?.toLowerCase().includes(search) ||
      supplier.contact_name?.toLowerCase().includes(search) ||
      supplier.tax_number?.toLowerCase().includes(search) ||
      supplier.phone_number?.toLowerCase().includes(search) ||
      supplier.location?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Tedarikçi Yönetimi</h1>
        <p className="text-gray-600 mt-2">Tedarikçi bilgilerini yönetin ve satın alma siparişleri oluşturun</p>
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

      {/* Search and Add Button */}
      <div className="mb-6 flex gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Tedarikçi ara (şirket, kişi, vergi no, telefon)..."
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
          Yeni Tedarikçi Ekle
        </button>
      </div>

      {/* Supplier List */}
      <div className="bg-white rounded-lg shadow-md">
        <SupplierList
          suppliers={filteredSuppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Modal for Add/Edit Supplier */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
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
