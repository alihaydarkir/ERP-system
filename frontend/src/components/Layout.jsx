import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import CurrencyTicker from './CurrencyTicker';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, logout: logoutFn } = useAuthStore();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logoutFn();
    navigate('/login');
  };

  // Base menu items for all users
  const baseMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/products', label: 'Ürünler', icon: '📦' },
    { path: '/warehouses', label: 'Depolar', icon: '🏢' },
    { path: '/orders', label: 'Siparişler', icon: '🛒' },
    { path: '/customers', label: 'Müşteriler', icon: '👥' },
    { path: '/suppliers', label: 'Tedarikçiler', icon: '🏭' },
    { path: '/cheques', label: 'Çekler', icon: '📋' },
    { path: '/invoices', label: 'Faturalar', icon: '🧾' },    { path: '/current-accounts', label: 'Cari Hesaplar', icon: '📊' },    { path: '/chat', label: 'AI Chatbot', icon: '🤖' },
    { path: '/reports', label: 'Raporlar', icon: '📈' },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { path: '/user-management', label: 'Kullanıcı Yönetimi', icon: '👤' },
    { path: '/settings', label: 'Ayarlar', icon: '⚙️' }
  ];

  // Combine menu items based on user role
  const menuItems = user?.role === 'admin'
    ? [...baseMenuItems, ...adminMenuItems]
    : baseMenuItems;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">ERP Yönetim Sistemi</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Currency Ticker */}
            <CurrencyTicker />
            
            {/* Company Badge */}
            {company && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <span className="text-lg">🏭</span>
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">{company.company_name}</div>
                  <div className="text-xs text-gray-500">Kod: {company.company_code}</div>
                </div>
              </div>
            )}
            
            <Link
              to="/profile"
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              title="Profilim"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.username || 'User'}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role || 'user'}</div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white shadow-lg transition-all duration-300 overflow-hidden`}
        >
          <nav className="p-4 space-y-2 mt-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? '' : 'ml-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}


