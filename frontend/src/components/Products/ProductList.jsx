import { useEffect, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import PermissionButton from '../PermissionButton';
import LoadingState from '../UI/LoadingState';
import EmptyState from '../UI/EmptyState';
import ProductStockBadge from './ProductStockBadge';

const toLower = (value) => String(value || '').toLocaleLowerCase('tr-TR');

export default function ProductList({
  loading,
  products,
  suppliers,
  warehouses,
  searchTerm,
  selectedCategory,
  onEdit,
  onDelete,
  onVisibleProductsChange,
}) {
  const filteredProducts = useMemo(() => {
    const search = toLower(searchTerm).trim();

    return (products || []).filter((product) => {
      if (selectedCategory && product.category !== selectedCategory) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [product.name, product.sku, product.description, product.category].some((value) =>
        toLower(value).includes(search)
      );
    });
  }, [products, searchTerm, selectedCategory]);

  useEffect(() => {
    onVisibleProductsChange?.(filteredProducts);
  }, [filteredProducts, onVisibleProductsChange]);

  if (loading) {
    return <LoadingState title="Ürünler yükleniyor..." />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tedarikçi</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fiyat</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stok</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  <EmptyState message="Filtreye uygun ürün bulunamadı." />
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

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{product.sku}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {product.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {suppliers.find((s) => s.id === product.supplier_id)?.supplier_name || '-'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {warehouses.find((w) => w.id === product.warehouse_id)?.warehouse_code || '-'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    ₺{product.price?.toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <ProductStockBadge stock={product.stock} lowStockThreshold={product.low_stock_threshold || 10} />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <PermissionButton
                        permission="products.edit"
                        deniedText="Ürün düzenleme yetkiniz yok."
                        onClick={() => onEdit(product)}
                        className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={18} />
                      </PermissionButton>

                      <PermissionButton
                        permission="products.delete"
                        deniedText="Ürün silme yetkiniz yok."
                        onClick={() => onDelete(product.id, product.name)}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
