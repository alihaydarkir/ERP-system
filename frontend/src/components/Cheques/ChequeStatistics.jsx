import React from 'react';
import useChequeStore from '../../store/chequeStore';
import { ClipboardList, Clock, CheckCircle2, Building2, AlertTriangle, AlertCircle } from 'lucide-react';

const ChequeStatistics = () => {
  const { statistics } = useChequeStore();

  const statCards = [
    {
      title: 'Toplam Çek',
      value: statistics.totalCheques,
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/30',
    },
    {
      title: 'Bekleyen Çekler',
      value: `₺${statistics.pendingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: statistics.pendingCount,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/30',
    },
    {
      title: 'Gelen Çekler',
      value: `₺${(statistics.paidAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: statistics.paidCount || 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/30',
    },
    {
      title: 'Teminatta Olan',
      value: `₺${(statistics.teminatAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: statistics.teminatCount || 0,
      icon: Building2,
      color: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/30',
    },
    {
      title: 'Vade Yaklaşan',
      value: `₺${statistics.dueSoonAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: statistics.dueSoonCount,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/30',
    },
    {
      title: 'Vade Geçmiş',
      value: `₺${statistics.overdueAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: statistics.overdueCount,
      icon: AlertCircle,
      color: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`
              relative overflow-hidden
              bg-gradient-to-br ${card.color} 
              p-4 rounded-2xl text-white 
              shadow-lg hover:shadow-xl ${card.shadow}
              transition-all duration-300 transform hover:-translate-y-1
              border border-white/10 dark:border-gray-700/50
            `}
          >
            {/* Decorative Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
               <Icon size={80} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 border border-white/25 backdrop-blur-sm rounded-lg">
                <Icon size={24} className="text-white" />
              </div>
              {card.count !== undefined && (
                <div className="bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide border border-white/10">
                  {card.count} Adet
                </div>
              )}
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">
                {card.title}
              </h3>
              <p 
                className="text-lg lg:text-xl font-bold text-white truncate leading-tight" 
                title={card.value} // Tooltip for full value
              >
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChequeStatistics;
