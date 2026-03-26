import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function EmployeeApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all'
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get('/api/employee-approval/pending'),
        api.get('/api/employee-approval/all')
      ]);

      if (pendingRes.data.success) {
        setPendingUsers(pendingRes.data.data.requests);
      }

      if (allRes.data.success) {
        setAllEmployees(allRes.data.data.employees);
        setStats({
          pending: allRes.data.data.pending,
          approved: allRes.data.data.approved,
          rejected: allRes.data.data.rejected,
          total: allRes.data.data.total
        });
      }
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, username) => {
    if (!confirm(`${username} kullanıcısını onaylamak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await api.post(`/api/employee-approval/${userId}/approve`);
      if (response.data.success) {
        toast.success(`${username} onaylandı!`);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Onaylama başarısız');
    }
  };

  const handleReject = async (userId, username) => {
    const reason = prompt(`${username} kullanıcısını reddetme sebebi:`);
    if (!reason) return;

    try {
      const response = await api.post(`/api/employee-approval/${userId}/reject`, { reason });
      if (response.data.success) {
        toast.success(`${username} reddedildi`);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reddetme başarısız');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bekliyor' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Onaylandı' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Reddedildi' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Çalışan Onayları</h1>
        <p className="text-gray-600 dark:text-gray-300">Şirketinize katılmak isteyen kullanıcıları yönetin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Toplam</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Onaylı</p>
              <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Reddedilen</p>
              <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
            </div>
            <div className="text-3xl">❌</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              Bekleyen İstekler ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              Tüm Çalışanlar ({allEmployees.length})
            </button>
          </div>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="p-6">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-gray-600 dark:text-gray-300 text-lg">Bekleyen istek yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-800/50 transition"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/200 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{user.username}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Başvuru: {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleApprove(user.id, user.username)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
                      >
                        <span>✓</span>
                        <span>Onayla</span>
                      </button>
                      <button
                        onClick={() => handleReject(user.id, user.username)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
                      >
                        <span>✗</span>
                        <span>Reddet</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Employees Tab */}
        {activeTab === 'all' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Onaylayan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {allEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 dark:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/200 rounded-full flex items-center justify-center text-white font-semibold">
                          {employee.username[0].toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{employee.username}</div>
                          {employee.full_name && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{employee.full_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 capitalize">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(employee.approval_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(employee.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {employee.approved_by_username || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
