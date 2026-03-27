import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function UserPermissions({ userId, role = 'user' }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const endpoint = userId ? `/api/permissions/user/${userId}` : `/api/permissions/role/${role}`;
        const response = await api.get(endpoint);

        if (!mounted) return;
        setPermissions(response?.data?.data || []);
      } catch (_) {
        if (!mounted) return;
        setPermissions([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchPermissions();

    return () => {
      mounted = false;
    };
  }, [userId, role]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/60">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">İzin Yönetimi</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">Toplam: {permissions.length}</span>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">İzinler yükleniyor...</div>
      ) : permissions.length === 0 ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Bu kullanıcı/rol için izin listesi görüntülenemedi.
        </div>
      ) : (
        <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5">
          {permissions.map((permission) => {
            const key = typeof permission === 'string' ? permission : permission.permission_name;
            const label = typeof permission === 'string' ? permission : permission.description || permission.permission_name;

            return (
              <span
                key={key}
                className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                title={key}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
