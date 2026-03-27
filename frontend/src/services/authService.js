import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (data, emailArg, passwordArg, roleArg) => {
    // Support both old and new formats
    if (typeof data === 'string') {
      // Old format: register(username, email, password, role)
      const username = data;
      data = { username, email: emailArg, password: passwordArg, role: roleArg };
    }
    
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

  forgotPassword: async (email) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword });
    return response.data;
  },

  sendVerification: async () => {
    const response = await api.post('/api/auth/send-verification');
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.get('/api/auth/verify-email', { params: { token } });
    return response.data;
  },
};


