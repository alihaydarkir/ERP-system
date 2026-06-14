import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Euro, Banknote } from 'lucide-react';

const CurrencyTicker = () => {
  const [rates, setRates] = useState({
    USD: { buy: '0.00', sell: '0.00', change: '0.00' },
    EUR: { buy: '0.00', sell: '0.00', change: '0.00' },
    GBP: { buy: '0.00', sell: '0.00', change: '0.00' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    try {
      // Ücretsiz, anahtarsız, CORS açık kur API'si (USD bazlı)
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      const r = data?.rates;
      if (r && r.TRY) {
        const usd = r.TRY;                          // 1 USD = ? TRY
        const eur = r.EUR ? r.TRY / r.EUR : usd;    // 1 EUR = ? TRY (çapraz)
        const gbp = r.GBP ? r.TRY / r.GBP : usd;    // 1 GBP = ? TRY (çapraz)
        setRates(prev => {
          const mk = (val, prevData) => {
            const prevBuy = parseFloat(prevData?.buy) || val;
            const change = prevBuy ? ((val - prevBuy) / prevBuy) * 100 : 0;
            return { buy: val.toFixed(2), sell: (val * 1.004).toFixed(2), change: change.toFixed(2) };
          };
          return { USD: mk(usd, prev.USD), EUR: mk(eur, prev.EUR), GBP: mk(gbp, prev.GBP) };
        });
        setLoading(false);
        return;
      }
      throw new Error('Kur verisi alınamadı');
    } catch (e) {
      console.error('Kur verisi alınamadı:', e);
      // Erişilemezse mevcut değerleri koru; ilk yüklemede makul bir fallback göster
      setRates(prev => (parseFloat(prev.USD.buy) > 0 ? prev : {
        USD: { buy: '34.50', sell: '34.65', change: '0.00' },
        EUR: { buy: '37.20', sell: '37.45', change: '0.00' },
        GBP: { buy: '43.80', sell: '44.10', change: '0.00' },
      }));
      setLoading(false);
    }
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'USD': return <DollarSign className="w-3 h-3" />;
      case 'EUR': return <Euro className="w-3 h-3" />;
      case 'GBP': return <Banknote className="w-3 h-3" />;
      default: return <DollarSign className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-white dark:bg-gray-800/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-sm transition-all hover:shadow-md">
      {Object.entries(rates).map(([currency, data]) => (
        <div key={currency} className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 pr-3 last:pr-0">
          <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 p-1 rounded-full">
            {getCurrencyIcon(currency)}
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="font-bold text-xs text-gray-700 dark:text-gray-200">{currency}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-400">Alış</span>
            </div>
            <div className="flex items-center justify-between gap-2">
               <span className="font-mono font-bold text-xs text-gray-900 dark:text-white tracking-tight">{data.buy}</span>
               <div className="flex items-center">
                  {parseFloat(data.change) >= 0 ? (
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
                  )}
                  <span className={`text-[10px] font-medium ml-0.5 ${parseFloat(data.change) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    %{Math.abs(data.change)}
                  </span>
               </div>
            </div>
          </div>
        </div>
      ))}
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/200 animate-pulse ml-1" title="Sistem Çevrimiçi"></div>
    </div>
  );
};

export default CurrencyTicker;
