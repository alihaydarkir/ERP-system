import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { authService } from '../services/authService';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { hasValidationErrors, validateLoginForm } from '../utils/validators/authValidators';
import { Mail, Lock, ArrowRight, UserCheck, LayoutDashboard } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);
      const payload = response?.data || {};

      if (response.success) {
        login(payload.user, payload.company || null);
        toast.success('Hoş geldiniz, ' + payload.user.username + '! 🎉');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Giriş başarısız!');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);

    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className='min-h-screen flex w-full bg-white dark:bg-gray-900 transition-colors duration-300'>
      {/* Sol Taraf - Görsel Alan */}
      <div className='hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-primary-900 relative overflow-hidden items-center justify-center'>
        <div className='absolute inset-0 bg-primary-900/20 backdrop-blur-[1px]'></div>
        <div className='absolute -top-24 -left-24 w-96 h-96 bg-primary-50 dark:bg-primary-900/200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob'></div>
        <div className='absolute -bottom-24 -right-24 w-96 h-96 bg-purple-50 dark:bg-purple-900/200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000'></div>
        
        <div className='relative z-10 text-center px-12'>
          <div className='mb-8 flex justify-center'>
             <div className='w-24 h-24 bg-white dark:bg-gray-800/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20'>
                <LayoutDashboard size={48} className='text-white' />
             </div>
          </div>
          <h2 className='text-4xl font-bold text-white mb-6'>ERP Sistemine Hoş Geldiniz</h2>
          <p className='text-primary-100 text-lg leading-relaxed max-w-md mx-auto'>
            İş süreçlerinizi yönetmenin en akıllı yolu. Stok, sipariş, finans ve daha fazlası tek bir platformda.
          </p>
        </div>

        {/* Dekoratif Desenler */}
        <div className='absolute bottom-0 w-full h-24 bg-gradient-to-t from-black/20 to-transparent'></div>
      </div>

      {/* Sağ Taraf - Form Alanı */}
      <div className='flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 relative'>
        <div className='mx-auto w-full max-w-sm lg:max-w-md'>
          {/* Mobil Logo */}
          <div className='lg:hidden text-center mb-10'>
             <div className='inline-flex w-16 h-16 bg-primary-600 rounded-xl items-center justify-center shadow-lg mb-4'>
                <LayoutDashboard size={32} className='text-white' />
             </div>
             <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>ERP Sistem</h2>
          </div>

          <div className='text-left mb-10'>
            <h2 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
              Giriş Yap
            </h2>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              Hesabınız yok mu?{' '}
              <Link to='/register' className='font-medium text-primary-600 hover:text-primary-500 transition-colors'>
                Hemen kayıt olun
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6' noValidate>
            <Input
              id='login-email'
              label='E-posta Adresi'
              type='email'
              icon={Mail}
              value={email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder='isim@sirket.com'
              error={errors.email}
              required
              autoFocus
              autoComplete='email'
              className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            />

            <div>
              <div className='flex items-center justify-between mb-1'>
                <label htmlFor='login-password' className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Şifre
                </label>
                <Link to='/forgot-password' className='text-sm font-medium text-primary-600 hover:text-primary-500'>
                  Şifremi unuttum?
                </Link>
              </div>
              <Input
                id='login-password'
                type='password'
                icon={Lock}
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder='••••••••'
                error={errors.password}
                required
                autoComplete='current-password'
                className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              />
            </div>

            <Button
              type='submit'
              loading={loading}
              className='w-full py-3 shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40 text-lg'
              icon={ArrowRight}
              aria-label='Giriş Yap'
            >
              Giriş Yap
            </Button>
          </form>

          <div className='mt-8 pt-6 border-t border-gray-100 dark:border-gray-800'>
             <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800/30'>
                <div className='flex items-start space-x-3'>
                   <div className='flex-shrink-0 mt-0.5'>
                      <UserCheck size={18} className='text-blue-600 dark:text-blue-400' />
                   </div>
                   <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-blue-900 dark:text-blue-300 mb-1'>
                         Hızlı Test Erişimi
                      </p>
                      <div className='grid grid-cols-2 gap-2'>
                        <button 
                          onClick={() => { setEmail('admin@admin.com'); setPassword('admin123'); }}
                          className='text-xs bg-white dark:bg-gray-800 px-2 py-1.5 rounded border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition text-left'
                        >
                          <span className='font-bold block'>Admin</span>
                          admin@admin.com
                        </button>
                        <button 
                          onClick={() => { setEmail('user@user.com'); setPassword('user123'); }}
                          className='text-xs bg-white dark:bg-gray-800 px-2 py-1.5 rounded border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition text-left'
                        >
                          <span className='font-bold block'>Kullanıcı</span>
                          user@user.com
                        </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}