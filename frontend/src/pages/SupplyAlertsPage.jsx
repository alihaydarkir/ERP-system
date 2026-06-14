import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Truck, PackageX } from 'lucide-react';
import { productService } from '../services/productService';

export default function SupplyAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getSupplyAlerts();
      if (res.success) setAlerts(res.data || []);
    } catch (e) {
      console.error('Tedarik uyarıları yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-500" /> Tedarik Uyarıları
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Stoğu yetersiz (eksiye düşmüş) ürünler — tedarikçisinden alım gerekiyor
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800"
          >
            <RefreshCw size={15} /> Yenile
          </button>
        </div>

        {/* İçerik */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <PackageX size={40} className="mx-auto mb-3 opacity-30" />
              <p>Tedarik gerektiren ürün yok 🎉</p>
              <p className="text-xs mt-1">Tüm ürünlerin stoğu yeterli.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Ürün', 'SKU', 'Mevcut Stok', 'Gelen Stok', 'Eksik Adet', 'Tedarikçi', 'İletişim'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100">{a.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{a.sku || '-'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        {a.stock_quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {Number(a.incoming_stock) > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          +{a.incoming_stock}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                        <Truck size={11} /> {a.deficit} adet
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-200">{a.supplier_name || '— (tedarikçi atanmamış)'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {a.supplier_phone && <div>{a.supplier_phone}</div>}
                      {a.supplier_email && <div>{a.supplier_email}</div>}
                      {!a.supplier_phone && !a.supplier_email && '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
