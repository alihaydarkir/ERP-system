import api from './api';

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

  login: async (code) => {
    const response = await api.post('/api/support/login', { code });
    return response.data;
  },
};

export default supportService;
