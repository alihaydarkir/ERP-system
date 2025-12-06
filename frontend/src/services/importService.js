import api from './api';

/**
 * Import Service - Handle Excel file import API calls
 */
export const importService = {
  /**
   * Validate Excel file
   * @param {File} file - Excel file to validate
   * @returns {Promise} - Validation response
   */
  validateFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Process validated import data
   * @param {Array} validData - Array of valid rows to import
   * @returns {Promise} - Process response
   */
  processImport: async (validData) => {
    const response = await api.post('/api/import/process', {
      validData,
    });

    return response.data;
  },
};
