import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { warehouseService } from '../services/warehouseService';
import ImportProductsDialog from '../components/Products/ImportProductsDialog';
import ProductsHeader from '../components/Products/ProductsHeader';
import ProductFilters from '../components/Products/ProductFilters';
import ProductList from '../components/Products/ProductList';
import ProductFormModal from '../components/Products/ProductFormModal';
import useUIStore from '../store/uiStore';
import ErrorState from '../components/UI/ErrorState';
import { exportProductsToPDF, exportProductsToExcel } from '../utils/exportUtils';
import { hasEntityValidationErrors, validateProductForm } from '../utils/validators/entityValidators';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [visibleProducts, setVisibleProducts] = useState([]);
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
  const [formErrors, setFormErrors] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    low_stock_threshold: ''
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
      setProductsError('');
      const response = await productService.getAll({ limit: 10000 });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Products fetch error:', error);
      setProductsError(error?.response?.data?.message || 'Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateProductForm(formData);
    setFormErrors(validationErrors);
    if (hasEntityValidationErrors(validationErrors)) {
      showError('Lütfen ürün formundaki hataları düzeltin.');
      return;
    }

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
    setFormErrors({
      name: '',
      sku: '',
      price: '',
      stock: '',
      low_stock_threshold: ''
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
    setFormErrors({
      name: '',
      sku: '',
      price: '',
      stock: '',
      low_stock_threshold: ''
    });
    setEditingProduct(null);
  };

  const handleFormFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="p-6">
      <ProductsHeader
        onExportPdf={() => {
          exportProductsToPDF(visibleProducts);
          toast.success('PDF olarak indirildi!');
        }}
        onExportExcel={() => {
          exportProductsToExcel(visibleProducts);
          toast.success('Excel olarak indirildi!');
        }}
        onOpenImport={() => setShowImportDialog(true)}
        onOpenCreate={() => setShowModal(true)}
      />

      {productsError && <ErrorState title="Ürün verisi yüklenemedi" message={productsError} onRetry={fetchProducts} />}

      <div className="space-y-4">
        <ProductFilters
          products={products}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
        />

        <ProductList
          loading={loading}
          products={products}
          suppliers={suppliers}
          warehouses={warehouses}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onVisibleProductsChange={setVisibleProducts}
        />
      </div>

      <ProductFormModal
        isOpen={showModal}
        editingProduct={editingProduct}
        formData={formData}
        formErrors={formErrors}
        suppliers={suppliers}
        warehouses={warehouses}
        onChange={handleFormFieldChange}
        onSubmit={handleSubmit}
        onClose={handleCloseModal}
      />

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
