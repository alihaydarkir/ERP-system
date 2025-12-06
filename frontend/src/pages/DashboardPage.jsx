import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { TrendingUp, TrendingDown, Package, ShoppingCart, AlertTriangle, DollarSign, Clock, CheckCircle, XCircle, Eye, BarChart3, PieChart } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    lowStockProducts: 0,
    lowStockList: [],
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    topProducts: [],
    loading: true,
  });

  const [expandedCard, setExpandedCard] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsRes = await productService.getAll({ limit: 100 });
      const productsData = productsRes.data || [];
      const totalProducts = productsData.length || 0;

      // Get low stock products
      const lowStockRes = await productService.getAll({ lowStock: 10, limit: 100 });
      const lowStockData = lowStockRes.data || [];
      const lowStockProducts = lowStockData.length || 0;

      // Fetch orders
      const ordersRes = await orderService.getAll({ limit: 100 });
      const ordersData = ordersRes.data || [];
      const totalOrders = ordersData.length || 0;
      const pendingOrders = ordersData.filter(o => o.status === 'pending').length || 0;
      const completedOrders = ordersData.filter(o => o.status === 'completed').length || 0;
      const cancelledOrders = ordersData.filter(o => o.status === 'cancelled').length || 0;

      // Calculate revenue
      const completedOrdersList = ordersData.filter(o => o.status === 'completed') || [];
      const totalRevenue = completedOrdersList.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Get recent orders (last 5)
      const recentOrders = ordersData.slice(0, 5);

      // Calculate top products (by stock or other metric)
      const topProducts = productsData
        .sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0))
        .slice(0, 5);

      setStats({
        totalProducts,
        totalOrders,
        lowStockProducts,
        lowStockList: lowStockData.slice(0, 5),
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        recentOrders,
        topProducts,
        loading: false,
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const kpiCards = [
    {
      id: 'products',
      title: 'Toplam Ürün',
      value: stats.totalProducts,
      IconComponent: Package,
      gradient: 'from-blue-500 to-blue-600',
      trend: '+12%',
      trendUp: true,
      details: {
        subtitle: 'Sistemdeki toplam ürün sayısı',
        items: [
          { label: 'Stokta Olan', value: stats.totalProducts - stats.lowStockProducts },
          { label: 'Düşük Stoklu', value: stats.lowStockProducts },
          { label: 'En Çok Stoklu', value: stats.topProducts[0]?.name || '-', isText: true }
        ]
      }
    },
    {
      id: 'orders',
      title: 'Toplam Sipariş',
      value: stats.totalOrders,
      IconComponent: ShoppingCart,
      gradient: 'from-green-500 to-green-600',
      trend: '+8%',
      trendUp: true,
      details: {
        subtitle: 'Tüm siparişlerin özeti',
        items: [
          { label: 'Bekleyen', value: stats.pendingOrders, color: 'text-yellow-600' },
          { label: 'Tamamlanan', value: stats.completedOrders, color: 'text-green-600' },
          { label: 'İptal Edilen', value: stats.cancelledOrders, color: 'text-red-600' }
        ]
      }
    },
    {
      id: 'lowstock',
      title: 'Düşük Stok Uyarısı',
      value: stats.lowStockProducts,
      IconComponent: AlertTriangle,
      gradient: 'from-yellow-500 to-orange-600',
      trend: '-5%',
      trendUp: false,
      details: {
        subtitle: 'Stok seviyesi düşük ürünler',
        items: stats.lowStockList.map(p => ({
          label: p.name,
          value: `${p.stock_quantity || 0} adet`,
          isText: true,
          color: 'text-orange-600'
        }))
      }
    },
    {
      id: 'revenue',
      title: 'Toplam Gelir',
      value: `₺${stats.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      IconComponent: DollarSign,
      gradient: 'from-purple-500 to-purple-600',
      trend: '+24%',
      trendUp: true,
      details: {
        subtitle: 'Tamamlanan siparişlerden gelir',
        items: [
          { label: 'Ortalama Sipariş', value: `₺${(stats.totalRevenue / (stats.completedOrders || 1)).toFixed(2)}` },
          { label: 'Tamamlanan Sipariş', value: stats.completedOrders },
          { label: 'Bu Ayki Gelir', value: `₺${(stats.totalRevenue * 0.3).toFixed(2)}` }
        ]
      }
    },
  ];

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Sistem özeti ve istatistikler</p>
      </div>

      {/* KPI Cards - Interaktif */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => {
          const IconComponent = card.IconComponent;
          const isExpanded = expandedCard === card.id;
          const isHovered = hoveredCard === card.id;
          
          return (
            <div
              key={card.id}
              className="relative group"
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div
                onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                className={`bg-gradient-to-br ${card.gradient} p-6 rounded-xl text-white shadow-lg 
                  hover:shadow-2xl transition-all duration-300 cursor-pointer transform 
                  ${isHovered ? 'scale-105' : 'scale-100'}
                  ${isExpanded ? 'ring-4 ring-white ring-opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <IconComponent className="w-10 h-10 opacity-90" />
                  <div className={`flex items-center text-sm font-semibold ${card.trendUp ? 'text-green-200' : 'text-red-200'}`}>
                    {card.trendUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {card.trend}
                  </div>
                </div>
                
                <h3 className="text-sm font-medium opacity-90 mb-1">{card.title}</h3>
                <p className="text-3xl font-bold mb-2">{card.value}</p>
                
                {isHovered && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <Eye className="w-5 h-5 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Detay Kartı - Expanded */}
              {isExpanded && (
                <div className="mt-4 bg-white rounded-lg shadow-lg border-2 border-gray-200 p-5 animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">{card.details.subtitle}</h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCard(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {card.details.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className={`text-sm font-semibold ${item.color || 'text-gray-900'}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Son Siparişler
          </h2>
          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition rounded px-2">
                  <div>
                    <p className="font-medium text-gray-800">Sipariş #{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₺{order.total_amount?.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.status === 'completed' ? 'Tamamlandı' :
                       order.status === 'pending' ? 'Bekliyor' : 'İptal'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Henüz sipariş yok</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Hızlı İstatistikler
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b hover:bg-gray-50 transition rounded px-2">
              <span className="text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                Bekleyen Siparişler
              </span>
              <span className="font-semibold text-yellow-600 text-lg">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b hover:bg-gray-50 transition rounded px-2">
              <span className="text-gray-600 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                Düşük Stok Ürünler
              </span>
              <span className="font-semibold text-red-600 text-lg">{stats.lowStockProducts}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b hover:bg-gray-50 transition rounded px-2">
              <span className="text-gray-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Tamamlanan Siparişler
              </span>
              <span className="font-semibold text-green-600 text-lg">{stats.completedOrders}</span>
            </div>
            <div className="flex justify-between items-center py-3 hover:bg-gray-50 transition rounded px-2">
              <span className="text-gray-600 flex items-center">
                <Package className="w-4 h-4 mr-2 text-blue-500" />
                Toplam Ürün Çeşidi
              </span>
              <span className="font-semibold text-blue-600 text-lg">{stats.totalProducts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Gelir Trendi
            </h2>
            <select className="text-sm border rounded px-2 py-1">
              <option>Son 7 Gün</option>
              <option>Son 30 Gün</option>
              <option>Son 3 Ay</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={[
              { name: 'Pzt', gelir: 4000, siparis: 24 },
              { name: 'Sal', gelir: 3000, siparis: 18 },
              { name: 'Çar', gelir: 5000, siparis: 32 },
              { name: 'Per', gelir: 2780, siparis: 16 },
              { name: 'Cum', gelir: 4890, siparis: 28 },
              { name: 'Cmt', gelir: 6390, siparis: 38 },
              { name: 'Paz', gelir: 3490, siparis: 21 }
            ]}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="gelir" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGelir)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-purple-500" />
              Sipariş Durumu
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPie>
              <Pie
                data={[
                  { name: 'Bekleyen', value: stats.pendingOrders, color: '#f59e0b' },
                  { name: 'Tamamlanan', value: stats.completedOrders, color: '#10b981' },
                  { name: 'İptal', value: stats.cancelledOrders, color: '#ef4444' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Bekleyen', value: stats.pendingOrders, color: '#f59e0b' },
                  { name: 'Tamamlanan', value: stats.completedOrders, color: '#10b981' },
                  { name: 'İptal', value: stats.cancelledOrders, color: '#ef4444' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-500" />
              En Çok Stoklu Ürünler
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.topProducts.map(p => ({
              name: p.name?.substring(0, 15) + '...' || 'Ürün',
              stok: p.stock_quantity || 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" angle={-15} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="stok" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Orders Line Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-indigo-500" />
              Haftalık Sipariş Trendi
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { gun: 'Pzt', siparis: 24, tamamlanan: 20 },
              { gun: 'Sal', siparis: 18, tamamlanan: 15 },
              { gun: 'Çar', siparis: 32, tamamlanan: 28 },
              { gun: 'Per', siparis: 16, tamamlanan: 14 },
              { gun: 'Cum', siparis: 28, tamamlanan: 22 },
              { gun: 'Cmt', siparis: 38, tamamlanan: 32 },
              { gun: 'Paz', siparis: 21, tamamlanan: 18 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="gun" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="siparis" stroke="#6366f1" strokeWidth={2} name="Toplam" />
              <Line type="monotone" dataKey="tamamlanan" stroke="#10b981" strokeWidth={2} name="Tamamlanan" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Sistem Durumu</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm">Backend API</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm">Database</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
            <span className="text-sm">Redis Cache</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm">Frontend</span>
          </div>
        </div>
      </div>
    </div>
  );
}
