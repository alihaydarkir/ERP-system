import { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';

export default function PartialShipModal({ orderId, onClose, onDone }) {
  const [order, setOrder] = useState(null);
  const [qty, setQty] = useState({}); // product_id -> shipped qty
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    orderService.getById(orderId)
      .then((res) => {
        const o = res.data || res;
        setOrder(o);
        const init = {};
        (o.items || []).forEach((it) => { init[it.product_id] = Number(it.quantity); });
        setQty(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const items = order?.items || [];

  const setItemQty = (pid, val, max) => {
    if (val === '') { setQty((q) => ({ ...q, [pid]: '' })); return; } // boş bırakmaya izin ver
    const n = Math.min(Math.max(parseInt(val) || 0, 0), max);
    setQty((q) => ({ ...q, [pid]: n }));
  };

  const totalShipped = items.reduce((s, it) => s + (Number(qty[it.product_id]) || 0), 0);
  const totalOrdered = items.reduce((s, it) => s + Number(it.quantity), 0);
  const fullyShipped = totalShipped === totalOrdered;

  const handleSubmit = async () => {
    if (totalShipped <= 0) return;
    setSubmitting(true);
    try {
      const payload = items.map((it) => ({ product_id: it.product_id, shipped_quantity: Number(qty[it.product_id]) || 0 }));
      await orderService.completePartial(orderId, payload);
      onDone();
    } catch (error) {
      onDone(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📦 Sevkiyat Adedi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Her ürün için sevk edilen adedi girin. Kalan adet bekleyen siparişte kalır.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {items.length === 0 ? (
              <p className="text-center text-gray-400 py-6">Sipariş kalemi bulunamadı</p>
            ) : items.map((it) => {
              const ordered = Number(it.quantity);
              const shipped = Number(qty[it.product_id]) || 0;
              const remaining = ordered - shipped;
              return (
                <div key={it.product_id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{it.product_name || it.name || `Ürün #${it.product_id}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sipariş: {ordered} adet · Kalan: {remaining}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sevk:</span>
                    <input
                      type="number" min="0" max={ordered}
                      value={qty[it.product_id] ?? ''}
                      onChange={(e) => setItemQty(it.product_id, e.target.value, ordered)}
                      className="h-9 w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 [appearance:textfield]"
                    />
                  </div>
                </div>
              );
            })}

            <div className="text-sm text-gray-600 dark:text-gray-300 pt-2">
              Toplam sevk: <span className="font-bold">{totalShipped}</span> / {totalOrdered} adet
              {!fullyShipped && totalShipped > 0 && <span className="text-amber-600 ml-2">→ {totalOrdered - totalShipped} adet bekleyende kalacak</span>}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={onClose} className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" disabled={submitting}>
                İptal
              </button>
              <button onClick={handleSubmit} disabled={submitting || totalShipped <= 0} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'İşleniyor...' : fullyShipped ? 'Tamamla' : 'Kısmi Sevk Et'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
