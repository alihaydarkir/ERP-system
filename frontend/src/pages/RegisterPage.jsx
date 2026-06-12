import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { hasValidationErrors, validateRegisterForm } from '../utils/validators/authValidators';
import { Mail, Lock, User, ArrowRight, LayoutDashboard, Building2, ShoppingBag } from 'lucide-react';

const ACCOUNT_TYPES = [
  {
    value: 'user',
    label: 'Çalışan / Personel',
    description: 'Şirket içi ERP erişimi',
    icon: Building2,
    color: 'violet',
  },
  {
    value: 'customer',
    label: 'Müşteri',
    description: 'Sipariş ve çek takibi',
    icon: ShoppingBag,
    color: 'emerald',
  },
];

export default function RegisterPage() {
  const [accountType, setAccountType] = useState('user');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateRegisterForm(formData);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    setLoading(true);
    try {
      const response = await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: accountType,
      });

      if (response.success) {
        const msg = accountType === 'customer'
          ? 'Müşteri hesabınız oluşturuldu! Giriş yapabilirsiniz.'
          : 'Kayıt başarılı! Giriş yapabilirsiniz.';
        toast.success(msg);
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kayıt başarısız!');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Sol taraf — görsel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-purple-800 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20" />
        <div className="relative z-10 text-center px-12">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
              <LayoutDashboard size={48} className="text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-6">Aramıza Katılın</h2>
          <p className="text-primary-100 text-lg leading-relaxed max-w-md mx-auto">
            Binlerce işletme gibi siz de süreçlerinizi dijitalleştirin. Hızlı, güvenli ve kolay yönetim.
          </p>
        </div>
      </div>

      {/* Sağ taraf — form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobil logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex w-16 h-16 bg-primary-600 rounded-xl items-center justify-center shadow-lg mb-4">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ERP Sistem</h2>
          </div>

          <div className="text-left mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Hesap Oluştur</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                Giriş yapın
              </Link>
            </p>
          </div>

          {/* Hesap tipi seçimi */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Hesap türünüzü seçin</p>
            <div className="grid grid-cols-2 gap-3">
              {ACCOUNT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = accountType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAccountType(type.value)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? type.value === 'customer'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={
                        isSelected
                          ? type.value === 'customer'
                            ? 'text-emerald-600'
                            : 'text-violet-600'
                          : 'text-gray-400'
                      }
                    />
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? (type.value === 'customer' ? 'text-emerald-700 dark:text-emerald-400' : 'text-violet-700 dark:text-violet-400') : 'text-gray-700 dark:text-gray-200'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
                    </div>
                    {isSelected && (
                      <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${type.value === 'customer' ? 'bg-emerald-500' : 'bg-violet-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="register-username"
              label="Ad Soyad"
              type="text"
              icon={User}
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="Adınız Soyadınız"
              error={errors.username}
              required
              autoComplete="name"
              className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />

            <Input
              id="register-email"
              label="E-posta Adresi"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="isim@sirket.com"
              error={errors.email}
              required
              autoComplete="email"
              className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Şifre
              </label>
              <Input
                id="register-password"
                type="password"
                icon={Lock}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                error={errors.password}
                required
                autoComplete="new-password"
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">En az 6 karakter olmalıdır.</p>
            </div>

            {accountType === 'customer' && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                <ShoppingBag size={14} className="mt-0.5 shrink-0" />
                <span>Müşteri hesabıyla siparişlerinizi, çeklerinizi ve ürün kataloğunu takip edebilirsiniz.</span>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className={`w-full py-3 shadow-lg text-lg ${
                accountType === 'customer'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
                  : 'shadow-primary-500/30 hover:shadow-primary-600/40'
              }`}
              icon={ArrowRight}
            >
              {accountType === 'customer' ? 'Müşteri Hesabı Oluştur' : 'Kayıt Ol'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
