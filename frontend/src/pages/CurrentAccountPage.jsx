import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronRight, X, TrendingUp, TrendingDown, Users, FileText, ShoppingCart, AlertCircle } from 'lucide-react';
import currentAccountService from '../services/currentAccountService';

const fmt = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  processing: 'bg-blue-100 text-blue-700',
  paid:       'bg-green-100 text-green-700',
  sent:       'bg-blue-100 text-blue-700',
  overdue:    'bg-red-100 text-red-700',
  draft:      'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300',
};

const STATUS_TR = {
  pending: 'Bekliyor', completed: 'Tamamlandı', cancelled: 'İptal',
  processing: 'İşleniyor', paid: 'Ödendi', sent: 'Gönderildi',
  overdue: 'Vadesi Geçti', draft: 'Taslak',
};

function SummaryCard({ title, value, sub, icon: Icon, color, shadow, children }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} p-5 rounded-xl text-white shadow-lg ${shadow || ''} border border-white/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 pointer-events-none">
        <Icon size={80} className="text-white" />
      </div>
      <div className="relative z-10">
        <div className="mb-2 inline-flex p-2 bg-white/20 border border-white/25 rounded-lg backdrop-blur-sm">
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-xs opacity-85 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

// Müşteri Detay Drawer
function AccountDrawer({ customerId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState('');

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    Promise.all([
      currentAccountService.getDetail(customerId),
      currentAccountService.getTransactions(customerId, { limit: 50 }),
    ]).then(([d, t]) => {
      if (d.success)  setDetail(d.data);
      if (t.success)  setTransactions(t.data.transactions || []);
    }).finally(() => setLoading(false));
  }, [customerId]);

  const filtered = txFilter
    ? transactions.filter(tx => tx.src === txFilter)
    : transactions;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
              {loading ? '...' : detail?.customer?.company_name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{detail?.customer?.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Bakiye Özet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">Toplam Satış</p>
                <p className="text-lg font-bold text-blue-800">{fmt(detail.summary.total_sales)}</p>
                <p className="text-xs text-blue-500">{detail.summary.order_count} sipariş</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-xs text-green-600 mb-1">Ödenen</p>
                <p className="text-lg font-bold text-green-800">{fmt(detail.summary.total_paid)}</p>
                <p className="text-xs text-green-500">{detail.summary.invoice_count} fatura</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-xs text-purple-600 mb-1">Toplam Fatura</p>
                <p className="text-lg font-bold text-purple-800">{fmt(detail.summary.total_invoiced)}</p>
                <p className="text-xs text-purple-500">{detail.summary.open_invoices} açık</p>
              </div>
              <div className={`p-4 rounded-xl ${detail.summary.outstanding_balance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                <p className={`text-xs mb-1 ${detail.summary.outstanding_balance > 0 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                  Açık Bakiye
                </p>
                <p className={`text-lg font-bold ${detail.summary.outstanding_balance > 0 ? 'text-red-700' : 'text-gray-600 dark:text-gray-300'}`}>
                  {fmt(detail.summary.outstanding_balance)}
                </p>
                {detail.summary.outstanding_balance > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle size={10} className="text-red-400" />
                    <p className="text-xs text-red-400">Tahsil edilmedi</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hareket Filtresi */}
            <div className="flex gap-2">
              {[['', 'Tümü'], ['order', 'Siparişler'], ['invoice', 'Faturalar']].map(([v, l]) => (
                <button key={v} onClick={() => setTxFilter(v)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${txFilter === v ? 'bg-gray-800 text-white' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Hareket Listesi */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-400 text-sm py-8">Hareket bulunamadı</p>
              ) : filtered.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${tx.src === 'order' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {tx.src === 'order'
                        ? <ShoppingCart size={14} className="text-purple-600" />
                        : <FileText size={14} className="text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 font-mono">{tx.ref_number}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400">{fmtDate(tx.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmt(tx.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[tx.display_status] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'}`}>
                      {STATUS_TR[tx.display_status] || tx.display_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-400 text-sm">
            Veri yüklenemedi
          </div>
        )}
      </div>
    </div>
  );
}

// Ana Sayfa
export default function CurrentAccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (s = search, p = page) => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        currentAccountService.getList({ search: s || undefined, page: p, limit: 20 }),
        currentAccountService.getSummary(),
      ]);
      if (listRes.success) {
        setAccounts(listRes.data.accounts || []);
        setPagination(listRes.data.pagination || {});
      }
      if (sumRes.success) setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(search, 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cari Hesaplar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Müşteri bakiyeleri ve hareket geçmişi</p>
        </div>
        <button
          onClick={() => load()}
          className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw size={15} /> Yenile
        </button>
      </div>

      {/* Özet Kartları */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            title="Toplam Müşteri"
            value={summary.total_customers}
            sub={`${summary.customers_with_balance} açık bakiyeli`}
            icon={Users}
            color="from-blue-500 to-blue-700"
            shadow="hover:shadow-blue-500/30"
          />
          <SummaryCard
            title="Toplam Faturalanan"
            value={fmt(summary.total_invoiced)}
            icon={FileText}
            color="from-purple-500 to-purple-700"
            shadow="hover:shadow-purple-500/30"
          />
          <SummaryCard
            title="Toplam Tahsil"
            value={fmt(summary.total_paid)}
            icon={TrendingUp}
            color="from-green-500 to-green-700"
            shadow="hover:shadow-green-500/30"
          />
          <SummaryCard
            title="Açık Bakiye"
            value={fmt(summary.total_outstanding)}
            icon={TrendingDown}
            color={parseFloat(summary.total_outstanding) > 0 ? 'from-red-500 to-red-700' : 'from-gray-500 to-gray-700'}
            shadow={parseFloat(summary.total_outstanding) > 0 ? 'hover:shadow-red-500/30' : 'hover:shadow-gray-500/30'}
          >
            {parseFloat(summary.total_outstanding) > 0 && (
              <div className="flex items-center gap-1 mt-1 opacity-80">
                <AlertCircle size={12} />
                <p className="text-xs">Tahsil bekleniyor</p>
              </div>
            )}
          </SummaryCard>
        </div>
      )}

      {/* Arama */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Müşteri adı veya firma ara..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Ara
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(1); load('', 1); }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            <X size={15} />
          </button>
        )}
      </form>
      </div>

      {/* Tablo */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Müşteri bulunamadı</p>
          </div>
        ) : (
          <table className="min-w-full border-collapse divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Müşteri / Firma', 'Toplam Satış', 'Sipariş', 'Faturalanan', 'Ödenen', 'Açık Bakiye', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer" onClick={() => setSelectedId(acc.id)}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{acc.company_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400">{acc.full_name}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-200 font-medium">{fmt(acc.total_sales)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{acc.order_count}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-200">{fmt(acc.total_invoiced)}</td>
                  <td className="px-5 py-3 text-sm text-green-700 font-medium">{fmt(acc.total_paid)}</td>
                  <td className="px-5 py-3">
                    {parseFloat(acc.outstanding_balance) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        <AlertCircle size={10} />
                        {fmt(acc.outstanding_balance)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Bakiye yok</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ChevronRight size={16} className="text-gray-400 dark:text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pagination.total} müşteriden {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} gösteriliyor
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(search, p); }}
                className="px-3 py-1 text-xs rounded border disabled:opacity-40 hover:bg-gray-100 dark:bg-gray-700/50 transition-colors">
                ← Önceki
              </button>
              <span className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300">{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(search, p); }}
                className="px-3 py-1 text-xs rounded border disabled:opacity-40 hover:bg-gray-100 dark:bg-gray-700/50 transition-colors">
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detay Drawer */}
      {selectedId && (
        <AccountDrawer customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      </div>
    </div>
  );
}
