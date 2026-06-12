import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardService from '../services/dashboardService';
import { aiService } from '../services/aiService';
import useAuthStore from '../store/authStore';
import {
  TrendingUp, TrendingDown, Package, ShoppingCart,
  AlertTriangle, DollarSign, Clock, Users,
  RefreshCw, BarChart3, PieChart as PieIcon,
  CreditCard, MessageSquare, CheckCircle, XCircle,
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
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`} />;
}

/* ─── KPI Kartı ───────────────────────────────────────────────── */
function KPICard({ title, value, icon: Icon, gradient, shadow, changePct, sub, loading }) {
  const up = changePct >= 0;
  if (loading) return <Skeleton className="h-32" />;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-xl p-5 text-white shadow-md ${shadow || ''} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/10`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 pointer-events-none">
        <Icon size={80} className="text-white" />
      </div>

      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="p-2 bg-white/20 border border-white/25 rounded-lg backdrop-blur-sm">
          <Icon size={22} className="text-white" />
        </div>
        {changePct !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(changePct).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="relative z-10 text-white/75 text-xs mb-0.5">{title}</p>
      <p className="relative z-10 text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="relative z-10 text-white/60 text-xs mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Özel Tooltip ────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
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

/* ─── Müşteri Dashboard ───────────────────────────────────────── */
function CustomerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiService.getCustomerDashboard();
      setData(res);
    } catch (err) {
      console.error('Müşteri dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt  = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtN = (n) => Number(n || 0).toLocaleString('tr-TR');
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  const orders  = data?.orders  || {};
  const cheques = data?.cheques || {};

  const statusLabel = (s) => ({
    pending: 'Bekliyor', completed: 'Tamamlandı', cancelled: 'İptal',
    processing: 'İşlemde', confirmed: 'Onaylandı',
  }[s] || s);

  const statusColor = (s) => ({
    pending:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    confirmed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  }[s] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300');

  const chequeStatusColor = (s) => ({
    paid:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  }[s] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300');

  return (
    <div className="p-6 space-y-6">

      {/* Hoşgeldin Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Hoş geldiniz{data?.customer?.full_name ? `, ${data.customer.full_name}` : ''}!
          </h1>
          {data?.customer?.company_name && (
            <p className="text-emerald-100 mt-1">{data.customer.company_name}</p>
          )}
          <p className="text-emerald-200 text-sm mt-1">Sipariş ve çeklerinizi buradan takip edebilirsiniz.</p>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-sm font-medium transition-all"
        >
          <MessageSquare size={16} />
          AI Asistana Sor
        </Link>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-5 text-white shadow-md hover:shadow-emerald-500/30 hover:-translate-y-1 transition-all">
              <div className="p-2 bg-white/20 rounded-lg w-fit mb-3"><ShoppingCart size={20} /></div>
              <p className="text-white/70 text-xs">Toplam Sipariş</p>
              <p className="text-2xl font-bold">{fmtN(orders.total)}</p>
              <p className="text-white/60 text-xs mt-1">{fmtN(orders.pending)} bekliyor</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white shadow-md hover:shadow-blue-500/30 hover:-translate-y-1 transition-all">
              <div className="p-2 bg-white/20 rounded-lg w-fit mb-3"><DollarSign size={20} /></div>
              <p className="text-white/70 text-xs">Toplam Harcama</p>
              <p className="text-2xl font-bold">₺{fmt(orders.total_spent)}</p>
              <p className="text-white/60 text-xs mt-1">{fmtN(orders.completed)} tamamlandı</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-md hover:shadow-amber-500/30 hover:-translate-y-1 transition-all">
              <div className="p-2 bg-white/20 rounded-lg w-fit mb-3"><CreditCard size={20} /></div>
              <p className="text-white/70 text-xs">Bekleyen Çek</p>
              <p className="text-2xl font-bold">{fmtN(cheques.pending_count)}</p>
              <p className="text-white/60 text-xs mt-1">₺{fmt(cheques.pending_amount)}</p>
            </div>
            <div className={`rounded-xl p-5 text-white shadow-md hover:-translate-y-1 transition-all ${Number(cheques.overdue_count) > 0 ? 'bg-gradient-to-br from-red-500 to-red-700 hover:shadow-red-500/30' : 'bg-gradient-to-br from-teal-500 to-teal-700 hover:shadow-teal-500/30'}`}>
              <div className="p-2 bg-white/20 rounded-lg w-fit mb-3">
                {Number(cheques.overdue_count) > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
              </div>
              <p className="text-white/70 text-xs">Vadesi Geçmiş</p>
              <p className="text-2xl font-bold">{fmtN(cheques.overdue_count)}</p>
              <p className="text-white/60 text-xs mt-1">
                {Number(cheques.overdue_count) > 0 ? `₺${fmt(cheques.overdue_amount)} gecikmiş` : 'Gecikmiş çek yok'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Alt bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Son Siparişler */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock size={16} className="text-emerald-500" />
              Son Siparişlerim
            </h2>
            <Link to="/orders" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Tümünü gör →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : data?.recentOrders?.length > 0 ? (
            <div className="space-y-2">
              {data.recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{o.order_number || `#${o.id}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">₺{fmt(o.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{statusLabel(o.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Henüz sipariş yok</p>
          )}
        </div>

        {/* Son Çekler */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CreditCard size={16} className="text-amber-500" />
              Son Çeklerim
            </h2>
            <Link to="/cheques" className="text-xs text-amber-600 hover:text-amber-700 font-medium">Tümünü gör →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : data?.recentCheques?.length > 0 ? (
            <div className="space-y-2">
              {data.recentCheques.map(c => {
                const isOverdue = c.status === 'pending' && Number(c.days_overdue) > 0;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.check_serial_no}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.bank_name} · Vade: {fmtDate(c.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">₺{fmt(c.amount)}</p>
                      {isOverdue
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{c.days_overdue} gün gecikmiş</span>
                        : <span className={`text-xs px-2 py-0.5 rounded-full ${chequeStatusColor(c.status)}`}>{c.status === 'paid' ? 'Ödendi' : 'Bekliyor'}</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Henüz çek yok</p>
          )}
        </div>
      </div>

      {/* AI Asistan Kartı */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl p-5 text-white flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-lg">AI Asistan</h3>
          <p className="text-violet-200 text-sm">Siparişleriniz veya çekleriniz hakkında soru sorabilirsiniz.</p>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 font-semibold rounded-xl hover:bg-violet-50 transition text-sm"
        >
          <MessageSquare size={16} />
          Asistanı Aç
        </Link>
      </div>
    </div>
  );
}

/* ─── Ana Sayfa ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer';

  const [summary, setSummary] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    if (isCustomer) return;
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
  }, [isCustomer]);

  useEffect(() => { load(); }, [load]);

  if (isCustomer) return <CustomerDashboard />;

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
    pending:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    confirmed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    shipped:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    delivered:  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }[s] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300');

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 transition disabled:opacity-40 shadow-sm"
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
          shadow="hover:shadow-blue-500/30"
          changePct={kpi.revenueChangePercent}
          sub={kpi.monthlyRevenue > 0 ? `Bu ay: ₺${fmt(kpi.monthlyRevenue)}` : 'Bu ay henüz gelir yok'}
        />
        <KPICard
          loading={loading}
          title="Toplam Sipariş"
          value={fmtN(kpi.totalOrders)}
          icon={ShoppingCart}
          gradient="from-green-500 to-emerald-600"
          shadow="hover:shadow-emerald-500/30"
          sub={`${fmtN(kpi.pendingOrders)} bekliyor`}
        />
        <KPICard
          loading={loading}
          title="Ürün Çeşidi"
          value={fmtN(kpi.totalProducts)}
          icon={Package}
          gradient="from-purple-500 to-purple-700"
          shadow="hover:shadow-purple-500/30"
          sub={kpi.lowStockCount > 0 ? `⚠️ ${kpi.lowStockCount} düşük stok` : '✅ Stok sağlıklı'}
        />
        <KPICard
          loading={loading}
          title="Müşteri"
          value={fmtN(kpi.totalCustomers)}
          icon={Users}
          gradient="from-orange-500 to-red-500"
          shadow="hover:shadow-orange-500/30"
          sub={kpi.outstandingInvoices > 0 ? `${kpi.outstandingInvoices} bekleyen fatura` : 'Bekleyen fatura yok'}
        />
      </div>

      {/* ── Grafikler (Gelir Trendi + Pasta) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gelir & Sipariş — Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
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
                      <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{fmtN(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 6 Aylık Bar Chart ──────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">6 Aylık Gelir Trendi</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">Aylık bazda</span>
        </div>
        {loading ? <Skeleton className="h-44" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={summary?.monthlyTrend || []}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.35} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#64748b"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
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
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {o.order_number || `#${o.id}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {o.customer_name || 'Müşterisiz'} · {fmtDate(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">₺{fmt(o.total_amount)}</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-500" />
            Top Ürünler
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(son 30 gün)</span>
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
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
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
                      <span className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[130px]">{p.name}</span>
                      <span className={`font-bold ${p.stock_quantity === 0 ? 'text-red-600 dark:text-red-300' : 'text-orange-500 dark:text-orange-300'}`}>
                        {p.stock_quantity === 0 ? 'Tükendi!' : `${fmtN(p.stock_quantity)} adet`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${p.stock_quantity === 0 ? 'bg-red-500 dark:bg-red-400' : 'bg-orange-400 dark:bg-orange-300'}`}
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

      {/* ── Top Müşteriler ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
          <Users size={16} className="text-orange-500" />
          En İyi Müşteriler
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(toplam ciro)</span>
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : summary?.topCustomers?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {summary.topCustomers.map((c, i) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              const gradients = [
                'from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/20 dark:border-yellow-700',
                'from-gray-50 to-slate-50 border-gray-200 dark:from-gray-800 dark:to-slate-800 dark:border-gray-600',
                'from-orange-50 to-amber-50 border-orange-200 dark:from-orange-900/20 dark:to-amber-900/20 dark:border-orange-700',
                'from-white to-gray-50 border-gray-100 dark:from-gray-800 dark:to-gray-800 dark:border-gray-700',
                'from-white to-gray-50 border-gray-100 dark:from-gray-800 dark:to-gray-800 dark:border-gray-700',
              ];
              return (
                <div key={c.id} className={`rounded-xl border p-3 bg-gradient-to-br ${gradients[i]} flex flex-col items-center text-center gap-1`}>
                  <span className="text-2xl">{medals[i]}</span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate w-full">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fmtN(c.total_orders)} sipariş</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₺{fmt(c.total_revenue)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm py-6">Müşteri verisi yok</p>
        )}
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
