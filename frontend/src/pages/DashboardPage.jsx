import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboardService';
import {
  TrendingUp, TrendingDown, Package, ShoppingCart,
  AlertTriangle, DollarSign, Clock, Users,
  RefreshCw, BarChart3, PieChart as PieIcon,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

/* ─── Renk paleti ─────────────────────────────────────────────── */
const COLORS = {
  blue:   '#3b82f6',
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
  purple: '#8b5cf6',
  indigo: '#6366f1',
};
const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444'];

/* ─── Skeleton ────────────────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

/* ─── KPI Kartı ───────────────────────────────────────────────── */
function KPICard({ title, value, icon: Icon, gradient, changePct, sub, loading }) {
  const up = changePct >= 0;
  if (loading) return <Skeleton className="h-32" />;
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-5 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <Icon size={22} />
        </div>
        {changePct !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(changePct).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-white/75 text-xs mb-0.5">{title}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Özel Tooltip ────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name === 'Sipariş'
            ? <>{p.name}: <strong>{p.value}</strong></>
            : <>{p.name}: <strong>₺{Number(p.value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></>
          }
        </p>
      ))}
    </div>
  );
}

/* ─── Ana Sayfa ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getSummary();
      setSummary(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt  = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtN = (n) => Number(n || 0).toLocaleString('tr-TR');
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  const kpi = summary?.kpi || {};

  const pieData = [
    { name: 'Bekleyen',   value: kpi.pendingOrders   || 0 },
    { name: 'Tamamlanan', value: kpi.completedOrders || 0 },
    { name: 'İptal',      value: kpi.cancelledOrders || 0 },
  ];

  const statusLabel = (s) => ({
    pending: 'Bekliyor', completed: 'Tamamlandı', cancelled: 'İptal',
    confirmed: 'Onaylandı', processing: 'İşlemde', shipped: 'Kargoda',
    delivered: 'Teslim Edildi',
  }[s] || s);

  const statusColor = (s) => ({
    pending:    'bg-yellow-100 text-yellow-700',
    completed:  'bg-green-100 text-green-700',
    cancelled:  'bg-red-100 text-red-700',
    confirmed:  'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped:    'bg-indigo-100 text-indigo-700',
    delivered:  'bg-teal-100 text-teal-700',
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* ── KPI Kartları ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          title="Toplam Gelir"
          value={`₺${fmt(kpi.totalRevenue)}`}
          icon={DollarSign}
          gradient="from-blue-500 to-blue-700"
          changePct={kpi.revenueChangePercent}
          sub={kpi.monthlyRevenue > 0 ? `Bu ay: ₺${fmt(kpi.monthlyRevenue)}` : 'Bu ay henüz gelir yok'}
        />
        <KPICard
          loading={loading}
          title="Toplam Sipariş"
          value={fmtN(kpi.totalOrders)}
          icon={ShoppingCart}
          gradient="from-green-500 to-emerald-600"
          sub={`${fmtN(kpi.pendingOrders)} bekliyor`}
        />
        <KPICard
          loading={loading}
          title="Ürün Çeşidi"
          value={fmtN(kpi.totalProducts)}
          icon={Package}
          gradient="from-purple-500 to-purple-700"
          sub={kpi.lowStockCount > 0 ? `⚠️ ${kpi.lowStockCount} düşük stok` : '✅ Stok sağlıklı'}
        />
        <KPICard
          loading={loading}
          title="Müşteri"
          value={fmtN(kpi.totalCustomers)}
          icon={Users}
          gradient="from-orange-500 to-red-500"
          sub={kpi.outstandingInvoices > 0 ? `${kpi.outstandingInvoices} bekleyen fatura` : 'Bekleyen fatura yok'}
        />
      </div>

      {/* ── Grafikler (Gelir Trendi + Pasta) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gelir & Sipariş — Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              Gelir & Sipariş Trendi
            </h2>
            <span className="text-xs text-gray-400">Son 7 gün</span>
          </div>
          {loading ? <Skeleton className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={summary?.weeklyChart || []}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.blue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#d1d5db" />
                <YAxis
                  yAxisId="rev" orientation="left"
                  tick={{ fontSize: 11 }} stroke="#d1d5db"
                  tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  yAxisId="ord" orientation="right"
                  tick={{ fontSize: 11 }} stroke="#d1d5db"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="rev" type="monotone" dataKey="revenue"
                  name="Gelir (₺)" stroke={COLORS.blue} fill="url(#gRev)" strokeWidth={2}
                />
                <Line
                  yAxisId="ord" type="monotone" dataKey="orders"
                  name="Sipariş" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sipariş Durumu — Pie */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieIcon size={18} className="text-purple-500" />
            Sipariş Dağılımı
          </h2>
          {loading ? <Skeleton className="h-56" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={3}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{fmtN(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 6 Aylık Bar Chart ──────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">6 Aylık Gelir Trendi</h2>
          <span className="text-xs text-gray-400">Aylık bazda</span>
        </div>
        {loading ? <Skeleton className="h-44" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={summary?.monthlyTrend || []}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#d1d5db" />
              <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db"
                tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Gelir (₺)" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Alt Bölüm ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Son Siparişler */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Clock size={16} className="text-blue-500" />
            Son Siparişler
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : summary?.recentOrders?.length > 0 ? (
            <div className="space-y-2">
              {summary.recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {o.order_number || `#${o.id}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {o.customer_name || 'Müşterisiz'} · {fmtDate(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₺{fmt(o.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Henüz sipariş yok</p>
          )}
        </div>

        {/* Top Ürünler */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-500" />
            Top Ürünler
            <span className="text-xs text-gray-400 font-normal">(son 30 gün)</span>
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : summary?.topProducts?.length > 0 ? (
            <div className="space-y-3">
              {summary.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {fmtN(p.total_sold)} adet · ₺{fmt(p.total_revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Satış verisi yok</p>
          )}
        </div>

        {/* Düşük Stok */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-orange-500" />
            Düşük Stok Uyarıları
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : summary?.lowStockProducts?.length > 0 ? (
            <div className="space-y-3">
              {summary.lowStockProducts.map(p => {
                const pct = p.low_stock_threshold > 0
                  ? Math.min(100, Math.round((p.stock_quantity / p.low_stock_threshold) * 100))
                  : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 truncate max-w-[130px]">{p.name}</span>
                      <span className={`font-bold ${p.stock_quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {p.stock_quantity === 0 ? 'Tükendi!' : `${fmtN(p.stock_quantity)} adet`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${p.stock_quantity === 0 ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-600 text-sm font-medium">Tüm stoklar yeterli</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sistem Durumu ──────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Sistem Durumu</h3>
          <p className="text-blue-200 text-sm">Tüm sistemler aktif</p>
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'Backend API', ok: true },
            { label: 'Veritabanı',  ok: true },
            { label: 'Frontend',    ok: true },
            { label: 'Redis Cache', ok: false, warn: true },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${s.ok ? 'bg-green-300 animate-pulse' : s.warn ? 'bg-yellow-300' : 'bg-red-400'}`} />
              <span className="text-white/90">{s.label}</span>
            </div>
          ))}
        </div>
        {summary?.generatedAt && (
          <p className="text-blue-200 text-xs whitespace-nowrap">
            Veri: {new Date(summary.generatedAt).toLocaleTimeString('tr-TR')}
          </p>
        )}
      </div>
    </div>
  );
}
