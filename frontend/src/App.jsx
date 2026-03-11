import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import WarehousesPage from './pages/WarehousesPage';
import ChequesPage from './pages/ChequesPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import EmployeeApprovalsPage from './pages/EmployeeApprovalsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import InvoicesPage from './pages/InvoicesPage';
import CurrentAccountPage from './pages/CurrentAccountPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ToastContainer from './components/UI/Toast';
import ConfirmDialog from './components/UI/ConfirmDialog';
import useAuthStore from './store/authStore';
import useUIStore from './store/uiStore';
import usePermissionStore from './store/permissionStore';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { confirmDialog, hideConfirm } = useUIStore();
  const { fetchMyPermissions } = usePermissionStore();

  // Load permissions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPermissions();
    }
  }, [isAuthenticated]);

  // Load and apply theme on mount
  useEffect(() => {
    const applyTheme = (theme) => {
      if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
      } else if (theme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        document.body.setAttribute('data-theme', 'light');
      }
    };

    const loadTheme = () => {
      try {
        const savedPrefs = localStorage.getItem('userPreferences');
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          const theme = prefs.theme || 'light';
          applyTheme(theme);
        } else {
          document.body.setAttribute('data-theme', 'light');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        document.body.setAttribute('data-theme', 'light');
      }
    };

    loadTheme();

    // Listen for system theme changes when using auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      try {
        const savedPrefs = localStorage.getItem('userPreferences');
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.theme === 'auto') {
            applyTheme('auto');
          }
        }
      } catch (error) {
        console.error('Failed to handle theme change:', error);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
         <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Layout>
                <ProductsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Layout>
                <OrdersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <Layout>
                <SuppliersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouses"
          element={
            <ProtectedRoute>
              <Layout>
                <WarehousesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cheques"
          element={
            <ProtectedRoute>
              <Layout>
                <ChequesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-approvals"
          element={
            <ProtectedRoute>
              <Layout>
                <EmployeeApprovalsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <Layout>
                <ActivityLogsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoicesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/current-accounts"
          element={
            <ProtectedRoute>
              <Layout>
                <CurrentAccountPage />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* React Hot Toast */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;

