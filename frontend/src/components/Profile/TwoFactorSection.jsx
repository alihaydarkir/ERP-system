import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound, Copy, Download, RefreshCw } from 'lucide-react';
import twoFactorService from '../../services/twoFactorService';
import useUIStore from '../../store/uiStore';
import Button from '../UI/Button';
import Input from '../UI/Input';

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * Profil sayfasında 2FA yönetimi: kurulum (QR + ilk kod), yedek kodlar (yalnızca bir kez gösterilir),
 * yedek kod yenileme ve kapatma. onChanged(): durum değişince profili yenilemek için.
 */
export default function TwoFactorSection({ onChanged }) {
  const { showSuccess, showError } = useUIStore();
  // loading | off | setup | on | disabling | regenerating
  const [mode, setMode] = useState('loading');
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null); // { secret, qrCode }
  const [backupCodes, setBackupCodes] = useState(null);
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await twoFactorService.getStatus();
      setStatus(res.data);
      setMode(res.data?.is_enabled ? 'on' : 'off');
    } catch (err) {
      showError(errorMessage(err, '2FA durumu alınamadı'));
      setMode('off');
    }
  }, [showError]);

  useEffect(() => { refresh(); }, [refresh]);

  const reset = () => { setCode(''); setPassword(''); };

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await twoFactorService.startSetup();
      setSetup({ secret: res.secret, qrCode: res.qrCode });
      reset();
      setMode('setup');
    } catch (err) {
      showError(errorMessage(err, '2FA kurulumu başlatılamadı'));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const completeSetup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await twoFactorService.completeSetup(code.trim());
      setBackupCodes(res.backupCodes || []);
      setSaved(false);
      setSetup(null);
      reset();
      showSuccess('2FA etkinleştirildi');
      await refresh();
      onChanged?.();
    } catch (err) {
      showError(errorMessage(err, 'Doğrulama kodu geçersiz'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await twoFactorService.regenerateBackupCodes(code.trim());
      setBackupCodes(res.backupCodes || []);
      setSaved(false);
      reset();
      showSuccess('Yeni yedek kodlar üretildi');
      await refresh();
    } catch (err) {
      showError(errorMessage(err, 'Yedek kodlar üretilemedi'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await twoFactorService.disable(password, code.trim());
      reset();
      showSuccess('2FA devre dışı bırakıldı');
      await refresh();
      onChanged?.();
    } catch (err) {
      showError(errorMessage(err, '2FA devre dışı bırakılamadı'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText((backupCodes || []).join('\n'));
      showSuccess('Yedek kodlar panoya kopyalandı');
    } catch {
      showError('Kopyalanamadı; kodları elle not alın');
    }
  };

  const downloadCodes = () => {
    const text = `Helix-Ware ERP Pro — 2FA yedek kodları\nHer kod yalnızca bir kez kullanılabilir.\n\n${(backupCodes || []).join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erp-2fa-yedek-kodlari.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800';

  // Yedek kodlar: kurulumdan/yenilemeden hemen sonra bir kez gösterilir
  if (backupCodes) {
    return (
      <section className={card} data-testid='two-factor-backup-codes'>
        <h4 className='mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white'>
          <KeyRound size={20} /> Yedek kodlarınız
        </h4>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
          Telefonunuza erişemediğinizde bu kodlardan biriyle giriş yapabilirsiniz. Her kod <strong>yalnızca bir kez</strong>
          çalışır ve <strong>bir daha gösterilmez</strong>. Güvenli bir yere kaydedin.
        </p>
        <ul className='mb-4 grid grid-cols-2 gap-2 font-mono text-sm text-gray-900 dark:text-gray-100 sm:grid-cols-5'>
          {backupCodes.map((c) => (
            <li key={c} className='rounded bg-gray-100 px-2 py-1 text-center dark:bg-gray-700'>{c}</li>
          ))}
        </ul>
        <div className='mb-4 flex flex-wrap gap-2'>
          <Button type='button' variant='secondary' icon={Copy} onClick={copyCodes}>Kopyala</Button>
          <Button type='button' variant='secondary' icon={Download} onClick={downloadCodes}>İndir (.txt)</Button>
        </div>
        <label className='mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
          <input type='checkbox' checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Kodları güvenli bir yere kaydettim
        </label>
        <Button type='button' disabled={!saved} onClick={() => setBackupCodes(null)}>Tamam</Button>
      </section>
    );
  }

  if (mode === 'loading') {
    return <section className={card}><p className='text-sm text-gray-500'>2FA durumu yükleniyor…</p></section>;
  }

  if (mode === 'setup' && setup) {
    return (
      <section className={card} data-testid='two-factor-setup'>
        <h4 className='mb-1 text-lg font-semibold text-gray-900 dark:text-white'>2FA kurulumu</h4>
        <ol className='mb-4 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400'>
          <li>Authenticator uygulamanızla (Google Authenticator, Microsoft Authenticator, Authy…) QR kodu okutun.</li>
          <li>Uygulamada görünen 6 haneli kodu aşağıya girin.</li>
        </ol>
        <div className='mb-4 flex flex-col items-start gap-4 sm:flex-row'>
          <img src={setup.qrCode} alt='2FA QR kodu' className='h-44 w-44 rounded bg-white p-2' />
          <div className='text-sm text-gray-600 dark:text-gray-400'>
            QR okutamıyorsanız anahtarı elle girin:
            <code className='mt-1 block break-all rounded bg-gray-100 px-2 py-1 font-mono text-gray-900 dark:bg-gray-700 dark:text-gray-100'>
              {setup.secret}
            </code>
          </div>
        </div>
        <form onSubmit={completeSetup} className='flex flex-wrap items-end gap-3'>
          <Input
            id='two-factor-setup-code'
            label='6 haneli kod'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder='123456'
            containerClassName='w-44'
          />
          <Button type='submit' loading={busy} disabled={code.length !== 6}>Doğrula ve etkinleştir</Button>
          <Button type='button' variant='secondary' onClick={() => { setSetup(null); reset(); setMode('off'); }}>Vazgeç</Button>
        </form>
      </section>
    );
  }

  if (mode === 'disabling') {
    return (
      <section className={card} data-testid='two-factor-disable'>
        <h4 className='mb-1 text-lg font-semibold text-gray-900 dark:text-white'>2FA’yı kapat</h4>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
          Güvenlik için parolanızı ve güncel bir doğrulama kodunu (veya yedek kodu) girin.
        </p>
        <form onSubmit={disable} className='flex flex-wrap items-end gap-3'>
          <Input id='two-factor-disable-password' label='Parola' type='password' autoComplete='current-password'
            value={password} onChange={(e) => setPassword(e.target.value)} containerClassName='w-56' />
          <Input id='two-factor-disable-code' label='Kod' autoComplete='one-time-code' maxLength={16}
            value={code} onChange={(e) => setCode(e.target.value)} placeholder='123456' containerClassName='w-44' />
          <Button type='submit' loading={busy} disabled={!password || !code.trim()}>Kapat</Button>
          <Button type='button' variant='secondary' onClick={() => { reset(); setMode('on'); }}>Vazgeç</Button>
        </form>
      </section>
    );
  }

  if (mode === 'regenerating') {
    return (
      <section className={card} data-testid='two-factor-regenerate'>
        <h4 className='mb-1 text-lg font-semibold text-gray-900 dark:text-white'>Yedek kodları yenile</h4>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
          Eski kodlar geçersiz olur. Onay için authenticator uygulamanızdaki güncel 6 haneli kodu girin.
        </p>
        <form onSubmit={regenerate} className='flex flex-wrap items-end gap-3'>
          <Input id='two-factor-regenerate-code' label='6 haneli kod' inputMode='numeric' autoComplete='one-time-code'
            maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder='123456' containerClassName='w-44' />
          <Button type='submit' loading={busy} disabled={code.length !== 6}>Yenile</Button>
          <Button type='button' variant='secondary' onClick={() => { reset(); setMode('on'); }}>Vazgeç</Button>
        </form>
      </section>
    );
  }

  const enabled = mode === 'on';
  const remaining = Number(status?.unused_backup_codes ?? 0);
  return (
    <section className={card} data-testid='two-factor-status'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-start gap-3'>
          {enabled
            ? <ShieldCheck size={28} className='mt-0.5 text-green-600' />
            : <ShieldOff size={28} className='mt-0.5 text-gray-400' />}
          <div>
            <h4 className='text-lg font-semibold text-gray-900 dark:text-white'>İki Faktörlü Kimlik Doğrulama (2FA)</h4>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {enabled
                ? `Hesabınız ek güvenlik katmanı ile korunuyor. Kalan yedek kod: ${remaining}.`
                : 'Hesabınızı authenticator uygulamasıyla ek bir güvenlik katmanı ile koruyun.'}
            </p>
            {enabled && remaining <= 2 && (
              <p className='mt-1 text-sm font-medium text-amber-600'>Yedek kodlarınız azalıyor; yenilemeniz önerilir.</p>
            )}
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          {enabled ? (
            <>
              <Button type='button' variant='secondary' icon={RefreshCw} onClick={() => { reset(); setMode('regenerating'); }}>
                Yedek kodları yenile
              </Button>
              {/* Button 'danger' varyantı açık zeminde beyaz yazı veriyor (okunmuyor): kendi sınıflarımız */}
              <button
                type='button'
                onClick={() => { reset(); setMode('disabling'); }}
                className='inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20'
              >
                Devre dışı bırak
              </button>
            </>
          ) : (
            <Button type='button' loading={busy} onClick={startSetup}>Etkinleştir</Button>
          )}
        </div>
      </div>
    </section>
  );
}
