import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import { Lock, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Geçersiz sıfırlama bağlantısı');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== repeatPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(token, newPassword);
      if (response?.success) {
        setDone(true);
        toast.success('Şifreniz başarıyla güncellendi');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Şifre sıfırlama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Şifre Sıfırla</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Yeni şifrenizi belirleyin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="reset-password"
            label="Yeni Şifre"
            type="password"
            icon={Lock}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Input
            id="reset-password-repeat"
            label="Yeni Şifre (Tekrar)"
            type="password"
            icon={Lock}
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            Kaydet
          </Button>
        </form>

        {done && (
          <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
            Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
          </div>
        )}

        <div className="mt-6">
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
