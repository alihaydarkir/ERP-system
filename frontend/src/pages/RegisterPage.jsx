import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    // Company fields
    companyAction: 'join_default', // 'create', 'join', 'join_default'
    companyName: '',
    companyCode: '',
    joinCompanyCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('🔍 Form change:', { name, value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validasyon
    if (!formData.username || !formData.email || !formData.password) {
      setError('Tüm alanları doldurunuz');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    // Company validations
    if (formData.companyAction === 'create') {
      if (!formData.companyName || !formData.companyCode) {
        setError('Şirket adı ve kodu giriniz');
        setLoading(false);
        return;
      }
    } else if (formData.companyAction === 'join') {
      if (!formData.joinCompanyCode) {
        setError('Katılmak istediğiniz şirket kodunu giriniz');
        setLoading(false);
        return;
      }
    }

    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        companyAction: formData.companyAction,
        companyName: formData.companyName,
        companyCode: formData.companyCode,
        joinCompanyCode: formData.joinCompanyCode
      };

      console.log('📤 Sending register data:', registerData);

      const response = await authService.register(registerData);

      if (response.success) {
        setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ERP Yönetim Sistemi</h1>
          <p className="text-gray-600">Yeni kullanıcı hesabı oluşturun</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="örneğin: ahmet123"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifreyi Onayla
            </label>
            <input
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Company Selection */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Şirket Seçimi
            </label>
            
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="companyAction"
                  value="join_default"
                  checked={formData.companyAction === 'join_default'}
                  onChange={handleChange}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">Varsayılan Şirkete Katıl</div>
                  <div className="text-xs text-gray-500">Demo şirket hesabıyla başla</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="companyAction"
                  value="create"
                  checked={formData.companyAction === 'create'}
                  onChange={handleChange}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">Yeni Şirket Oluştur</div>
                  <div className="text-xs text-gray-500">Kendi şirketini yönet (Admin olursun)</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="companyAction"
                  value="join"
                  checked={formData.companyAction === 'join'}
                  onChange={handleChange}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">Mevcut Şirkete Katıl</div>
                  <div className="text-xs text-gray-500">Şirket koduyla var olan bir şirkete katıl</div>
                </div>
              </label>
            </div>

            {/* Create Company Fields */}
            {formData.companyAction === 'create' && (
              <div className="mt-4 space-y-3 bg-blue-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şirket Adı
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="örn: ABC Teknoloji Ltd."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şirket Kodu (Benzersiz)
                  </label>
                  <input
                    type="text"
                    name="companyCode"
                    value={formData.companyCode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                    placeholder="örn: ABC_TECH"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Bu kod diğer kullanıcıların şirketinize katılması için kullanılacak</p>
                </div>
              </div>
            )}

            {/* Join Company Field */}
            {formData.companyAction === 'join' && (
              <div className="mt-4 bg-green-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şirket Kodu
                </label>
                <input
                  type="text"
                  name="joinCompanyCode"
                  value={formData.joinCompanyCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                  placeholder="Şirket kodunu girin"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Katılmak istediğiniz şirketin kodunu admin'den öğrenin</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}