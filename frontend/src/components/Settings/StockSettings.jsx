import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';

export default function StockSettings() {
  const { settings, updateSetting, isLoading } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [formData, setFormData] = useState({
    stockGlobalThreshold: '10',
    stockMinLevel: '5',
    stockMaxLevel: '1000',
    stockAlertEmail: true
  });

  useEffect(() => {
    if (settings.stock) {
      setFormData({
        stockGlobalThreshold: settings.stock.stockGlobalThreshold || '10',
        stockMinLevel: settings.stock.stockMinLevel || '5',
        stockMaxLevel: settings.stock.stockMaxLevel || '1000',
        stockAlertEmail: settings.stock.stockAlertEmail !== undefined ? settings.stock.stockAlertEmail : true
      });
    }
  }, [settings.stock]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSetting('stock', formData);
      showSuccess('Stok ayarları başarıyla kaydedildi!');
    } catch (error) {
      showError(error.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Stok Ayarları</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Stok yönetimi ayarlarını yapın</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Global Stok Eşiği
        </label>
        <input
          type="number"
          name="stockGlobalThreshold"
          value={formData.stockGlobalThreshold}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stok bu seviyenin altına düştüğünde uyarı verilir</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Minimum Stok Seviyesi
        </label>
        <input
          type="number"
          name="stockMinLevel"
          value={formData.stockMinLevel}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Maximum Stok Seviyesi
        </label>
        <input
          type="number"
          name="stockMaxLevel"
          value={formData.stockMaxLevel}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="stockAlertEmail"
          name="stockAlertEmail"
          checked={formData.stockAlertEmail}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <label htmlFor="stockAlertEmail" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
          Düşük stok için email uyarısı gönder
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
