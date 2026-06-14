import api from './api';

export const bankTransferService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/bank-transfers', { params });
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post('/api/bank-transfers', payload);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/bank-transfers/${id}`);
    return response.data;
  },
};

export default bankTransferService;
