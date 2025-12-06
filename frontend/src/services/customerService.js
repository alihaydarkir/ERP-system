import api from './api';

export const customerService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/customers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/customers/${id}`);
    return response.data;
  },

  create: async (customer) => {
    const response = await api.post('/api/customers', customer);
    return response.data;
  },

  update: async (id, customer) => {
    const response = await api.put(`/api/customers/${id}`, customer);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/customers/${id}`);
    return response.data;
  },

  search: async (searchTerm) => {
    const response = await api.get('/api/customers', {
      params: { search: searchTerm, limit: 100 }
    });
    return response.data;
  }
};

export default customerService;
