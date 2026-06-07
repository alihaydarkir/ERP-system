import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';

export default function GeneralSettings() {
  const { settings, bulkUpdateSettings, isLoading } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    companyTaxNumber: '',
    companyTaxOffice: '',
    companyTradeRegistry: '',
    companyAddress: '',
    companyCity: '',
    companyPhone: '',
    companyFax: '',
    companyEmail: '',
    companyWebsite: '',
    currency: 'TRY',
    language: 'TR',
    timezone: 'Europe/Istanbul',
    fiscalYearStart: '01-01',
  });

  useEffect(() => {
    if (settings.general) {
      setFormData(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(settings.general).filter(([k]) => k in prev)
        ),
      }));
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

  const Field = ({ label, name, placeholder, type = 'text' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Genel Ayarlar</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Şirket bilgileri PDF çıktılarında görünür</p>
      </div>

      {/* Şirket Kimlik Bilgileri */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
          Şirket Kimlik Bilgileri
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Şirket Adı *" name="companyName" placeholder="Örnek A.Ş." />
          <Field label="Şirket Logo URL" name="companyLogo" placeholder="https://..." />
          <Field label="Vergi Numarası" name="companyTaxNumber" placeholder="1234567890" />
          <Field label="Vergi Dairesi" name="companyTaxOffice" placeholder="Maltepe VD" />
          <Field label="Ticaret Sicil No" name="companyTradeRegistry" placeholder="TIC.SIC.NO" />
        </div>
      </section>

      {/* İletişim Bilgileri */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
          İletişim ve Adres
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Adres" name="companyAddress" placeholder="Atatürk Cad. No:1 Kat:3 Merkez" />
          </div>
          <Field label="Şehir / İlçe" name="companyCity" placeholder="Ankara / Çankaya" />
          <Field label="Telefon" name="companyPhone" placeholder="0312 xxx xxxx" />
          <Field label="Faks" name="companyFax" placeholder="0312 xxx xxxx" />
          <Field label="E-posta" name="companyEmail" placeholder="info@sirket.com" type="email" />
          <Field label="Web Sitesi" name="companyWebsite" placeholder="www.sirket.com" />
        </div>
      </section>

      {/* Sistem Ayarları */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
          Sistem Ayarları
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Para Birimi</label>
            <select name="currency" value={formData.currency} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="TRY">TRY - Türk Lirası</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dil</label>
            <select name="language" value={formData.language} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="TR">Türkçe</option>
              <option value="EN">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Saat Dilimi</label>
            <select name="timezone" value={formData.timezone} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium">
          {isLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>
      </div>
    </form>
  );
}
