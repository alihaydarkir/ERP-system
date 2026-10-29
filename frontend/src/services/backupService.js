import api from './api';

// Şifreli yedek yönetimi (backend: routes/backups.js). Parola işlemlerinin hepsi 2FA kodu (totp) ister.
const backupService = {
  getStatus: async () => (await api.get('/api/backups')).data,

  setup: async ({ password, totp }) => (await api.post('/api/backups/setup', { password, totp })).data,

  changePassword: async ({ current_password, new_password, totp }) =>
    (await api.post('/api/backups/password', { current_password, new_password, totp })).data,

  recover: async ({ recovery_code, new_password, totp }) =>
    (await api.post('/api/backups/recover', { recovery_code, new_password, totp })).data,

  rotateRecoveryCode: async ({ password, totp }) =>
    (await api.post('/api/backups/recovery-code', { password, totp })).data,

  verifyLatest: async ({ password, totp }) => (await api.post('/api/backups/verify', { password, totp })).data,
};

export default backupService;
