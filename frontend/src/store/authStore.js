import { create } from 'zustand';
import usePermissionStore from './permissionStore';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, user, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ token, refreshToken, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Clear permissions on logout
    usePermissionStore.getState().clearPermissions();
    
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user });
  },

  updateToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
}));

export default useAuthStore;

