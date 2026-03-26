import { useState, useEffect, useMemo } from 'react';
import { productService } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { warehouseService } from '../services/warehouseService';
import ImportProductsDialog from '../components/Products/ImportProductsDialog';
import CategoryFilter from '../components/Products/CategoryFilter';
import useUIStore from '../store/uiStore';
import PermissionGuard from '../components/PermissionGuard';
import { exportProductsToPDF, exportProductsToExcel } from '../utils/exportUtils';
import { FileDown, FileSpreadsheet, Plus, Upload, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    sku: '',
    low_stock_threshold: '10',
    supplier_id: '',
    warehouse_id: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchWarehouses();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierService.getAll({ limit: 100, is_active: 'true' });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Suppliers fetch error:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAll({ limit: 100, is_active: 'true' });
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Warehouses fetch error:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll({ limit: 10000 });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Products fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        showSuccess('Ürün başarıyla güncellendi!');
      } else {
        await productService.create(formData);
        showSuccess('Ürün başarıyla eklendi!');
      }
      setShowModal(false);
      resetForm();
      await fetchProducts();
    } catch (error) {
      showError(error.response?.data?.message || 'İşlem başarısız!');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      sku: product.sku,
      low_stock_threshold: product.low_stock_threshold || '10',
      supplier_id: product.supplier_id || '',
      warehouse_id: product.warehouse_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    showConfirm({
      title: 'Ürünü Sil',
      message: `"${name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: async () => {
        try {
          const result = await productService.delete(id);
          showSuccess(result?.message || 'Ürün başarıyla silindi!');
          await fetchProducts();
        } catch (error) {
          showError(error?.response?.data?.message || 'Silme işlemi başarısız!');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      sku: '',
      low_stock_threshold: '10',
      supplier_id: '',
      warehouse_id: '',
    });
    setEditingProduct(null);
  };

  const getStockColor = (stock) => {
    if (stock < 10) return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    if (stock < 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ürünler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Ürün yönetimi ve stok takibi</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Export Buttons */}
          <button
            onClick={() => {
              exportProductsToPDF(filteredProducts);
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
              exportProductsToExcel(filteredProducts);
              toast.success('Excel olarak indirildi!');
            }}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow-green-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            title="Excel olarak indir"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            <span>Excel</span>
          </button>
          
          <PermissionGuard permission="products.create">
            <button
              onClick={() => setShowImportDialog(true)}
              className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="w-5 h-5 mr-2" />
              <span>Excel'den Yükle</span>
            </button>
          </PermissionGuard>
          <PermissionGuard permission="products.create">
            <button
              onClick={() => setShowModal(true)}
              className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span>Yeni Ürün</span>
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Main Content: Sidebar + Products Table */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Category Filter */}
        <div className="col-span-3">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            products={products}
          />
        </div>

        {/* Right Content - Products Table */}
        <div className="col-span-9">

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tedarikçi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Depo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fiyat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      Ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{product.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block" title={product.description}>
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {suppliers.find(s => s.id === product.supplier_id)?.supplier_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {warehouses.find(w => w.id === product.warehouse_id)?.warehouse_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      ₺{product.price?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border border-transparent ${getStockColor(
                          product.stock
                        )}`}
                      >
                        {product.stock} adet
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex justify-end gap-2">
                      <PermissionGuard permission="products.edit">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={18} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="products.delete">
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Ürün Adı"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea
                placeholder="Açıklama"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
              <input
                type="text"
                placeholder="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Kategori"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tedarikçi
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tedarikçi Seçiniz</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Depo
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Depo Seçiniz</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouse_name} ({warehouse.warehouse_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Fiyat"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Stok"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Düşük Stok Limiti
                </label>
                <input
                  type="number"
                  placeholder="Minimum stok miktarı"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Stok bu değerin altına düştüğünde uyarı verilecektir
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-800/50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      <ImportProductsDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          fetchProducts();
          setShowImportDialog(false);
        }}
      />
    </div>
  );
}
