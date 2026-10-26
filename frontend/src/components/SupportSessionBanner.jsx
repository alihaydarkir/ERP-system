import { useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';

const remainingText = (expiresAt) => {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  if (seconds <= 0) return 'süre doldu';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
};

// Destek oturumunda her sayfanın üstünde: kimin, hangi yetkiyle, ne kadar süre baktığı açıkça görünür.
export default function SupportSessionBanner({ support }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!support) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 text-sm border-b border-amber-300 dark:border-amber-700">
      <LifeBuoy className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>Destek oturumu</strong> · {support.access_level === 'edit' ? 'düzeltme yapabilir' : 'salt okunur'} ·
        kalan süre {remainingText(support.expires_at)} · dışa aktarma kapalı · tüm işlemler firmaya raporlanıyor
      </span>
    </div>
  );
}
