import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { Mail, Lock, User, ArrowRight, LayoutDashboard } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.register(formData.username, formData.email, formData.password);
      
      if (response.success) {
        toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kayıt başarısız!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex w-full bg-white dark:bg-gray-900 transition-colors duration-300'>
      {/* Sol Taraf - Görsel Alan (Sadece Desktop) */}
      <div className='hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-purple-800 relative overflow-hidden items-center justify-center'>
        <div className='absolute inset-0 bg-black/10 backdrop-blur-[1px]'></div>
        <div className='absolute top-1/4 left-1/4 w-72 h-72 bg-white dark:bg-gray-800 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20'></div>
        
        <div className='relative z-10 text-center px-12'>
           <div className='mb-8 flex justify-center'>
             <div className='w-24 h-24 bg-white dark:bg-gray-800/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20'>
                <LayoutDashboard size={48} className='text-white' />
             </div>
          </div>
          <h2 className='text-4xl font-bold text-white mb-6'>Aramıza Katılın</h2>
          <p className='text-primary-100 text-lg leading-relaxed max-w-md mx-auto'>
            Binlerce işletme gibi siz de süreçlerinizi dijitalleştirin. Hızlı, güvenli ve kolay yönetim.
          </p>
        </div>
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
              Hesap Oluştur
            </h2>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              Zaten hesabınız var mı?{' '}
              <Link to='/login' className='font-medium text-primary-600 hover:text-primary-500 transition-colors'>
                Giriş yapın
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <Input
              label='Ad Soyad'
              type='text'
              icon={User}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder='Adınız Soyadınız'
              required
              className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            />

            <Input
              label='E-posta Adresi'
              type='email'
              icon={Mail}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder='isim@sirket.com'
              required
              className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            />

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Şifre
              </label>
              <Input
                type='password'
                icon={Lock}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder='••••••••'
                required
                className='bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              />
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>En az 6 karakter olmalıdır.</p>
            </div>

            <Button
              type='submit'
              loading={loading}
              className='w-full py-3 shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40 text-lg'
              icon={ArrowRight}
            >
              Kayıt Ol
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}