import { useState, useEffect, useCallback } from 'react';
import backupService from '../../services/backupService';
import useUIStore from '../../store/uiStore';

const MIN_PASSWORD = 12;

const inputClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const formatSize = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

const errorMessage = (error, fallback) => {
  if (error.response?.data?.code === 'TWO_FA_REQUIRED') {
    return 'Önce Profil sayfasından iki faktörlü kimlik doğrulamayı (2FA) açın.';
  }
  return error.response?.data?.message || fallback;
};

// Her işlem formunda ortak: alanlar + 6 haneli 2FA kodu + gönder
function ActionForm({ title, description, fields, submitLabel, onSubmit, danger = false }) {
  const empty = Object.fromEntries([...fields.map((f) => [f.name, '']), ['totp', '']]);
  const [values, setValues] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const ok = await onSubmit(values);
      if (ok !== false) {
        setValues(empty);
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left text-gray-800 dark:text-gray-100 font-medium"
      >
        <span>{title}</span>
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          {description && <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>}
          {fields.map((f) => (
            <div key={f.name}>
              <label className={labelClass}>{f.label}</label>
              <input
                type={f.type || 'password'}
                autoComplete="off"
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                minLength={f.minLength}
                required
                className={inputClass}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>İki aşamalı doğrulama kodu (2FA)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={values.totp}
              onChange={(e) => setValues((v) => ({ ...v, totp: e.target.value }))}
              pattern="\d{6}"
              maxLength={6}
              required
              className={`${inputClass} max-w-[10rem] font-mono tracking-widest`}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className={`px-5 py-2 text-white rounded-lg transition disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy ? 'İşleniyor…' : submitLabel}
          </button>
        </form>
      )}
    </div>
  );
}

function RecoveryCodeNotice({ code, onDone }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-5 space-y-3">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        <strong>Kurtarma kodu — yalnızca şimdi gösterilir.</strong> Yazdırıp ya da kâğıda yazıp kasada saklayın.
        Yedek parolasını unutursanız yedekleri yalnız bu kodla açabilirsiniz. Helix-Ware dahil kimse bu kodu
        bilmez ve yeniden gösteremez.
      </p>
      <p className="font-mono text-2xl tracking-widest text-amber-900 dark:text-amber-100 select-all break-all">{code}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
        >
          Yazdır
        </button>
        <label className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Kodu güvenli bir yere kaydettim
        </label>
        <button
          type="button"
          disabled={!confirmed}
          onClick={onDone}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

export default function BackupSettings() {
  const { showSuccess, showError } = useUIStore();
  const [status, setStatus] = useState(null);
  const [recoveryCode, setRecoveryCode] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await backupService.getStatus();
      setStatus(res.data);
    } catch (error) {
      showError(errorMessage(error, 'Yedek durumu alınamadı'));
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  // Ortak çalıştırıcı: başarıda mesaj + yenile; hatada mesaj ve formu açık bırak
  const run = (action, successMessage, { confirmField } = {}) => async (values) => {
    if (confirmField && values[confirmField] !== values[`${confirmField}_again`]) {
      showError('Yeni parolalar eşleşmiyor.');
      return false;
    }
    try {
      const res = await action(values);
      if (res.data?.recovery_code) setRecoveryCode(res.data.recovery_code);
      showSuccess(res.message || successMessage);
      await load();
      return true;
    } catch (error) {
      showError(errorMessage(error, 'İşlem yapılamadı'));
      return false;
    }
  };

  if (!status) {
    return <p className="text-gray-500 dark:text-gray-400">Yükleniyor…</p>;
  }

  const newPasswordFields = [
    { name: 'new_password', label: `Yeni yedek parolası (en az ${MIN_PASSWORD} karakter)`, minLength: MIN_PASSWORD },
    { name: 'new_password_again', label: 'Yeni yedek parolası (tekrar)', minLength: MIN_PASSWORD },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Yedekler</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Veritabanı her gün yedeklenir ve <strong>yalnız sizin parolanızla</strong> açılabilecek şekilde şifrelenir.
          Parolayı unutursanız kurulumda verilen <strong>kurtarma koduyla</strong> yeni parola belirleyebilirsiniz;
          eski yedeklerin hepsi yeni parolayla açılmaya devam eder. Her işlem iki aşamalı doğrulama ister, kayıt altına
          alınır ve yöneticilere bildirilir.
        </p>
      </div>

      {recoveryCode && <RecoveryCodeNotice code={recoveryCode} onDone={() => setRecoveryCode(null)} />}

      {!status.available && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-sm text-gray-600 dark:text-gray-300">
          Yedek şifrelemesi şirket içi kurulumda yönetilir. Bu ortamda yedekler Helix-Ware tarafından yönetiliyor.
        </div>
      )}

      {status.available && !status.configured && (
        <div className="space-y-3">
          <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
            Yedek şifrelemesi kurulmadı: yedekler şu an <strong>şifresiz</strong> alınıyor.
          </div>
          <ActionForm
            title="Yedek şifrelemesini kur"
            description="Bir yedek parolası belirleyin. Ardından bir kez gösterilecek kurtarma kodunu yazdırıp saklayın."
            fields={[
              { name: 'password', label: `Yedek parolası (en az ${MIN_PASSWORD} karakter)`, minLength: MIN_PASSWORD },
              { name: 'password_again', label: 'Yedek parolası (tekrar)', minLength: MIN_PASSWORD },
            ]}
            submitLabel="Şifrelemeyi kur"
            onSubmit={run(backupService.setup, 'Yedek şifrelemesi kuruldu', { confirmField: 'password' })}
          />
        </div>
      )}

      {status.available && status.configured && (
        <div className="space-y-3">
          <div className="border border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-sm text-green-900 dark:text-green-200 space-y-1">
            <p>
              <strong>Yedekler şifreli.</strong> Anahtar: <span className="font-mono">{status.key_id}</span>
            </p>
            <p>
              Parola son değişim: {formatDateTime(status.password_changed_at)} · Kurtarma kodu:{' '}
              {formatDateTime(status.recovery_rotated_at)}
            </p>
          </div>
          <ActionForm
            title="Son yedeği doğrula"
            description="Son şifreli yedek parolanızla gerçekten açılıyor mu, dener. Hiçbir şey değiştirilmez."
            fields={[{ name: 'password', label: 'Yedek parolası' }]}
            submitLabel="Doğrula"
            onSubmit={run(backupService.verifyLatest, 'Son yedek açılabiliyor')}
          />
          <ActionForm
            title="Yedek parolasını değiştir"
            fields={[{ name: 'current_password', label: 'Mevcut yedek parolası' }, ...newPasswordFields]}
            submitLabel="Parolayı değiştir"
            onSubmit={run(backupService.changePassword, 'Yedek parolası değiştirildi', { confirmField: 'new_password' })}
          />
          <ActionForm
            title="Parolamı unuttum (kurtarma kodu)"
            description="Basılı kurtarma koduyla yeni bir yedek parolası belirleyin. Kurtarma kodu aynı kalır."
            fields={[{ name: 'recovery_code', label: 'Kurtarma kodu', type: 'text' }, ...newPasswordFields]}
            submitLabel="Yeni parola belirle"
            onSubmit={run(backupService.recover, 'Yeni yedek parolası belirlendi', { confirmField: 'new_password' })}
          />
          <ActionForm
            title="Yeni kurtarma kodu üret"
            description="Kod kaybolduysa ya da başkası gördüyse. Eski kod bu andan itibaren hiçbir yedeği açmaz."
            fields={[{ name: 'password', label: 'Yedek parolası' }]}
            submitLabel="Yeni kod üret"
            danger
            onSubmit={run(backupService.rotateRecoveryCode, 'Yeni kurtarma kodu üretildi')}
          />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Alınan yedekler</h3>
        {status.unencrypted_count > 0 && status.configured && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
            {status.unencrypted_count} şifresiz eski yedek var; bir sonraki şifreli yedekten sonra silinir.
          </p>
        )}
        {status.backups.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Henüz yedek yok.</p>
        ) : (
          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3">Tarih</th>
                <th className="py-2 pr-3">Dosya</th>
                <th className="py-2 pr-3">Boyut</th>
                <th className="py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {status.backups.map((b) => (
                <tr key={b.name} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(b.created_at)}</td>
                  <td className="py-2 pr-3 font-mono text-xs break-all">{b.name}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{formatSize(b.size)}</td>
                  <td className="py-2">
                    {b.encrypted ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Şifreli</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Şifresiz</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-4">
        <strong>Geri yükleme</strong> bu bilgisayarda, ERP klasöründen yapılır: Windows&apos;ta{' '}
        <code className="font-mono">kurulum\geri-yukle.ps1</code>, Linux/macOS&apos;ta{' '}
        <code className="font-mono">kurulum/geri-yukle.sh</code>. Betik yedek parolasını ya da kurtarma kodunu sorar,
        önce mevcut hâlin güvenlik yedeğini alır.
      </div>
    </div>
  );
}
