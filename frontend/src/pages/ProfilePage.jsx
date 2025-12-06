import React, { useEffect, useState } from 'react';
import useUserProfileStore from '../store/userProfileStore';
import ProfileHeader from '../components/Profile/ProfileHeader';
import PersonalInfoTab from '../components/Profile/PersonalInfoTab';
import ChangePasswordTab from '../components/Profile/ChangePasswordTab';
import PreferencesTab from '../components/Profile/PreferencesTab';
import ActivityHistory from '../components/Profile/ActivityHistory';
import LoginHistory from '../components/Profile/LoginHistory';
import useUIStore from '../store/uiStore';
import './ProfilePage.css';

const ProfilePage = () => {
  const { profile, fetchProfile, enable2FA, disable2FA, isLoading } = useUserProfileStore();
  const { showSuccess, showError, showConfirm } = useUIStore();
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const tabs = [
    { id: 'personal', label: '👤 Kişisel Bilgiler', icon: '👤' },
    { id: 'password', label: '🔑 Şifre Değiştir', icon: '🔑' },
    { id: 'preferences', label: '⚙️ Tercihler', icon: '⚙️' },
    { id: 'activity', label: '📝 Aktivite', icon: '📝' },
    { id: 'login', label: '🔐 Giriş Geçmişi', icon: '🔐' }
  ];

  const handle2FAToggle = async () => {
    if (!profile) return;

    const confirmMessage = profile.two_factor_enabled
      ? 'İki faktörlü kimlik doğrulamayı devre dışı bırakmak istediğinize emin misiniz?'
      : 'İki faktörlü kimlik doğrulamayı etkinleştirmek istediğinize emin misiniz?';

    showConfirm({
      title: '2FA Ayarı',
      message: confirmMessage,
      confirmText: 'Onayla',
      cancelText: 'İptal',
      type: 'warning',
      onConfirm: async () => {
        try {
          if (profile.two_factor_enabled) {
            await disable2FA();
            showSuccess('2FA başarıyla devre dışı bırakıldı');
          } else {
            await enable2FA();
            showSuccess('2FA başarıyla etkinleştirildi');
          }
          await fetchProfile();
        } catch (error) {
          showError(error.response?.data?.message || '2FA durumu değiştirilemedi');
        }
      }
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoTab profile={profile} />;
      case 'password':
        return <ChangePasswordTab />;
      case 'preferences':
        return <PreferencesTab profile={profile} />;
      case 'activity':
        return <ActivityHistory />;
      case 'login':
        return <LoginHistory />;
      default:
        return <PersonalInfoTab profile={profile} />;
    }
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <ProfileHeader profile={profile} />

        <div className="profile-2fa-section">
          <div className="2fa-info">
            <div className="2fa-icon">🔐</div>
            <div className="2fa-content">
              <h4>İki Faktörlü Kimlik Doğrulama (2FA)</h4>
              <p>
                {profile.two_factor_enabled
                  ? 'Hesabınız ek güvenlik katmanı ile korunuyor.'
                  : 'Hesabınızı ek güvenlik katmanı ile koruyun.'}
              </p>
            </div>
          </div>
          <button
            className={`btn-2fa ${profile.two_factor_enabled ? 'btn-2fa-enabled' : 'btn-2fa-disabled'}`}
            onClick={handle2FAToggle}
            disabled={isLoading}
          >
            {profile.two_factor_enabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
          </button>
        </div>

        <div className="profile-tabs-container">
          <div className="profile-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
