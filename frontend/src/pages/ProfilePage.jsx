import React, { useEffect, useState } from 'react';
import useUserProfileStore from '../store/userProfileStore';
import ProfileHeader from '../components/Profile/ProfileHeader';
import PersonalInfoTab from '../components/Profile/PersonalInfoTab';
import ChangePasswordTab from '../components/Profile/ChangePasswordTab';
import PreferencesTab from '../components/Profile/PreferencesTab';
import ActivityHistory from '../components/Profile/ActivityHistory';
import LoginHistory from '../components/Profile/LoginHistory';
import TwoFactorSection from '../components/Profile/TwoFactorSection';
import './ProfilePage.css';

const ProfilePage = () => {
  const { profile, fetchProfile } = useUserProfileStore();
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

        <TwoFactorSection onChanged={fetchProfile} />

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
