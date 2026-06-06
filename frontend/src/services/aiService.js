import api from './api';

export const aiService = {
  /**
   * Agent AI ile sohbet — ERP verilerine erişebilir
   */
  agentChat: async (message, { signal } = {}) => {
    try {
      const response = await api.post('/api/ai/chat', { message }, {
        timeout: 180000,
        signal,
      });

      // Backend formatSuccess(...) -> { success, message, data }
      // Geriye her zaman normalize edilmiş data dön
      return response.data?.data ?? response.data;
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      const normalizedError = new Error(apiMessage || error.message || 'AI isteği başarısız');
      normalizedError.code = error?.code;
      normalizedError.status = error?.response?.status;
      normalizedError.responseData = error?.response?.data;
      throw normalizedError;
    }
  },

  approveAction: async (approvalId) => {
    const response = await api.post(`/api/ai/approvals/${approvalId}/approve`);
    return response.data;
  },

  rejectAction: async (approvalId) => {
    const response = await api.post(`/api/ai/approvals/${approvalId}/reject`);
    return response.data;
  },

  /**
   * Ollama sağlık durumunu kontrol et
   */
  getHealth: async () => {
    const response = await api.get('/api/ai/health');
    return response.data;
  },

  /**
   * Mevcut modelleri listele
   */
  getModels: async () => {
    const response = await api.get('/api/ai/models');
    return response.data;
  },
};
