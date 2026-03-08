import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, FileText } from 'lucide-react';
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
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={28} />
            Faturalar
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Fatura oluştur, yönet ve PDF olarak indir</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus size={18} /> Yeni Fatura
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Toplam Tahsil Edilen"
            value={`₺${fmt(stats.total_paid)}`}
            icon="✅"
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            label="Bekleyen Tahsilat"
            value={`₺${fmt(stats.total_outstanding)}`}
            icon="⏳"
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            label="Vadesi Geçmiş"
            value={`${stats.overdue_count} Fatura`}
            icon="⚠️"
            color="from-red-500 to-rose-600"
          />
          <StatCard
            label="Taslak"
            value={`${stats.draft_count} Fatura`}
            icon="📝"
            color="from-gray-400 to-gray-500"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fatura no, müşteri adı..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Ara</button>
          <button type="button" onClick={() => { setSearch(''); setPage(1); fetchInvoices(); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Yenile">
            <RefreshCw size={15} />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin text-4xl">⏳</div>
            <span className="ml-3 text-gray-500">Faturalar yükleniyor...</span>
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
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <span className="text-gray-500">
              Toplam <strong>{total}</strong> fatura
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition"
              >← Önceki</button>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition"
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
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white shadow-sm`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-white/80 text-xs mt-0.5">{label}</div>
    </div>
  );
}
