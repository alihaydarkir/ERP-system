import api from './api';

export const chequeService = {
  // Get all cheques with filters and pagination
  getAll: async (params = {}) => {
    const response = await api.get('/api/cheques', { params });
    return response.data;
  },

  // Get cheque by ID
  getById: async (id) => {
    const response = await api.get(`/api/cheques/${id}`);
    return response.data;
  },

  // Create new cheque
  create: async (cheque) => {
    const response = await api.post('/api/cheques', cheque);
    return response.data;
  },

  // Update cheque
  update: async (id, cheque) => {
    const response = await api.put(`/api/cheques/${id}`, cheque);
    return response.data;
  },

  // Change cheque status
  changeStatus: async (id, status, notes = '') => {
    const response = await api.put(`/api/cheques/${id}/status`, { status, notes });
    return response.data;
  },

  // Delete cheque
  delete: async (id) => {
    const response = await api.delete(`/api/cheques/${id}`);
    return response.data;
  },

  // Get cheques due soon
  getDueSoon: async (days = 7) => {
    const response = await api.get('/api/cheques/due-soon', { params: { days } });
    return response.data;
  },

  // Get cheque statistics
  getStatistics: async () => {
    const response = await api.get('/api/cheques/statistics');
    return response.data;
  },

  // Validate Excel import (preview)
  validateImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/cheques/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Import cheques from Excel
  import: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/cheques/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Export cheques to Excel
  exportToExcel: async (params = {}) => {
    const response = await api.get('/api/cheques/export/excel', {
      params,
      responseType: 'blob', // Important for file download
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cekler_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  },

  // Download Excel template
  downloadTemplate: async () => {
    const response = await api.get('/api/cheques/import/template', {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cek_sablonu.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  },
};

export default chequeService;
