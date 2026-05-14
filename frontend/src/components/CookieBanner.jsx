import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie_consent';

function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Bu site deneyiminizi iyileştirmek için çerezler kullanır.{' '}
          <Link to="/privacy-policy" className="font-medium text-blue-600 hover:underline">
            Gizlilik Politikası
          </Link>
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleConsent('rejected')}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => handleConsent('accepted')}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieBanner;
