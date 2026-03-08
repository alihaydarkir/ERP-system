import { create } from 'zustand';
import usePermissionStore from './permissionStore';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  company: JSON.parse(localStorage.getItem('company')) || null,
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, user, refreshToken, company = null) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    if (company) {
      localStorage.setItem('company', JSON.stringify(company));
    }
    set({ token, refreshToken, user, company, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    
    // Clear permissions on logout
    usePermissionStore.getState().clearPermissions();
    
    set({ token: null, refreshToken: null, user: null, company: null, isAuthenticated: false });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user });
  },

  setCompany: (company) => {
    if (company) {
      localStorage.setItem('company', JSON.stringify(company));
    }
    set({ company });
  },

  updateToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
}));

export default useAuthStore;

