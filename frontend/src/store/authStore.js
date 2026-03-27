import { create } from 'zustand';
import usePermissionStore from './permissionStore';

const useAuthStore = create((set) => ({
  user: null,
  company: null,
  isAuthenticated: false,
  isAuthLoading: true,
  isAuthInitialized: false,

  login: (user, company = null) => {
    set({
      user,
      company,
      isAuthenticated: true,
      isAuthLoading: false,
      isAuthInitialized: true,
    });
  },

  logout: () => {
    // Clear permissions on logout
    usePermissionStore.getState().clearPermissions();

    set({
      user: null,
      company: null,
      isAuthenticated: false,
      isAuthLoading: false,
      isAuthInitialized: true,
    });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setCompany: (company) => {
    set({ company });
  },

  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  setAuthInitialized: (isAuthInitialized) => set({ isAuthInitialized }),
}));

export default useAuthStore;

