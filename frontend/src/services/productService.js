import api from './api';

export const productService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  create: async (product) => {
    const response = await api.post('/api/products', product);
    return response.data;
  },

  update: async (id, product) => {
    const response = await api.put(`/api/products/${id}`, product);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },
};


