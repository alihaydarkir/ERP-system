import { useState, useEffect } from 'react';
import { Activity, Filter, ChevronDown, Calendar, User, Package, FileText } from 'lucide-react';
import api from '../services/api';
import useUIStore from '../store/uiStore';

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    module: 'all',
    action: '',
    startDate: '',
    endDate: '',
    limit: 100
  });
  const { showError } = useUIStore();

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.module !== 'all') params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', filters.limit);

      const response = await api.get(`/api/activity-logs?${params}`);
      if (response?.data?.data) {
        setLogs(response.data.data);
      }
    } catch (error) {
      showError('Aktivite logları yüklenemedi');
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/api/activity-logs/statistics?${params}`);
      if (response?.data?.data) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const getModuleIcon = (module) => {
    const icons = {
      users: <User className="w-4 h-4" />,
      products: <Package className="w-4 h-4" />,
      orders: <FileText className="w-4 h-4" />,
      customers: <User className="w-4 h-4" />,
      cheques: <FileText className="w-4 h-4" />,
      settings: <Activity className="w-4 h-4" />,
      default: <Activity className="w-4 h-4" />
    };
    return icons[module] || icons.default;
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('view') || action.includes('login')) return 'bg-gray-100 text-gray-800';
    return 'bg-purple-100 text-purple-800';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Aktivite Logları</h1>
        <p className="text-gray-600">Sistem aktivitelerini görüntüleyin ve takip edin</p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Aktivite</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.total_actions || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Benzersiz Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.unique_users || 0}</p>
              </div>
              <User className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif Modül</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.unique_modules || 0}</p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Farklı İşlem</p>
                <p className="text-2xl font-bold text-gray-800">{statistics.unique_actions || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg w-full appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Modüller</option>
              <option value="users">Kullanıcılar</option>
              <option value="products">Ürünler</option>
              <option value="orders">Siparişler</option>
              <option value="customers">Müşteriler</option>
              <option value="cheques">Çekler</option>
              <option value="settings">Ayarlar</option>
              <option value="logs">Loglar</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="50">Son 50</option>
              <option value="100">Son 100</option>
              <option value="500">Son 500</option>
              <option value="1000">Son 1000</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <button
            onClick={() => setFilters({ module: 'all', action: '', startDate: '', endDate: '', limit: 100 })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tarih & Saat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Modül
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  İşlem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Detaylar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP Adresi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aktivite kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {log.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {log.username || `ID: ${log.user_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getModuleIcon(log.module)}
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogsPage;
