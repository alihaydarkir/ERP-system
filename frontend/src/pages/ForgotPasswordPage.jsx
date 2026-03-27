import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import { Mail, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Lütfen e-posta adresinizi girin');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      if (response?.success) {
        setSent(true);
        toast.success('İstek alındı. E-posta adresinizi kontrol edin.');
      }
    } catch (_) {
      // Bilgi sızdırmamak için aynı mesajı göster
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Şifremi Unuttum</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          E-posta adresinizi girin, sıfırlama bağlantısını gönderelim.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="forgot-email"
            label="E-posta"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="isim@sirket.com"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            Gönder
          </Button>
        </form>

        {sent && (
          <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
            Eğer e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.
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
