import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authService } from '../services/authService';
import CurrencyTicker from './CurrencyTicker';
import { 
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users, Truck, 
  CreditCard, FileText, Activity, MessageSquare, BarChart3, 
  Settings, Shield, ChevronLeft, ChevronRight, LogOut, User,
  Menu, Bell, Search, Factory, Moon, Sun
} from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, logout: logoutFn } = useAuthStore();
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('userPreferences') ? JSON.parse(localStorage.getItem('userPreferences')).theme : 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    
    // Save to localStorage
    const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    localStorage.setItem('userPreferences', JSON.stringify({ ...prefs, theme: newTheme }));
  };

  useEffect(() => {
    // Sync state with body attribute on mount in case it was set elsewhere
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (_) {
      // Logout endpoint failure should not block client-side logout
    } finally {
      logoutFn();
      navigate('/login');
    }
  };

  const isActive = (path) => location.pathname === path;

  // Icons mapping
  const iconMap = {
    '/dashboard': LayoutDashboard,
    '/products': Package,
    '/warehouses': Warehouse,
    '/orders': ShoppingCart,
    '/customers': Users,
    '/suppliers': Factory, // Changed icon for suppliers
    '/cheques': CreditCard,
    '/invoices': FileText,
    '/current-accounts': Activity,
    '/chat': MessageSquare,
    '/reports': BarChart3,
    '/user-management': Shield,
    '/settings': Settings
  };

  const baseMenuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/products', label: 'Ürünler' },
    { path: '/warehouses', label: 'Depolar' },
    { path: '/orders', label: 'Siparişler' },
    { path: '/customers', label: 'Müşteriler' },
    { path: '/suppliers', label: 'Tedarikçiler' },
    { path: '/cheques', label: 'Çekler' },
    { path: '/invoices', label: 'Faturalar' },
    { path: '/current-accounts', label: 'Cari Hesaplar' },
    { path: '/chat', label: 'AI Asistan' },
    { path: '/reports', label: 'Raporlar' },
  ];

  const adminMenuItems = [
    { path: '/user-management', label: 'Kullanıcı Yönetimi' },
    { path: '/settings', label: 'Ayarlar' }
  ];

  const menuItems = user?.role === 'admin'
    ? [...baseMenuItems, ...adminMenuItems]
    : baseMenuItems;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${sidebarOpen ? 'w-72' : 'w-20'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-white dark:bg-gray-800/10 opacity-30 pattern-grid-lg"></div>
            {sidebarOpen ? (
              <h1 className="text-2xl font-bold tracking-tight z-10 drop-shadow-sm">ERP<span className="font-light opacity-80">PRO</span></h1>
            ) : (
              <span className="text-2xl font-bold z-10">EP</span>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-600">
            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = iconMap[item.path] || Package;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative group flex items-center px-4 py-3 rounded-xl transition-all duration-200
                      ${active 
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold shadow-sm translate-x-1' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 hover:translate-x-1'
                      }
                    `}
                    title={!sidebarOpen ? item.label : ''}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary-600 rounded-r-full shadow-glow" />
                    )}
                    <Icon 
                      size={22} 
                      className={`min-w-[22px] transition-colors ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} 
                    />
                    
                    <span className={`ml-3 text-sm font-medium overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                      {item.label}
                    </span>

                    {!sidebarOpen && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-xl transform translate-x-2 group-hover:translate-x-0">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Summary in Sidebar Bottom */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50/50 dark:bg-gray-900/30 backdrop-blur-sm">
            <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
               {sidebarOpen ? (
                 <div className="flex items-center space-x-3 overflow-hidden">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold text-lg shadow-sm shrink-0 border border-white dark:border-gray-700">
                     {user?.username?.[0]?.toUpperCase()}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user?.username}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                   </div>
                 </div>
               ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold text-lg shadow-sm border border-white dark:border-gray-700" title={user?.username}>
                   {user?.username?.[0]?.toUpperCase()}
                </div>
               )}
            </div>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700 hover:text-primary-600 transition-all duration-200 z-50 hover:scale-110"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'pl-72' : 'pl-20'}`}>
        
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 dark:border-gray-700/50 shadow-sm h-16 transition-colors duration-300">
          <div className="h-full px-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="hidden md:block">
                 <CurrencyTicker />
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
              >
                {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
              </button>

              {company && (
                <div className="hidden md:flex items-center px-4 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium border border-primary-100 dark:border-primary-800 shadow-sm">
                  <Factory size={14} className="mr-2" />
                  <span className="truncate max-w-[150px]">{company.company_name}</span>
                </div>
              )}
              
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
              
              <button 
                onClick={handleLogout}
                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20"
                title="Çıkış Yap"
              >
                <LogOut size={18} className="mr-2" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-800/50/50 dark:bg-gray-900 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}
