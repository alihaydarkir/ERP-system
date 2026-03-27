import ProductForm from './ProductForm';

export default function ProductFormModal({
  isOpen,
  editingProduct,
  formData,
  formErrors,
  suppliers,
  warehouses,
  onChange,
  onSubmit,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
        </h2>

        <ProductForm
          formData={formData}
          formErrors={formErrors}
          suppliers={suppliers}
          warehouses={warehouses}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onClose}
          submitLabel={editingProduct ? 'Güncelle' : 'Oluştur'}
        />
      </div>
    </div>
  );
}
