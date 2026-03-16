import React from 'react';
import useChequeStore from '../../store/chequeStore';

const ChequeStatistics = () => {
  const { statistics } = useChequeStore();

  const statCards = [
    {
      title: 'Toplam Çek',
      value: statistics.totalCheques,
      icon: '📋',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Bekleyen Çekler',
      value: `₺${statistics.pendingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      count: statistics.pendingCount,
      icon: '⏳',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'Gelen Çekler',
      value: `₺${(statistics.paidAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      count: statistics.paidCount || 0,
      icon: '✅',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Teminatta Olan',
      value: `₺${(statistics.teminatAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      count: statistics.teminatCount || 0,
      icon: '🏦',
      color: 'from-indigo-500 to-blue-600',
    },
    {
      title: 'Vade Yaklaşan',
      value: `₺${statistics.dueSoonAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      count: statistics.dueSoonCount,
      icon: '⚠️',
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Vade Geçmiş',
      value: `₺${statistics.overdueAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      count: statistics.overdueCount,
      icon: '🔴',
      color: 'from-rose-500 to-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${card.color} p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl">{card.icon}</div>
            {card.count !== undefined && (
              <div className="text-sm opacity-90 font-medium">
                {card.count} çek
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">{card.title}</h3>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default ChequeStatistics;
