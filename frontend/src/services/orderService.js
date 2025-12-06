import api from './api';

export const orderService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/orders', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },

  create: async (order) => {
    const response = await api.post('/api/orders', order);
    return response.data;
  },

  update: async (id, order) => {
    const response = await api.put(`/api/orders/${id}`, order);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/orders/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/api/orders/${id}/status`, { status });
    return response.data;
  },

  cancel: async (id, reason = '') => {
    const response = await api.post(`/api/orders/${id}/cancel`, { reason });
    return response.data;
  },
};


