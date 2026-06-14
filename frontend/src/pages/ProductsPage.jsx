import { useState } from 'react';
import ImportProductsDialog from '../components/Products/ImportProductsDialog';
import ProductsHeader from '../components/Products/ProductsHeader';
import ProductFilters from '../components/Products/ProductFilters';
import ProductList from '../components/Products/ProductList';
import ProductFormModal from '../components/Products/ProductFormModal';
import StockEntryModal from '../components/Products/StockEntryModal';
import useUIStore from '../store/uiStore';
import ErrorState from '../components/UI/ErrorState';
import { exportProductsToPDF, exportProductsToExcel } from '../utils/exportUtils';
import { hasEntityValidationErrors, validateProductForm } from '../utils/validators/entityValidators';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../hooks/useProducts';
import { useSuppliers } from '../hooks/useSuppliers';
import { useWarehouses } from '../hooks/useWarehouses';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '',
  sku: '',
  low_stock_threshold: '10',
  supplier_id: '',
  warehouse_id: '',
};

const EMPTY_ERRORS = {
  name: '',
  sku: '',
  price: '',
  stock: '',
  low_stock_threshold: '',
};

export default function ProductsPage() {
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer';
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [showModal, setShowModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(EMPTY_ERRORS);

  const { data: products = [], isLoading, isError, error, refetch } = useProducts({ limit: 10000 });
  const { data: suppliers = [] } = useSuppliers({ limit: 100, is_active: 'true', enabled: !isCustomer });
  const { data: warehouses = [] } = useWarehouses({ limit: 100, is_active: 'true', enabled: !isCustomer });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

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
        await updateProduct.mutateAsync({ id: editingProduct.id, data: formData });
        showSuccess('Ürün başarıyla güncellendi!');
      } else {
        await createProduct.mutateAsync(formData);
        showSuccess('Ürün başarıyla eklendi!');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      showError(err.response?.data?.message || 'İşlem başarısız!');
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
    setFormErrors(EMPTY_ERRORS);
    setShowModal(true);
  };

  const handleDelete = (id, name) => {
    showConfirm({
      title: 'Ürünü Sil',
      message: `"${name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: async () => {
        try {
          const result = await deleteProduct.mutateAsync(id);
          showSuccess(result?.message || 'Ürün başarıyla silindi!');
        } catch (err) {
          showError(err?.response?.data?.message || 'Silme işlemi başarısız!');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormErrors(EMPTY_ERRORS);
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
        onExportPdf={async () => {
          try { await exportProductsToPDF(visibleProducts); toast.success('PDF olarak indirildi!'); }
          catch { toast.error('PDF indirilemedi'); }
        }}
        onExportExcel={async () => {
          try { await exportProductsToExcel(visibleProducts); toast.success('Excel olarak indirildi!'); }
          catch { toast.error('Excel indirilemedi'); }
        }}
        onOpenImport={() => setShowImportDialog(true)}
        onOpenCreate={() => setShowModal(true)}
        onOpenStockEntry={() => setShowStockEntry(true)}
      />

      {showStockEntry && (
        <StockEntryModal
          onClose={() => setShowStockEntry(false)}
          onDone={() => { setShowStockEntry(false); refetch(); toast.success('Stok eklendi'); }}
        />
      )}

      {isError && (
        <ErrorState
          title="Ürün verisi yüklenemedi"
          message={error?.response?.data?.message || 'Ürünler yüklenemedi.'}
          onRetry={refetch}
        />
      )}

      <div className="space-y-4">
        <ProductFilters
          products={products}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
        />

        <ProductList
          loading={isLoading}
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

      <ImportProductsDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          refetch();
          setShowImportDialog(false);
        }}
      />
    </div>
  );
}
