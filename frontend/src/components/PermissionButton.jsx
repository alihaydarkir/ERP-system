import usePermissionStore from '../store/permissionStore';
import useAuthStore from '../store/authStore';

export default function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  deniedText = 'Bu işlem için yetkiniz yok.',
  className = '',
  children,
  ...buttonProps
}) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissionStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  let allowed = true;
  if (!isAdmin) {
    if (permission) {
      allowed = hasPermission(permission);
    } else if (permissions && Array.isArray(permissions)) {
      allowed = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }
  }

  if (!allowed) {
    return (
      <button
        type="button"
        disabled
        title={deniedText}
        aria-disabled="true"
        className={`${className} opacity-55 cursor-not-allowed`}
      >
        {children}
      </button>
    );
  }

  return (
    <button type="button" {...buttonProps} className={className}>
      {children}
    </button>
  );
}
