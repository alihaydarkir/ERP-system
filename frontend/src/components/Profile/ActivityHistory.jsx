import React, { useEffect, useState } from 'react';
import useUserProfileStore from '../../store/userProfileStore';
import './ActivityHistory.css';

const ActivityHistory = () => {
  const { activityHistory, fetchActivityHistory, isLoading } = useUserProfileStore();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchActivityHistory({ limit: 50 });
  }, [fetchActivityHistory]);

  const getActionLabel = (action) => {
    const actionLabels = {
      'CREATE_PRODUCT': 'Ürün Oluşturuldu',
      'UPDATE_PRODUCT': 'Ürün Güncellendi',
      'DELETE_PRODUCT': 'Ürün Silindi',
      'CREATE_ORDER': 'Sipariş Oluşturuldu',
      'UPDATE_ORDER': 'Sipariş Güncellendi',
      'DELETE_ORDER': 'Sipariş Silindi',
      'CREATE_CUSTOMER': 'Müşteri Oluşturuldu',
      'UPDATE_CUSTOMER': 'Müşteri Güncellendi',
      'DELETE_CUSTOMER': 'Müşteri Silindi',
      'UPDATE_PROFILE': 'Profil Güncellendi',
      'CHANGE_PASSWORD': 'Şifre Değiştirildi',
      'UPDATE_PREFERENCES': 'Tercihler Güncellendi',
      'ENABLE_2FA': '2FA Etkinleştirildi',
      'DISABLE_2FA': '2FA Devre Dışı Bırakıldı',
      'UPDATE_AVATAR': 'Profil Resmi Güncellendi',
      'UPDATE_SETTING': 'Ayar Güncellendi',
      'BULK_UPDATE_SETTINGS': 'Toplu Ayar Güncellendi',
      'CREATE_SETTING': 'Ayar Oluşturuldu',
      'DELETE_SETTING': 'Ayar Silindi',
      'TEST_EMAIL': 'Test Email Gönderildi',
      'LOGIN': 'Giriş Yapıldı',
      'LOGOUT': 'Çıkış Yapıldı'
    };
    return actionLabels[action] || action;
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('LOGIN')) return '🔓';
    if (action.includes('LOGOUT')) return '🔒';
    if (action.includes('PASSWORD')) return '🔑';
    if (action.includes('2FA')) return '🔐';
    return '📝';
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'action-create';
    if (action.includes('UPDATE')) return 'action-update';
    if (action.includes('DELETE')) return 'action-delete';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'action-auth';
    return 'action-other';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredHistory = filter
    ? activityHistory.filter((item) =>
        item.action.toLowerCase().includes(filter.toLowerCase()) ||
        getActionLabel(item.action).toLowerCase().includes(filter.toLowerCase())
      )
    : activityHistory;

  return (
    <div className="activity-history">
      <div className="tab-header">
        <h3>Aktivite Geçmişi</h3>
      </div>

      <div className="activity-controls">
        <input
          type="text"
          className="filter-input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Aktivite ara..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          className="btn-refresh"
          onClick={() => fetchActivityHistory({ limit: 50 })}
          disabled={isLoading}
        >
          🔄 Yenile
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Aktiviteler yükleniyor...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>Henüz aktivite bulunmuyor</p>
        </div>
      ) : (
        <div className="activity-list">
          {filteredHistory.map((item) => (
            <div key={item.id} className="activity-item">
              <div className={`activity-icon ${getActionColor(item.action)}`}>
                {getActionIcon(item.action)}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-action">
                    {getActionLabel(item.action)}
                  </span>
                  <span className="activity-time">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                {item.entity_type && (
                  <div className="activity-details">
                    <span className="entity-type">{item.entity_type}</span>
                    {item.entity_id && (
                      <span className="entity-id">ID: {item.entity_id}</span>
                    )}
                  </div>
                )}
                {item.ip_address && (
                  <div className="activity-meta">
                    <span className="ip-address">IP: {item.ip_address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
