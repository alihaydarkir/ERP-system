import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import useUIStore from '../store/uiStore';
import GeneralSettings from '../components/Settings/GeneralSettings';
import EmailSettings from '../components/Settings/EmailSettings';
import StockSettings from '../components/Settings/StockSettings';
import AISettings from '../components/Settings/AISettings';

export default function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState('general');
  const { user } = useAuthStore();
  const { showError } = useUIStore();
  const navigate = useNavigate();
  const { fetchSettings, error, clearError } = useSettingsStore();

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      showError('Bu sayfaya erişim yetkiniz yok. Sadece admin kullanıcılar ayarlara erişebilir.');
      navigate('/dashboard');
      return;
    }

    // Fetch settings
    fetchSettings();
  }, [user, navigate, fetchSettings]);

  const categories = [
    { id: 'general', label: 'Genel Ayarlar', icon: '⚙️' },
    { id: 'email', label: 'Email Ayarları', icon: '📧' },
    { id: 'stock', label: 'Stok Ayarları', icon: '📦' },
    { id: 'ai', label: 'AI/Chatbot', icon: '🤖' }
  ];

  const renderSettings = () => {
    switch (selectedCategory) {
      case 'general':
        return <GeneralSettings />;
      case 'email':
        return <EmailSettings />;
      case 'stock':
        return <StockSettings />;
      case 'ai':
        return <AISettings />;
      default:
        return <GeneralSettings />;
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sistem Ayarları</h1>
        <p className="text-gray-600 mt-2">Sistem genelindeki ayarları yönetin</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={clearError}
            className="absolute top-0 right-0 px-4 py-3"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-md p-4">
          <nav className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition text-left ${
                  selectedCategory === category.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          {renderSettings()}
        </div>
      </div>
    </div>
  );
}
