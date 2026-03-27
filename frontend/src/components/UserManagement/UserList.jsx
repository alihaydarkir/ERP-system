import { Edit, Trash2 } from 'lucide-react';
import UserRoleBadge from './UserRoleBadge';

export default function UserList({
  users,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kullanıcı</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Departman</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Son Giriş</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                      {user.job_title && <div className="text-sm text-gray-500 dark:text-gray-400">{user.job_title}</div>}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>

                <td className="px-6 py-4">
                  <UserRoleBadge role={user.role} />
                </td>

                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{user.department || '-'}</td>

                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR') : 'Hiç giriş yapmadı'}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => onDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
