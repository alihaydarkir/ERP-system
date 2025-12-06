import React from 'react';
import useChequeStore from '../../store/chequeStore';

const DueSoonAlert = ({ onChequeClick }) => {
  const { dueSoonCheques, overdueCheques } = useChequeStore();

  if (dueSoonCheques.length === 0 && overdueCheques.length === 0) {
    return null;
  }

  const getUrgencyColor = (daysUntilDue) => {
    if (daysUntilDue < 0) return 'bg-red-100 border-red-400 text-red-800';
    if (daysUntilDue <= 3) return 'bg-orange-100 border-orange-400 text-orange-800';
    return 'bg-yellow-100 border-yellow-400 text-yellow-800';
  };

  const getUrgencyText = (daysUntilDue) => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} gün gecikmiş`;
    if (daysUntilDue === 0) return 'Bugün';
    if (daysUntilDue === 1) return 'Yarın';
    return `${daysUntilDue} gün`;
  };

  const allAlerts = [
    ...overdueCheques.map(c => ({ ...c, isOverdue: true })),
    ...dueSoonCheques.map(c => ({ ...c, isOverdue: false }))
  ];

  return (
    <div className="mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            Vade Uyarıları
          </h3>
          <span className="text-sm text-gray-500">
            {allAlerts.length} çek
          </span>
        </div>

        {allAlerts.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allAlerts.map((cheque) => (
              <div
                key={cheque.id}
                onClick={() => onChequeClick && onChequeClick(cheque)}
                className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${getUrgencyColor(
                  cheque.days_until_due || -Math.abs(cheque.days_overdue)
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm">
                        Seri No: {cheque.check_serial_no}
                      </span>
                      {cheque.isOverdue && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                          VADESİ GEÇMİŞ
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-90">
                      {cheque.customer_company_name || cheque.customer_contact_name}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {cheque.bank_name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-lg">
                      ₺{parseFloat(cheque.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs mt-1 font-medium">
                      {getUrgencyText(cheque.days_until_due || -Math.abs(cheque.days_overdue))}
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">
                      Vade: {new Date(cheque.due_date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">✨</div>
            <p>Vade uyarısı yok</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DueSoonAlert;
