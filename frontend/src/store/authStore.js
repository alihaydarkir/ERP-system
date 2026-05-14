import { create } from 'zustand';
import usePermissionStore from './permissionStore';
import { authService } from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  company: null,
  isAuthenticated: false,
  isAuthLoading: true,
  isAuthInitialized: false,
  onboarding_completed: false,

  login: (user, company = null) => {
    set({
      user,
      company,
      isAuthenticated: true,
      isAuthLoading: false,
      isAuthInitialized: true,
      onboarding_completed: Boolean(user?.onboarding_completed),
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
      onboarding_completed: false,
    });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      onboarding_completed: Boolean(user?.onboarding_completed)
    });
  },

  setCompany: (company) => {
    set({ company });
  },

  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  setAuthInitialized: (isAuthInitialized) => set({ isAuthInitialized }),

  completeOnboarding: async () => {
    await authService.completeOnboarding();
    set((state) => ({
      onboarding_completed: true,
      user: state.user ? { ...state.user, onboarding_completed: true } : state.user
    }));
  },
}));

export default useAuthStore;

