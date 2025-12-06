import api from './api';

export const chatService = {
  sendMessage: async (message) => {
    const response = await api.post('/api/chat/message', { message });
    return response.data;
  },

  getHistory: async (params = {}) => {
    const response = await api.get('/api/chat/history', { params });
    return response.data;
  },
};


