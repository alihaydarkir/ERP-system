import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export const useAuth = () => {
  const {
    user,
    company,
    isAuthenticated,
    isAuthLoading,
    isAuthInitialized,
    setUser,
    setAuthLoading,
    setAuthInitialized,
    logout,
    login,
  } = useAuthStore();

  useEffect(() => {
    if (isAuthInitialized) {
      return;
    }

    let mounted = true;

    setAuthLoading(true);

    api.get('/api/auth/profile')
      .then((res) => {
        if (!mounted) return;
        const profile = res.data?.data || null;
        if (profile) {
          setUser(profile);
        } else {
          logout();
        }
      })
      .catch(() => {
        if (!mounted) return;
        logout();
      })
      .finally(() => {
        if (!mounted) return;
        setAuthInitialized(true);
        setAuthLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthInitialized, setAuthLoading, setAuthInitialized, setUser, logout]);

  return {
    user,
    company,
    isAuthenticated,
    isAuthLoading,
    isAuthInitialized,
    login,
    logout,
  };
};

export default useAuth;

