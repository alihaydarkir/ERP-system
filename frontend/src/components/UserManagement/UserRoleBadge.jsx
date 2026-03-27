import { Users, Shield, UserCheck } from 'lucide-react';

const ROLE_STYLES = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-100',
};

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
};

const getRoleIcon = (role) => {
  if (role === 'admin') return <Shield className="w-4 h-4" />;
  if (role === 'manager') return <UserCheck className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
};

export default function UserRoleBadge({ role = 'user' }) {
  const normalizedRole = String(role || 'user').toLowerCase();
  const style = ROLE_STYLES[normalizedRole] || ROLE_STYLES.user;
  const label = ROLE_LABELS[normalizedRole] || normalizedRole;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {getRoleIcon(normalizedRole)}
      {label}
    </span>
  );
}
