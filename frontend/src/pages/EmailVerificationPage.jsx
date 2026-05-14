import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { MailCheck, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

export default function EmailVerificationPage() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    return pathToken || searchParams.get('token') || '';
  }, [pathToken, searchParams]);

  const [status, setStatus] = useState(token ? 'loading' : 'invalid');
  const [message, setMessage] = useState('E-posta doğrulaması yapılıyor...');

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      if (!token) {
        if (!mounted) return;
        setStatus('invalid');
        setMessage('Doğrulama bağlantısı geçersiz veya eksik.');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        if (!mounted) return;

        if (response?.success) {
          setStatus('success');
          setMessage('E-posta adresiniz başarıyla doğrulandı.');
          return;
        }

        setStatus('error');
        setMessage(response?.message || 'Doğrulama işlemi tamamlanamadı.');
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setMessage(error?.response?.data?.message || 'Doğrulama bağlantısı geçersiz veya süresi dolmuş olabilir.');
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          {status === 'loading' && <Loader2 className="animate-spin text-blue-500" size={24} />}
          {status === 'success' && <MailCheck className="text-green-500" size={24} />}
          {(status === 'error' || status === 'invalid') && <XCircle className="text-red-500" size={24} />}

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">E-posta Doğrulama</h1>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>

        {status === 'success' && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
            Hesabınızı artık normal şekilde kullanabilirsiniz.
          </div>
        )}

        {(status === 'error' || status === 'invalid') && (
          <div className="mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-300">
            Bağlantı süresi dolduysa yeni doğrulama e-postası isteyebilirsiniz.
          </div>
        )}

        <div className="mt-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft size={16} className="mr-1" />
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
