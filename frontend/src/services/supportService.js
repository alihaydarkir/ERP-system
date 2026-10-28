import api from './api';
import { triggerDownload } from './exportService';

// Süreli destek erişimi (backend: routes/support.js)
const supportService = {
  listGrants: async () => {
    const response = await api.get('/api/support/grants');
    return response.data;
  },

  createGrant: async ({ duration_hours, reason, access_level }) => {
    const response = await api.post('/api/support/grants', { duration_hours, reason, access_level });
    return response.data;
  },

  revokeGrant: async (grantId) => {
    const response = await api.post(`/api/support/grants/${grantId}/revoke`);
    return response.data;
  },

  getActivity: async (grantId) => {
    const response = await api.get(`/api/support/grants/${grantId}/activity`);
    return response.data;
  },

  // Tanı paketi: müşteri kaydı içermeyen, maskelenmiş sistem özeti (JSON dosyası)
  downloadDiagnostics: async () => {
    const response = await api.get('/api/support/diagnostics', { responseType: 'blob' });
    // Not: köşeli parantez içinde iki nokta içeren regex/metin Tailwind'in sınıf taramasına
    // takılıp (arbitrary property sanılıyor) bozuk CSS üretir; bu yüzden \D kullanıldı.
    const stamp = new Date().toISOString().slice(0, 16).replace(/\D/g, '');
    triggerDownload(response.data, `helix-tani-${stamp}.json`);
  },

  login: async (code) => {
    const response = await api.post('/api/support/login', { code });
    return response.data;
  },
};

export default supportService;
