import api from './api';

export const warehouseService = {
  async getAll(params = {}) {
    const response = await api.get('/api/warehouses', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/api/warehouses/${id}`);
    return response.data;
  },

  async create(warehouseData) {
    const response = await api.post('/api/warehouses', warehouseData);
    return response.data;
  },

  async update(id, warehouseData) {
    const response = await api.put(`/api/warehouses/${id}`, warehouseData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/api/warehouses/${id}`);
    return response.data;
  },

  async getStock(id) {
    const response = await api.get(`/api/warehouses/${id}/stock`);
    return response.data;
  },

  async updateStock(id, productId, quantity) {
    const response = await api.post(`/api/warehouses/${id}/stock/update`, {
      product_id: productId,
      quantity
    });
    return response.data;
  },

  async setStock(id, productId, quantity) {
    const response = await api.post(`/api/warehouses/${id}/stock/set`, {
      product_id: productId,
      quantity
    });
    return response.data;
  }
};
