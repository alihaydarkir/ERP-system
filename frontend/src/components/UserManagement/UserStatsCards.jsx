import { Users, Shield, UserCheck, Activity } from 'lucide-react';

export default function UserStatsCards({ statistics }) {
  if (!statistics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Toplam Kullanıcı</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{statistics.total_users}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Admin</p>
            <p className="text-2xl font-bold text-red-800">{statistics.admin_count}</p>
          </div>
          <Shield className="w-8 h-8 text-red-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Manager</p>
            <p className="text-2xl font-bold text-blue-800">{statistics.manager_count}</p>
          </div>
          <UserCheck className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Aktif (7 Gün)</p>
            <p className="text-2xl font-bold text-green-800">{statistics.active_week}</p>
          </div>
          <Activity className="w-8 h-8 text-green-500" />
        </div>
      </div>
    </div>
  );
}
