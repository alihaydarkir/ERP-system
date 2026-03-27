import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import PageLoader from './UI/PageLoader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthLoading, isAuthInitialized } = useAuthStore();

  if (isAuthLoading || !isAuthInitialized) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


