import { useState } from 'react';
import api from '../../services/api';
import useUIStore from '../../store/uiStore';

export default function UserFormModal({ user, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
    phone_number: user?.phone_number || '',
    department: user?.department || '',
    job_title: user?.job_title || ''
  });
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useUIStore();

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        await api.put(`/api/user-management/${user.id}`, formData);
        showSuccess('Kullanıcı başarıyla güncellendi');
      } else {
        if (!formData.password) {
          showError('Şifre zorunludur');
          setLoading(false);
          return;
        }
        await api.post('/api/user-management', formData);
        showSuccess('Kullanıcı başarıyla oluşturuldu');
      }

      onSuccess();
    } catch (error) {
      showError(error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            {user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kullanıcı Adı *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Şifre *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Rol *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Departman</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ünvan</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleFieldChange('job_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800/50"
                disabled={loading}
              >
                İptal
              </button>

              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Kaydediliyor...' : (user ? 'Güncelle' : 'Oluştur')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
