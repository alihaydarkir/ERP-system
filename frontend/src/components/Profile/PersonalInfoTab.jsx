import React, { useState, useEffect } from 'react';
import useUserProfileStore from '../../store/userProfileStore';
import useUIStore from '../../store/uiStore';
import './PersonalInfoTab.css';

const PersonalInfoTab = ({ profile }) => {
  const { updateProfile, isLoading } = useUserProfileStore();
  const { showSuccess, showError } = useUIStore();

  const [formData, setFormData] = useState({
    username: '',
    phone_number: '',
    department: '',
    job_title: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        phone_number: profile.phone_number || '',
        department: profile.department || '',
        job_title: profile.job_title || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateProfile(formData);
      showSuccess('Profil başarıyla güncellendi');
      setIsEditing(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Profil güncellenemedi');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (profile) {
      setFormData({
        username: profile.username || '',
        phone_number: profile.phone_number || '',
        department: profile.department || '',
        job_title: profile.job_title || ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="personal-info-tab">
      <div className="tab-header">
        <h3>Kişisel Bilgiler</h3>
        {!isEditing && (
          <button
            className="btn-edit"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            ✏️ Düzenle
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={!isEditing || isLoading}
              required
             className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="input-disabled dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <small>E-posta değiştirilemez</small>
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Telefon</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              disabled={!isEditing || isLoading}
              placeholder="+90 555 123 4567"
             className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div className="form-group">
            <label htmlFor="department">Departman</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={!isEditing || isLoading}
              placeholder="Örn: IT, Muhasebe, Satış"
             className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div className="form-group full-width">
            <label htmlFor="job_title">Ünvan</label>
            <input
              type="text"
              id="job_title"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              disabled={!isEditing || isLoading}
              placeholder="Örn: Yazılım Geliştirici, Muhasebe Müdürü"
             className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div className="form-group">
            <label>Rol</label>
            <input
              type="text"
              value={
                profile?.role === 'admin' ? 'Yönetici' :
                profile?.role === 'manager' ? 'Müdür' : 'Kullanıcı'
              }
              disabled
              className="input-disabled dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <small>Rol değiştirilemez</small>
          </div>

          <div className="form-group">
            <label>Kayıt Tarihi</label>
            <input
              type="text"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : ''}
              disabled
              className="input-disabled dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {isEditing && (
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={isLoading}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PersonalInfoTab;
