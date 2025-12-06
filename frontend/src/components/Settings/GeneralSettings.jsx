import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';

export default function GeneralSettings() {
  const { settings, bulkUpdateSettings, isLoading } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    currency: 'TRY',
    language: 'TR',
    timezone: 'Europe/Istanbul',
    fiscalYearStart: '01-01'
  });

  useEffect(() => {
    if (settings.general) {
      setFormData({
        companyName: settings.general.companyName || '',
        companyLogo: settings.general.companyLogo || '',
        currency: settings.general.currency || 'TRY',
        language: settings.general.language || 'TR',
        timezone: settings.general.timezone || 'Europe/Istanbul',
        fiscalYearStart: settings.general.fiscalYearStart || '01-01'
      });
    }
  }, [settings.general]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bulkUpdateSettings(formData);
      showSuccess('Ayarlar başarıyla kaydedildi!');
    } catch (error) {
      showError(error.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Genel Ayarlar</h2>
        <p className="text-gray-600 mb-6">Sistem genelindeki temel ayarları yapın</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Şirket Adı
        </label>
        <input
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Acme Corp"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Şirket Logosu URL
        </label>
        <input
          type="text"
          name="companyLogo"
          value={formData.companyLogo}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Para Birimi
        </label>
        <select
          name="currency"
          value={formData.currency}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="TRY">TRY - Türk Lirası</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dil
        </label>
        <select
          name="language"
          value={formData.language}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="TR">Türkçe</option>
          <option value="EN">English</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Saat Dilimi
        </label>
        <select
          name="timezone"
          value={formData.timezone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="Europe/Istanbul">Europe/Istanbul</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mali Yıl Başlangıcı (MM-DD)
        </label>
        <input
          type="text"
          name="fiscalYearStart"
          value={formData.fiscalYearStart}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="01-01"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
