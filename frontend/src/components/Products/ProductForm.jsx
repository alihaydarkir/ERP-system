export default function ProductForm({
  formData,
  formErrors,
  suppliers,
  warehouses,
  onChange,
  onSubmit,
  onCancel,
  submitLabel
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Ürün Adı"
        value={formData.name}
        onChange={(e) => onChange('name', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      {formErrors.name && <p className="text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>}

      <textarea
        placeholder="Açıklama"
        value={formData.description}
        onChange={(e) => onChange('description', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="3"
      />

      <input
        type="text"
        placeholder="SKU"
        value={formData.sku}
        onChange={(e) => onChange('sku', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      {formErrors.sku && <p className="text-xs text-red-600 dark:text-red-400">{formErrors.sku}</p>}

      <input
        type="text"
        placeholder="Kategori"
        value={formData.category}
        onChange={(e) => onChange('category', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tedarikçi</label>
        <select
          value={formData.supplier_id}
          onChange={(e) => onChange('supplier_id', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tedarikçi Seçiniz</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Depo</label>
        <select
          value={formData.warehouse_id}
          onChange={(e) => onChange('warehouse_id', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Depo Seçiniz</option>
          {warehouses.map((warehouse) => (
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
          onChange={(e) => onChange('price', e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="number"
          placeholder="Stok"
          value={formData.stock}
          onChange={(e) => onChange('stock', e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {(formErrors.price || formErrors.stock) && (
        <div className="grid grid-cols-2 gap-4">
          <p className="text-xs text-red-600 dark:text-red-400">{formErrors.price}</p>
          <p className="text-xs text-red-600 dark:text-red-400">{formErrors.stock}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Düşük Stok Limiti</label>
        <input
          type="number"
          placeholder="Minimum stok miktarı"
          value={formData.low_stock_threshold}
          onChange={(e) => onChange('low_stock_threshold', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
        />
        {formErrors.low_stock_threshold && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.low_stock_threshold}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stok bu değerin altına düştüğünde uyarı verilecektir</p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-800/50"
        >
          İptal
        </button>

        <button
          type="submit"
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
