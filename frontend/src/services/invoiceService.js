import api from './api';

export const invoiceService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/invoices', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/invoices/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/invoices/stats');
    return response.data;
  },

  create: async (invoice) => {
    const response = await api.post('/api/invoices', invoice);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/invoices/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/api/invoices/${id}`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/invoices/${id}`);
    return response.data;
  }
};

export default invoiceService;
