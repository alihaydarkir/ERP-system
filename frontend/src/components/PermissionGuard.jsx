import usePermissionStore from '../store/permissionStore';
import useAuthStore from '../store/authStore';

/**
 * Permission Guard Component
 * Hides children if user doesn't have required permission(s)
 */
const PermissionGuard = ({ 
  permission,      // Single permission (string)
  permissions,     // Multiple permissions (array)
  requireAll,      // If true, requires ALL permissions; if false, requires ANY (default: false)
  fallback = null, // Component to show when permission is denied
  children 
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissionStore();
  const { user } = useAuthStore();

  // Admin bypass - admins have all permissions
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  // Check single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return fallback;
    }
  }

  // Check multiple permissions
  if (permissions && Array.isArray(permissions)) {
    if (requireAll) {
      if (!hasAllPermissions(permissions)) {
        return fallback;
      }
    } else {
      if (!hasAnyPermission(permissions)) {
        return fallback;
      }
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
