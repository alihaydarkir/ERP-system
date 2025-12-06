import React, { useState } from 'react';

const ChequeDetailView = ({ cheque, onClose, onChangeStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(cheque.status);
  const [notes, setNotes] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  if (!cheque) return null;

  const statusOptions = [
    { value: 'pending', label: 'Beklemede', color: 'yellow' },
    { value: 'cleared', label: 'Ödendi', color: 'green' },
    { value: 'bounced', label: 'Bozuldu', color: 'red' },
    { value: 'cancelled', label: 'İptal', color: 'gray' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    const colors = {
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${colors[statusConfig.color]}`}>
        {statusConfig.label}
      </span>
    );
  };

  const handleStatusChange = async () => {
    if (newStatus === cheque.status) {
      showWarning('Lütfen farklı bir durum seçin');
      return;
    }

    setIsChangingStatus(true);
    try {
      await onChangeStatus(cheque.id, selectedStatus, notes);
      setNotes('');
    } catch (error) {
      console.error('Status change error:', error);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const canChangeStatus = () => {
    // Cleared status can only be changed by admin
    if (cheque.status === 'cleared') {
      return false; // This should check user role in real app
    }
    return selectedStatus !== cheque.status;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Çek Detayları</h2>
              <p className="text-blue-100 mt-1">Seri No: {cheque.check_serial_no}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Keşideci</h3>
                <p className="text-lg font-semibold text-gray-900">{cheque.check_issuer}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Müşteri Şirketi</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {cheque.customer_company_name || '-'}
                </p>
                {cheque.customer_contact_name && (
                  <p className="text-sm text-gray-600 mt-1">İlgili: {cheque.customer_contact_name}</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Banka</h3>
                <p className="text-lg font-semibold text-gray-900">{cheque.bank_name}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tutar</h3>
                <p className="text-3xl font-bold text-gray-900">
                  ₺{parseFloat(cheque.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-600 mt-1">{cheque.currency}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Alınma Tarihi</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(cheque.received_date).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Vade Tarihi</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(cheque.due_date).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {cheque.days_until_due !== null && (
                  <p className={`text-sm mt-1 font-medium ${
                    cheque.days_until_due < 0 ? 'text-red-600' :
                    cheque.days_until_due <= 7 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {cheque.days_until_due < 0
                      ? `${Math.abs(cheque.days_until_due)} gün gecikmiş`
                      : `${cheque.days_until_due} gün kaldı`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Mevcut Durum</h3>
            <div className="flex items-center">
              {getStatusBadge(cheque.status)}
            </div>
          </div>

          {/* Notes */}
          {cheque.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Notlar</h3>
              <p className="text-gray-900">{cheque.notes}</p>
            </div>
          )}

          {/* Change Status Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Durum Değiştir</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Durum
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      disabled={cheque.status === 'cleared' && option.value !== 'cleared'}
                      className={`px-4 py-2 rounded-lg border-2 transition ${
                        selectedStatus === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Durum değişikliği ile ilgili açıklama..."
                />
              </div>

              <button
                onClick={handleStatusChange}
                disabled={!canChangeStatus() || isChangingStatus}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isChangingStatus ? 'Güncelleniyor...' : 'Durumu Güncelle'}
              </button>

              {cheque.status === 'cleared' && (
                <p className="text-sm text-orange-600 text-center">
                  ⚠️ Ödenen çeklerin durumu sadece yöneticiler tarafından değiştirilebilir
                </p>
              )}
            </div>
          </div>

          {/* Transaction History */}
          {cheque.transactions && cheque.transactions.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">İşlem Geçmişi</h3>
              <div className="space-y-3">
                {cheque.transactions.map((transaction, index) => (
                  <div key={transaction.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {transaction.old_status && (
                            <>
                              <span className="text-sm font-medium text-gray-600">
                                {transaction.old_status}
                              </span>
                              <span className="text-gray-400">→</span>
                            </>
                          )}
                          <span className="text-sm font-semibold text-gray-900">
                            {transaction.new_status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {transaction.changed_by_username || 'Sistem'}
                        </p>
                        {transaction.notes && (
                          <p className="text-sm text-gray-700 mt-2 italic">"{transaction.notes}"</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(transaction.changed_at).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChequeDetailView;
