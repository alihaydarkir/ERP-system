import React, { useEffect } from 'react';
import useUserProfileStore from '../../store/userProfileStore';
import './LoginHistory.css';

const LoginHistory = () => {
  const { loginHistory, fetchLoginHistory, isLoading } = useUserProfileStore();

  useEffect(() => {
    fetchLoginHistory(50);
  }, [fetchLoginHistory]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDeviceIcon = (device) => {
    if (!device) return '💻';
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('mobile') || deviceLower.includes('android') || deviceLower.includes('ios')) {
      return '📱';
    }
    if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
      return '📱';
    }
    return '💻';
  };

  const getBrowserIcon = (browser) => {
    if (!browser) return '🌐';
    const browserLower = browser.toLowerCase();
    if (browserLower.includes('chrome')) return '🔵';
    if (browserLower.includes('firefox')) return '🦊';
    if (browserLower.includes('safari')) return '🧭';
    if (browserLower.includes('edge')) return '🌊';
    if (browserLower.includes('opera')) return '🎭';
    return '🌐';
  };

  return (
    <div className="login-history">
      <div className="tab-header">
        <h3>Giriş Geçmişi</h3>
        <button
          className="btn-refresh"
          onClick={() => fetchLoginHistory(50)}
          disabled={isLoading}
        >
          🔄 Yenile
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Giriş geçmişi yükleniyor...</p>
        </div>
      ) : loginHistory.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔐</span>
          <p>Henüz giriş kaydı bulunmuyor</p>
        </div>
      ) : (
        <div className="login-table-wrapper">
          <table className="login-table">
            <thead>
              <tr>
                <th>Durum</th>
                <th>Tarih & Saat</th>
                <th>Cihaz</th>
                <th>Tarayıcı</th>
                <th>IP Adresi</th>
                <th>Konum</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((login) => (
                <tr key={login.id} className={login.success ? '' : 'failed-login'}>
                  <td>
                    <span className={`status-badge ${login.success ? 'status-success' : 'status-failed'}`}>
                      {login.success ? '✓ Başarılı' : '✗ Başarısız'}
                    </span>
                  </td>
                  <td className="date-cell">
                    {formatDate(login.login_at)}
                  </td>
                  <td>
                    <div className="device-info">
                      <span className="device-icon">
                        {getDeviceIcon(login.device)}
                      </span>
                      <span>{login.device || 'Bilinmiyor'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="browser-info">
                      <span className="browser-icon">
                        {getBrowserIcon(login.browser)}
                      </span>
                      <span>{login.browser || 'Bilinmiyor'}</span>
                    </div>
                  </td>
                  <td className="ip-cell">
                    <code>{login.ip_address || 'N/A'}</code>
                  </td>
                  <td className="location-cell">
                    {login.location || 'Bilinmiyor'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loginHistory.length > 0 && (
        <div className="login-stats">
          <div className="stat-card">
            <span className="stat-label">Toplam Giriş</span>
            <span className="stat-value">{loginHistory.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Başarılı</span>
            <span className="stat-value success">
              {loginHistory.filter((l) => l.success).length}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Başarısız</span>
            <span className="stat-value failed">
              {loginHistory.filter((l) => !l.success).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginHistory;
