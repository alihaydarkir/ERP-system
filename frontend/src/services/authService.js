import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (data) => {
    // Support both old and new formats
    if (typeof data === 'string') {
      // Old format: register(username, email, password, role)
      const [username, email, password, role] = arguments;
      data = { username, email, password, role };
    }
    
    console.log('🚀 authService.register - About to send:', data);
    
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};


