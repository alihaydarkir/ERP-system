import api from './api';

/**
 * 2FA (TOTP) uçları. Giriş sırasındaki ikinci adım (tempToken + kod) authService.verifyTwoFa'dadır.
 * Yedek kodlar yalnızca kurulum/yenileme yanıtında bir kez döner; sonradan okunamaz.
 */
export const twoFactorService = {
  getStatus: async () => {
    const response = await api.get('/api/2fa/status');
    return response.data;
  },

  // Sır + QR (data URL) üretir; 2FA zaten etkinse 409 döner
  startSetup: async () => {
    const response = await api.post('/api/2fa/setup');
    return response.data;
  },

  // İlk 6 haneli kodla kurulumu tamamlar; { backupCodes } döner
  completeSetup: async (token) => {
    const response = await api.post('/api/2fa/setup/verify', { token });
    return response.data;
  },

  regenerateBackupCodes: async (token) => {
    const response = await api.post('/api/2fa/backup-codes/regenerate', { token });
    return response.data;
  },

  // Parola + güncel kod (TOTP ya da yedek kod)
  disable: async (password, code) => {
    const response = await api.post('/api/2fa/disable', { password, code });
    return response.data;
  },
};

export default twoFactorService;
