import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';

export default function EmailSettings() {
  const { settings, updateSetting, isLoading } = useSettingsStore();
  const { showSuccess, showError, showInfo } = useUIStore();
  const [formData, setFormData] = useState({
    emailSmtpHost: '',
    emailSmtpPort: '587',
    emailSmtpUsername: '',
    emailSmtpPassword: '',
    emailFromAddress: '',
    emailFromName: 'ERP System'
  });
  const [testEmailAddress, setTestEmailAddress] = useState('');

  useEffect(() => {
    if (settings.email) {
      setFormData({
        emailSmtpHost: settings.email.emailSmtpHost || '',
        emailSmtpPort: settings.email.emailSmtpPort || '587',
        emailSmtpUsername: settings.email.emailSmtpUsername || '',
        emailSmtpPassword: settings.email.emailSmtpPassword || '',
        emailFromAddress: settings.email.emailFromAddress || '',
        emailFromName: settings.email.emailFromName || 'ERP System'
      });
    }
  }, [settings.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bulkUpdateSettings(formData);
      showSuccess('Email ayarları başarıyla kaydedildi!');
    } catch (error) {
      showError(error.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  const handleTestEmail = async () => {
    try {
      await testEmail(testEmailAddress);
      showInfo('Test emaili başarıyla gönderildi!');
    } catch (error) {
      showError(error.response?.data?.message || 'Email gönderilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Email Ayarları</h2>
        <p className="text-gray-600 mb-6">SMTP email ayarlarını yapın</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SMTP Host
          </label>
          <input
            type="text"
            name="emailSmtpHost"
            value={formData.emailSmtpHost}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="smtp.gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SMTP Port
          </label>
          <input
            type="number"
            name="emailSmtpPort"
            value={formData.emailSmtpPort}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="587"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Username
        </label>
        <input
          type="text"
          name="emailSmtpUsername"
          value={formData.emailSmtpUsername}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="username@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Password
        </label>
        <input
          type="password"
          name="emailSmtpPassword"
          value={formData.emailSmtpPassword}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From Email Address
        </label>
        <input
          type="email"
          name="emailFromAddress"
          value={formData.emailFromAddress}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="noreply@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From Name
        </label>
        <input
          type="text"
          name="emailFromName"
          value={formData.emailFromName}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="ERP System"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Email Gönder</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="test@example.com"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isLoading || !testEmailAddress}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Test Gönder
          </button>
        </div>
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
