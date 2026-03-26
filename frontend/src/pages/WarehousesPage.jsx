import { useState, useEffect } from 'react';
import { warehouseService } from '../services/warehouseService';
import useUIStore from '../store/uiStore';
import { Package, MapPin, Phone, Edit2, Trash2, Plus } from 'lucide-react';

export default function WarehousesPage() {
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    warehouse_name: '',
    warehouse_code: '',
    location: '',
    address: '',
    city: '',
    country: 'Türkiye',
    manager_name: '',
    phone: '',
    email: '',
    capacity: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseService.getAll({ limit: 100 });
      setWarehouses(response.data || []);
    } catch (error) {
      showError('Depolar yüklenemedi');
      console.error('Fetch warehouses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await warehouseService.update(selectedWarehouse.id, formData);
        showSuccess('Depo güncellendi');
      } else {
        await warehouseService.create(formData);
        showSuccess('Depo oluşturuldu');
      }
      setShowModal(false);
      resetForm();
      fetchWarehouses();
    } catch (error) {
      showError(error.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleEdit = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      warehouse_name: warehouse.warehouse_name,
      warehouse_code: warehouse.warehouse_code,
      location: warehouse.location || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      country: warehouse.country || 'Türkiye',
      manager_name: warehouse.manager_name || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      capacity: warehouse.capacity || '',
      notes: warehouse.notes || '',
      is_active: warehouse.is_active
    });
    setShowModal(true);
  };

  const handleDelete = (warehouse) => {
    showConfirm({
      title: 'Depo Sil',
      message: `"${warehouse.warehouse_name}" deposunu silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: async () => {
        try {
          await warehouseService.delete(warehouse.id);
          showSuccess('Depo silindi');
          fetchWarehouses();
        } catch (error) {
          showError(error.response?.data?.message || 'Silme başarısız');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      warehouse_name: '',
      warehouse_code: '',
      location: '',
      address: '',
      city: '',
      country: 'Türkiye',
      manager_name: '',
      phone: '',
      email: '',
      capacity: '',
      notes: '',
      is_active: true
    });
    setSelectedWarehouse(null);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Depo Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Depo ve stok lokasyonlarını yönetin</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="group relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
        >
          <Plus size={18} className="mr-2" />
          <span>Yeni Depo Ekle</span>
        </button>
      </div>

      {/* Warehouses Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depo Adı</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lokasyon</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Yetkili</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kapasite</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Package size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-300 mb-3" />
                        <p className="text-lg font-medium">Henüz depo bulunmuyor</p>
                        <p className="text-sm mt-1">Yeni bir depo ekleyerek başlayın.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Package size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{warehouse.warehouse_name}</div>
                            {warehouse.city && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                                <MapPin size={12} className="mr-1" />
                                {warehouse.city}, {warehouse.country}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-semibold">
                           {warehouse.warehouse_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {warehouse.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{warehouse.manager_name || '-'}</div>
                        {warehouse.phone && (
                           <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                              <Phone size={12} className="mr-1" /> {warehouse.phone}
                           </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {warehouse.capacity || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            warehouse.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {warehouse.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(warehouse)}
                              className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(warehouse)}
                              className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Basic Implementation for Reusability */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/500 dark:bg-black opacity-75 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    {selectedWarehouse ? 'Depoyu Düzenle' : 'Yeni Depo Oluştur'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Depo Adı *</label>
                            <input
                            type="text"
                            required
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                            value={formData.warehouse_name}
                            onChange={(e) => setFormData({...formData, warehouse_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Depo Kodu *</label>
                            <input
                            type="text"
                            required
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                            value={formData.warehouse_code}
                            onChange={(e) => setFormData({...formData, warehouse_code: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasyon / Adres Başlığı</label>
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yetkili Kişi</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                                value={formData.manager_name}
                                onChange={(e) => setFormData({...formData, manager_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şehir</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                                value={formData.city}
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasite</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3 py-2"
                                value={formData.capacity}
                                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="is_active"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Bu depo aktif olarak kullanılıyor
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {selectedWarehouse ? 'Güncelle' : 'Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
