import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { authService } from '../services/authService';
import supportService from '../services/supportService';
import Button from '../components/UI/Button';
import { LifeBuoy, ArrowLeft } from 'lucide-react';

// Helix-Ware destek ekibi girişi: müşteri yöneticisinin Ayarlar → Destek Erişimi'nden verdiği kodla.
export default function SupportLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.replace(/[\s-]/g, '').length < 12) {
      toast.error('Erişim kodu 12 karakterdir (ör. ABCD-EFGH-JKMN).');
      return;
    }
    setLoading(true);
    try {
      await supportService.login(code.trim());
      const profile = await authService.getProfile();
      login(profile.data, null);
      toast.success('Destek oturumu açıldı.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Destek girişi başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Destek Girişi</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Bu giriş yalnızca Helix-Ware destek ekibi içindir. Firma yöneticisinin
          <strong> Ayarlar → Destek Erişimi</strong> bölümünden verdiği erişim kodunu girin.
          Oturum, iznin süresi dolunca kendiliğinden kapanır ve her işlem firmaya raporlanır.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <label htmlFor="support-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Erişim kodu
          </label>
          <input
            id="support-code"
            type="text"
            autoComplete="off"
            spellCheck="false"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-JKMN"
            className="w-full px-4 py-3 font-mono text-xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Giriş yapılıyor…' : 'Destek oturumu aç'}
          </Button>
        </form>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-500">
          <ArrowLeft className="w-4 h-4" /> Normal girişe dön
        </Link>
      </div>
    </div>
  );
}
