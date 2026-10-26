import { useState, useEffect, useCallback } from 'react';
import supportService from '../../services/supportService';
import useUIStore from '../../store/uiStore';

const DURATION_LABELS = { 1: '1 saat', 4: '4 saat', 24: '24 saat' };
const LEVEL_LABELS = {
  read: 'Salt okunur — yalnızca bakabilir',
  edit: 'Düzeltme yapabilir — kayıtları değiştirebilir',
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const formatRemaining = (seconds) => {
  if (!seconds || seconds <= 0) return 'süresi doldu';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} sa ${m} dk kaldı` : `${m} dk kaldı`;
};

const grantStatus = (grant) => {
  if (grant.revoked_at) return { label: 'İptal edildi', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
  if (grant.is_active) return { label: 'Aktif', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  return { label: 'Süresi doldu', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
};

export default function SupportAccessSettings() {
  const { showSuccess, showError } = useUIStore();
  const [grants, setGrants] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newCode, setNewCode] = useState(null);
  const [activity, setActivity] = useState({ grantId: null, rows: [] });
  const [formData, setFormData] = useState({ duration_hours: 4, access_level: 'read', reason: '' });

  const load = useCallback(async () => {
    try {
      const res = await supportService.listGrants();
      setGrants(res.data?.grants || []);
      setActive(res.data?.active || null);
    } catch (error) {
      showError(error.response?.data?.message || 'Destek izinleri alınamadı');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'duration_hours' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await supportService.createGrant(formData);
      setNewCode(res.data?.code || null);
      setFormData((prev) => ({ ...prev, reason: '' }));
      showSuccess('Destek erişimi açıldı. Kodu destek ekibine iletin.');
      await load();
    } catch (error) {
      showError(error.response?.data?.message || 'Destek erişimi açılamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grantId) => {
    try {
      await supportService.revokeGrant(grantId);
      setNewCode(null);
      showSuccess('Destek erişimi iptal edildi. Açık destek oturumu kapatıldı.');
      await load();
    } catch (error) {
      showError(error.response?.data?.message || 'İptal edilemedi');
    }
  };

  const toggleActivity = async (grantId) => {
    if (activity.grantId === grantId) {
      setActivity({ grantId: null, rows: [] });
      return;
    }
    try {
      const res = await supportService.getActivity(grantId);
      setActivity({ grantId, rows: res.data?.activity || [] });
    } catch (error) {
      showError(error.response?.data?.message || 'İşlem kaydı alınamadı');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Destek Erişimi</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Bir sorun olduğunda Helix-Ware destek ekibine <strong>süreli</strong> erişim verebilirsiniz.
          Erişim siz vermeden açılmaz, süre dolunca kendiliğinden kapanır ve istediğiniz an iptal edebilirsiniz.
          Destek ekibinin yaptığı her işlem aşağıda kayıt altındadır. Destek oturumunda veriler dışa aktarılamaz.
        </p>
      </div>

      {newCode && (
        <div className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
            Erişim kodu — <strong>yalnızca şimdi gösterilir</strong>. Telefonla ya da mesajla destek ekibine iletin:
          </p>
          <p className="font-mono text-3xl tracking-widest text-blue-900 dark:text-blue-100 select-all">{newCode}</p>
        </div>
      )}

      {active ? (
        <div className="border border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-200">Destek erişimi açık</h3>
            <button
              type="button"
              onClick={() => handleRevoke(active.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Şimdi iptal et
            </button>
          </div>
          <p className="text-sm text-green-900 dark:text-green-200">
            {LEVEL_LABELS[active.access_level]} · {formatRemaining(active.remaining_seconds)} · bitiş {formatDateTime(active.expires_at)}
          </p>
          <p className="text-sm text-green-900 dark:text-green-200">Neden: {active.reason}</p>
          <p className="text-sm text-green-900 dark:text-green-200">
            {active.first_used_at ? `Destek ekibi ${formatDateTime(active.first_used_at)} tarihinde giriş yaptı.` : 'Destek ekibi henüz giriş yapmadı.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Yeni destek erişimi</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Süre</label>
            <select
              name="duration_hours"
              value={formData.duration_hours}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {Object.entries(DURATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Yetki</label>
            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-gray-700 dark:text-gray-200 py-1">
                <input
                  type="radio"
                  name="access_level"
                  value={value}
                  checked={formData.access_level === value}
                  onChange={handleChange}
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Neden</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={500}
              placeholder="Örn: Fatura ekranı kaydederken hata veriyor"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? 'Açılıyor…' : 'Destek erişimi ver'}
          </button>
        </form>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Geçmiş</h3>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Yükleniyor…</p>
        ) : grants.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Henüz destek erişimi verilmedi.</p>
        ) : (
          <ul className="space-y-3">
            {grants.map((grant) => {
              const status = grantStatus(grant);
              return (
                <li key={grant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${status.className}`}>{status.label}</span>
                      {formatDateTime(grant.created_at)} · {grant.access_level === 'edit' ? 'Düzeltme' : 'Salt okunur'} ·{' '}
                      {grant.granted_by_name || '—'} · {grant.reason}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleActivity(grant.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {activity.grantId === grant.id ? 'Gizle' : `İşlemler (${grant.request_count})`}
                    </button>
                  </div>
                  {activity.grantId === grant.id && (
                    <div className="mt-3 max-h-64 overflow-y-auto">
                      {activity.rows.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Destek ekibi bu izinle hiç işlem yapmadı.</p>
                      ) : (
                        <table className="w-full text-xs text-left text-gray-700 dark:text-gray-200">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-1 pr-2">Zaman</th>
                              <th className="py-1 pr-2">İşlem</th>
                              <th className="py-1 pr-2">Adres</th>
                              <th className="py-1">Sonuç</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activity.rows.map((row) => (
                              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                                <td className="py-1 pr-2 font-mono">{row.changes?.method}</td>
                                <td className="py-1 pr-2 font-mono break-all">{row.changes?.path}</td>
                                <td className={`py-1 font-mono ${row.changes?.status >= 400 ? 'text-red-600' : ''}`}>{row.changes?.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
