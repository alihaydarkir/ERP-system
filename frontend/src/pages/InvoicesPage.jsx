import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, FileText, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import InvoiceForm from '../components/Invoices/InvoiceForm';
import InvoiceDetail from '../components/Invoices/InvoiceDetail';
import InvoiceList from '../components/Invoices/InvoiceList';
import useUIStore from '../store/uiStore';

const STATUS_FILTERS = [
  { value: '',          label: 'Tümü' },
  { value: 'draft',     label: 'Taslak' },
  { value: 'sent',      label: 'Gönderildi' },
  { value: 'paid',      label: 'Ödendi' },
  { value: 'overdue',   label: 'Vadesi Geçti' },
  { value: 'cancelled', label: 'İptal' },
];

export default function InvoicesPage() {
  const { showSuccess, showError, showConfirm } = useUIStore();

  const [invoices, setInvoices]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const LIMIT = 20;

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await invoiceService.getAll({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: LIMIT
      });
      setInvoices(res.data || []);
      setTotal(res.total || 0);
    } catch {
      showError('Faturalar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await invoiceService.getStats();
      setStats(res.data);
    } catch { /* stats optional */ }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [fetchInvoices, fetchStats]);

  /* ─── Actions ─── */
  const handleCreate = async (payload) => {
    try {
      setIsSaving(true);
      await invoiceService.create(payload);
      showSuccess('Fatura başarıyla oluşturuldu! 🎉');
      setShowForm(false);
      fetchInvoices();
      fetchStats();
    } catch (err) {
      showError(err.response?.data?.message || 'Fatura oluşturulamadı');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async (id) => {
    showConfirm({
      title: 'Ödendi Olarak İşaretle',
      message: 'Bu faturayı ödendi olarak işaretlemek istiyor musunuz?',
      confirmText: 'Evet, Ödendi',
      type: 'success',
      onConfirm: async () => {
        try {
          await invoiceService.updateStatus(id, 'paid');
          showSuccess('Fatura ödendi olarak işaretlendi ✅');
          if (selectedInvoice?.id === id) {
            const updated = await invoiceService.getById(id);
            setSelectedInvoice(updated.data);
          }
          fetchInvoices();
          fetchStats();
        } catch {
          showError('Durum güncellenemedi');
        }
      }
    });
  };

  const handleMarkSent = async (id) => {
    try {
      await invoiceService.updateStatus(id, 'sent');
      showSuccess('Fatura gönderildi olarak işaretlendi 📤');
      fetchInvoices();
      fetchStats();
    } catch {
      showError('Durum güncellenemedi');
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: 'Faturayı Sil',
      message: 'Bu fatura kalıcı olarak silinecek. Emin misiniz?',
      confirmText: 'Sil',
      type: 'danger',
      onConfirm: async () => {
        try {
          await invoiceService.delete(id);
          showSuccess('Fatura silindi');
          if (selectedInvoice?.id === id) setSelectedInvoice(null);
          fetchInvoices();
          fetchStats();
        } catch {
          showError('Fatura silinemedi');
        }
      }
    });
  };

  const handleView = async (inv) => {
    try {
      const res = await invoiceService.getById(inv.id);
      setSelectedInvoice(res.data);
    } catch {
      showError('Fatura yüklenemedi');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parseFloat(n) || 0);
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600 dark:text-blue-400" size={32} />
            Faturalar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Fatura oluştur, yönet ve PDF olarak indir</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="group relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus size={18} className="mr-2" />
          <span>Yeni Fatura</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Toplam Tahsil Edilen"
            value={`₺${fmt(stats.total_paid)}`}
            icon={CheckCircle2}
            color="from-green-500 to-emerald-600"
            shadow="hover:shadow-emerald-500/30"
          />
          <StatCard
            label="Bekleyen Tahsilat"
            value={`₺${fmt(stats.total_outstanding)}`}
            icon={Clock3}
            color="from-blue-500 to-indigo-600"
            shadow="hover:shadow-blue-500/30"
          />
          <StatCard
            label="Vadesi Geçmiş"
            value={`${stats.overdue_count} Fatura`}
            icon={AlertTriangle}
            color="from-red-500 to-rose-600"
            shadow="hover:shadow-rose-500/30"
          />
          <StatCard
            label="Taslak"
            value={`${stats.draft_count} Fatura`}
            icon={FileText}
            color="from-gray-400 to-gray-500"
            shadow="hover:shadow-gray-500/30"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center transition-colors duration-200">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fatura no, müşteri adı..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-56 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button type="button" onClick={() => { setSearch(''); setPage(1); fetchInvoices(); }}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Yenile">
            <RefreshCw size={15} />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin text-4xl">⏳</div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Faturalar yükleniyor...</span>
          </div>
        ) : (
          <InvoiceList
            invoices={invoices}
            onView={handleView}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onMarkSent={handleMarkSent}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Toplam <strong>{total}</strong> fatura
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition"
              >← Önceki</button>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition"
              >Sonraki →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <InvoiceForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isLoading={isSaving}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={handleMarkPaid}
        />
      )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, shadow }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} rounded-xl p-4 text-white shadow-sm ${shadow || ''} border border-white/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl`}>
      <div className="absolute -right-3 -bottom-3 opacity-10 rotate-12 pointer-events-none">
        <Icon size={72} className="text-white" />
      </div>
      <div className="relative z-10">
        <div className="mb-2 inline-flex p-2 bg-white/20 border border-white/25 rounded-lg backdrop-blur-sm">
          <Icon size={20} className="text-white" />
        </div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="text-white/85 text-xs mt-0.5 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}
