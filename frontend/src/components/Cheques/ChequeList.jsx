import React, { useState, useEffect } from 'react';
import useChequeStore from '../../store/chequeStore';
import customerService from '../../services/customerService';

const ChequeList = ({ onChequeClick, onEditCheque, onDeleteCheque, onChangeStatus }) => {
  const {
    cheques,
    filters,
    pagination,
    sorting,
    setFilters,
    setPagination,
    setSorting,
    setPage
  } = useChequeStore();

  const [customers, setCustomers] = useState([]);
  const [localFilters, setLocalFilters] = useState(filters);

  // Load customers for filter dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customerService.getAll({ limit: 1000 });
        setCustomers(response.data || []);
      } catch (error) {
        console.error('Failed to load customers:', error);
      }
    };
    loadCustomers();
  }, []);

  const handleFilterChange = (key, value) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  const applyFilters = () => {
    setFilters(localFilters);
  };

  const resetFilters = () => {
    const emptyFilters = {
      status: '',
      customer_id: '',
      bank_name: '',
      start_date: '',
      end_date: ''
    };
    setLocalFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  const handleSort = (field) => {
    const newOrder = sorting.sort_by === field && sorting.sort_order === 'ASC' ? 'DESC' : 'ASC';
    setSorting({ sort_by: field, sort_order: newOrder });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      cleared: 'bg-green-100 text-green-800 border-green-300',
      bounced: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const labels = {
      pending: 'Beklemede',
      cleared: 'Ödendi',
      bounced: 'Bozuldu',
      cancelled: 'İptal'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getRowColor = (cheque) => {
    if (cheque.status !== 'pending') return '';

    const daysUntilDue = cheque.days_until_due;
    if (daysUntilDue < 0) return 'bg-red-50 border-l-4 border-red-500'; // Overdue
    if (daysUntilDue <= 3) return 'bg-orange-50 border-l-4 border-orange-500'; // 3 days or less
    if (daysUntilDue <= 7) return 'bg-yellow-50 border-l-4 border-yellow-500'; // 7 days or less

    return '';
  };

  const getDaysText = (daysUntilDue) => {
    if (daysUntilDue < 0) {
      return (
        <span className="text-red-600 font-semibold">
          {Math.abs(daysUntilDue)} gün gecikmiş
        </span>
      );
    }
    if (daysUntilDue === 0) return <span className="text-orange-600 font-semibold">Bugün</span>;
    if (daysUntilDue === 1) return <span className="text-orange-600 font-semibold">Yarın</span>;
    if (daysUntilDue <= 7) return <span className="text-yellow-600 font-semibold">{daysUntilDue} gün</span>;
    return <span className="text-gray-600">{daysUntilDue} gün</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={localFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="cleared">Ödendi</option>
              <option value="bounced">Bozuldu</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
            <select
              value={localFilters.customer_id}
              onChange={(e) => handleFilterChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tümü</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name || customer.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banka</label>
            <input
              type="text"
              value={localFilters.bank_name}
              onChange={(e) => handleFilterChange('bank_name', e.target.value)}
              placeholder="Banka adı"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
            <input
              type="date"
              value={localFilters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
            <input
              type="date"
              value={localFilters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Filtrele
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('check_serial_no')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Seri No {sorting.sort_by === 'check_serial_no' && (sorting.sort_order === 'ASC' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keşideci
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Müşteri
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Banka
              </th>
              <th
                onClick={() => handleSort('received_date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Alınma {sorting.sort_by === 'received_date' && (sorting.sort_order === 'ASC' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('due_date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Vade {sorting.sort_by === 'due_date' && (sorting.sort_order === 'ASC' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kalan Gün
              </th>
              <th
                onClick={() => handleSort('amount')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Tutar {sorting.sort_by === 'amount' && (sorting.sort_order === 'ASC' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cheques.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>Çek bulunamadı</p>
                </td>
              </tr>
            ) : (
              cheques.map((cheque) => (
                <tr
                  key={cheque.id}
                  className={`hover:bg-gray-50 transition cursor-pointer ${getRowColor(cheque)}`}
                  onClick={() => onChequeClick && onChequeClick(cheque)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cheque.check_serial_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {cheque.check_issuer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {cheque.customer_company_name || cheque.customer_contact_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {cheque.bank_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(cheque.received_date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(cheque.due_date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getDaysText(cheque.days_until_due)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₺{parseFloat(cheque.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    <div className="text-xs text-gray-500">{cheque.currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(cheque.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditCheque && onEditCheque(cheque)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => onChangeStatus && onChangeStatus(cheque)}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      Durum
                    </button>
                    <button
                      onClick={() => onDeleteCheque && onDeleteCheque(cheque)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Toplam <span className="font-medium">{pagination.total}</span> çek
            {' • '}
            Sayfa <span className="font-medium">{pagination.page}</span> / {Math.ceil(pagination.total / pagination.limit)}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>

            <span className="px-3 py-1 text-sm text-gray-700">
              {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
            </span>

            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Sayfa başına:</label>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination({ limit: parseInt(e.target.value), page: 1 })}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChequeList;
