import { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { PackagePlus } from 'lucide-react';

export default function StockEntryModal({ onClose, onDone }) {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    productService.getAll({ limit: 1000 })
      .then((r) => setProducts(r.data || []))
      .catch(() => {});
  }, []);

  const selected = products.find((p) => String(p.id) === String(productId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!productId) { setErr('Ürün seçin'); return; }
    if (!quantity || parseInt(quantity) <= 0) { setErr('Geçerli adet girin'); return; }
    setSubmitting(true);
    try {
      await productService.addStock(productId, parseInt(quantity));
      onDone();
    } catch (error) {
      setErr(error?.response?.data?.message || 'Stok eklenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <PackagePlus className="text-green-600" /> Stok Girişi
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mevcut bir ürüne gelen stok ekleyin (sıfırdan ürün tanımlamadan).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ürün seç */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Ürün <span className="text-red-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Ürün Seçin</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.sku ? ` (${p.sku})` : ''} — stok: {p.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Mevcut durum */}
          {selected && (
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Mevcut stok (açık)</span><span className={`font-bold ${Number(selected.stock_quantity) < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>{selected.stock_quantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Gelen stok</span><span className="font-bold text-green-600">{selected.incoming_stock ?? 0}</span></div>
              {Number(selected.stock_quantity) < 0 && (
                <p className="text-xs text-amber-600 pt-1">ℹ️ Eklenen adet gelen stoğa yazılır; açık (stok), sipariş sevk edilince düşer.</p>
              )}
            </div>
          )}

          {/* Adet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Eklenecek Adet <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="1" value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {err && <p className="text-red-500 text-sm">{err}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" disabled={submitting}>
              İptal
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {submitting ? 'Ekleniyor...' : 'Stok Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
