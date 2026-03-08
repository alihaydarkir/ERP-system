import api from './api';

/**
 * Supplier Service
 * Tedarikçi yönetimi için API servisi
 */

export const supplierService = {
  /**
   * Get all suppliers with pagination and filters
   */
  async getAll(params = {}) {
    const response = await api.get('/api/suppliers', { params });
    return response.data;
  },

  /**
   * Get single supplier by ID
   */
  async getById(id) {
    const response = await api.get(`/api/suppliers/${id}`);
    return response.data;
  },

  /**
   * Create new supplier
   */
  async create(supplierData) {
    const response = await api.post('/api/suppliers', supplierData);
    return response.data;
  },

  /**
   * Update existing supplier
   */
  async update(id, supplierData) {
    const response = await api.put(`/api/suppliers/${id}`, supplierData);
    return response.data;
  },

  /**
   * Delete supplier
   */
  async delete(id) {
    const response = await api.delete(`/api/suppliers/${id}`);
    return response.data;
  },

  /**
   * Search suppliers
   */
  async search(query) {
    const response = await api.get('/api/suppliers/search', { params: { q: query } });
    return response.data;
  },

  /**
   * Get supplier statistics
   */
  async getStats() {
    const response = await api.get('/api/suppliers/stats');
    return response.data;
  }
};
