import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Users, FileText, RefreshCw, Download } from 'lucide-react';
import dashboardService from '../services/dashboardService';

const fmt = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n ?? 0);

const PIE_COLORS = {
  completed:  '#10b981',
  pending:    '#f59e0b',
  processing: '#3b82f6',
  cancelled:  '#ef4444',
  shipped:    '#8b5cf6',
  delivered:  '#06b6d4',
};

const STATUS_TR = {
  completed: 'Tamamlandı', pending: 'Bekliyor',
  processing: 'İşleniyor', cancelled: 'İptal', shipped: 'Kargoda', delivered: 'Teslim',
};

function KPICard({ title, value, sub, icon: Icon, color, change }) {
  const up = parseFloat(change) >= 0;
  return (
    <div className={`bg-gradient-to-br ${color} p-5 rounded-xl text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="bg-white/20 p-2 rounded-lg">
          <Icon size={20} />
        </div>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-green-200' : 'text-red-200'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(parseFloat(change)).toFixed(1)}% geçen aya göre
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getSummary();
      if (res.success) {
        setSummary(res.data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Reports load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExcelExport = () => {
    if (!summary) return;
    // Build CSV from top products
    const rows = [
      ['Ürün', 'Kategori', 'Satılan Adet', 'Gelir'],
      ...(summary.topProducts || []).map(p => [
        p.name, p.category || '—', p.total_sold, p.total_revenue,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapor_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 text-center text-gray-500">
        Rapor verisi yüklenemedi.{' '}
        <button onClick={load} className="text-blue-600 underline">Tekrar dene</button>
      </div>
    );
  }

  const { kpi, weeklyChart = [], monthlyTrend = [], topProducts = [] } = summary;

  // Build order status pie data from kpi
  const pieData = [
    { name: 'Tamamlandı', value: Number(kpi.completedOrders), key: 'completed' },
    { name: 'Bekliyor',   value: Number(kpi.pendingOrders),   key: 'pending' },
    { name: 'İptal',      value: Number(kpi.cancelledOrders), key: 'cancelled' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Raporlar & Analiz</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={16} /> CSV İndir
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={16} /> Yenile
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Toplam Gelir"
          value={fmt(kpi.totalRevenue)}
          sub={`Bu ay: ${fmt(kpi.monthlyRevenue)}`}
          icon={TrendingUp}
          color="from-blue-500 to-blue-700"
          change={kpi.revenueChangePercent}
        />
        <KPICard
          title="Toplam Sipariş"
          value={kpi.totalOrders}
          sub={`${kpi.pendingOrders} bekliyor`}
          icon={ShoppingCart}
          color="from-purple-500 to-purple-700"
        />
        <KPICard
          title="Ürün Sayısı"
          value={kpi.totalProducts}
          sub={`${kpi.lowStockCount} düşük stok`}
          icon={Package}
          color="from-orange-500 to-orange-700"
        />
        <KPICard
          title="Müşteriler"
          value={kpi.totalCustomers}
          sub={`${kpi.outstandingInvoices} açık fatura`}
          icon={Users}
          color="from-green-500 to-green-700"
        />
      </div>

      {/* Grafikler — Üst satır */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Haftalık Grafik */}
        <div className="xl:col-span-2 bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Son 7 Gün — Gelir & Sipariş</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyChart}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="rev" orientation="left" tickFormatter={v => `${(v/1000).toFixed(0)}K₺`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Gelir (₺)" stroke="#3b82f6" fill="url(#rev)" strokeWidth={2} />
              <Area yAxisId="ord" type="monotone" dataKey="orders" name="Sipariş" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sipariş Durumu Pasta */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sipariş Dağılımı</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={PIE_COLORS[entry.key] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Veri yok</div>
          )}
        </div>
      </div>

      {/* Aylık Trend */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Aylık Gelir Trendi (Son 6 Ay)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Gelir (₺)" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* En Çok Satan Ürünler */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <FileText size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-700">En Çok Satan Ürünler (Son 30 Gün)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Ürün', 'Kategori', 'Satılan Adet', 'Gelir'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Son 30 günde satış verisi yok</td>
                </tr>
              ) : topProducts.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">{p.category || '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 font-medium">{p.total_sold} adet</td>
                  <td className="px-5 py-3 text-sm font-bold text-green-700">{fmt(p.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    products: [],
    orders: [],
    loading: true,
    stats: {
      totalRevenue: 0,
      totalProducts: 0,
      averageOrderValue: 0,
      topSellingCategory: '',
    },
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setReportData((prev) => ({ ...prev, loading: true }));

      // Fetch all data
      const productsRes = await productService.getAll({ limit: 100 });
      const ordersRes = await orderService.getAll({ limit: 100 });

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];

      // Calculate stats
      const completedOrders = orders.filter((o) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      );
      const averageOrderValue =
        completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Get categories
      const categories = {};
      products.forEach((product) => {
        if (product.category) {
          categories[product.category] = (categories[product.category] || 0) + 1;
        }
      });

      const topSellingCategory =
        Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Yok';

      setReportData({
        products,
        orders,
        loading: false,
        stats: {
          totalRevenue,
          totalProducts: products.length,
          averageOrderValue,
          topSellingCategory,
        },
      });
    } catch (error) {
      console.error('Report data fetch error:', error);
      setReportData((prev) => ({ ...prev, loading: false }));
    }
  };

  if (reportData.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Raporlar</h1>
        <p className="text-gray-600 mt-2">Sistem istatistikleri ve analizleri</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Toplam Gelir</h3>
          <p className="text-3xl font-bold">₺{reportData.stats.totalRevenue.toFixed(2)}</p>
          {reportData.stats.totalRevenue > 0 && (
            <div className="text-xs opacity-75 mt-2 space-y-0.5">
              <div>{currencyService.getConversions(reportData.stats.totalRevenue).usdFormatted}</div>
              <div>{currencyService.getConversions(reportData.stats.totalRevenue).eurFormatted}</div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Toplam Ürün</h3>
          <p className="text-3xl font-bold">{reportData.stats.totalProducts}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Ortalama Sipariş</h3>
          <p className="text-3xl font-bold">₺{reportData.stats.averageOrderValue.toFixed(2)}</p>
          {reportData.stats.averageOrderValue > 0 && (
            <div className="text-xs opacity-75 mt-2 space-y-0.5">
              <div>{currencyService.getConversions(reportData.stats.averageOrderValue).usdFormatted}</div>
              <div>{currencyService.getConversions(reportData.stats.averageOrderValue).eurFormatted}</div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="text-sm font-medium opacity-90 mb-1">En Popüler Kategori</h3>
          <p className="text-2xl font-bold">{reportData.stats.topSellingCategory}</p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sipariş Durumu Dağılımı</h2>
        <div className="grid grid-cols-4 gap-4">
          {['pending', 'completed', 'cancelled', 'processing'].map((status) => {
            const count = reportData.orders.filter((o) => o.status === status).length;
            const percentage = reportData.orders.length > 0 
              ? ((count / reportData.orders.length) * 100).toFixed(1) 
              : '0';
            
            const statusText = {
              pending: 'Bekleyen',
              completed: 'Tamamlanan',
              cancelled: 'İptal',
              processing: 'İşleniyor',
            };

            const statusColor = {
              pending: 'bg-yellow-500',
              completed: 'bg-green-500',
              cancelled: 'bg-red-500',
              processing: 'bg-blue-500',
            };

            return (
              <div key={status} className="text-center">
                <div className={`${statusColor[status]} w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-2xl font-bold`}>
                  {count}
                </div>
                <p className="text-sm font-medium text-gray-700">{statusText[status]}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Kategori Dağılımı</h2>
        <div className="space-y-2">
          {Object.entries(
            reportData.products.reduce((acc, product) => {
              const cat = product.category || 'Diğer';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {})
          ).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">{category}</span>
              </div>
              <span className="font-semibold text-gray-800">{count} ürün</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
