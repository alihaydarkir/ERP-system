import { useState } from 'react';
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import Button from '../UI/Button';
import Input from '../UI/Input';

/**
 * Girişte ikinci adım: parola doğrulandıktan sonra gelen tempToken + TOTP veya yedek kod.
 * onSuccess(payload): oturum açılmış kullanıcı/şirket verisi; onBack(): ilk adıma dön;
 * onExpired(): doğrulama oturumu (5 dk) bitti.
 */
export default function TwoFactorStep({ tempToken, onSuccess, onBack, onExpired }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Doğrulama kodunu girin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authService.verifyTwoFa(tempToken, trimmed);
      if (response?.success) {
        onSuccess(response.data || {});
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'TWO_FA_SESSION_EXPIRED') {
        onExpired?.(data.message);
        return;
      }
      if (data?.code === 'TWO_FA_LOCKED' || err.response?.status === 429) {
        setLocked(true);
      }
      setError(data?.message || 'Doğrulama başarısız');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6' noValidate data-testid='two-factor-step'>
      <div className='flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50 p-4 dark:border-primary-900/40 dark:bg-primary-900/20'>
        <ShieldCheck size={22} className='mt-0.5 flex-shrink-0 text-primary-600' />
        <p className='text-sm text-gray-700 dark:text-gray-300'>
          Hesabınız iki adımlı doğrulama ile korunuyor. Authenticator uygulamanızdaki 6 haneli kodu girin.
          Telefonunuza erişemiyorsanız bir <strong>yedek kod</strong> (XXXXX-XXXXX) kullanabilirsiniz.
        </p>
      </div>

      <Input
        id='two-factor-code'
        label='Doğrulama kodu'
        type='text'
        inputMode='text'
        autoComplete='one-time-code'
        autoFocus
        maxLength={16}
        value={code}
        onChange={(e) => { setCode(e.target.value); setError(''); }}
        placeholder='123456'
        error={error}
        disabled={loading || locked}
        className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 tracking-widest'
      />

      <Button
        type='submit'
        loading={loading}
        disabled={locked}
        className='w-full py-3 shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40 text-lg'
        icon={ArrowRight}
        aria-label='Doğrula'
      >
        Doğrula
      </Button>

      <button
        type='button'
        onClick={onBack}
        className='flex w-full items-center justify-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      >
        <ArrowLeft size={14} /> Geri dön
      </button>
    </form>
  );
}
