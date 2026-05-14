import { useState } from 'react';
import { Link } from 'react-router-dom';

const TOTAL_STEPS = 4;

export default function OnboardingModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Adım {step}/{TOTAL_STEPS}</div>
          <button
            type="button"
            onClick={onComplete}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Atla
          </button>
        </div>

        <div className="p-6 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ErpFinaly'e Hoş Geldiniz!</h2>
              <p className="text-gray-600 dark:text-gray-300">ERP sisteminizle tüm operasyonları tek yerden yönetin:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">
                <li>Sipariş yönetimi ve durum takibi</li>
                <li>Stok takibi ve düşük stok uyarıları</li>
                <li>Fatura yönetimi ve finansal görünüm</li>
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Turu</h2>
              <p className="text-gray-700 dark:text-gray-200">Dashboard ekranında anlık KPI kartları, gelir/sipariş grafikleri ve kritik uyarıları görürsünüz.</p>
              <p className="text-gray-600 dark:text-gray-300">Böylece şirketinizin genel durumunu tek bakışta takip edebilirsiniz.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">İlk Adımlar</h2>
              <p className="text-gray-600 dark:text-gray-300">Hızlı başlamak için:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link to="/products" className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="font-semibold text-gray-800 dark:text-gray-100">Ürün ekle</div>
                </Link>
                <Link to="/customers" className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="font-semibold text-gray-800 dark:text-gray-100">Müşteri ekle</div>
                </Link>
                <Link to="/orders" className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="font-semibold text-gray-800 dark:text-gray-100">Sipariş oluştur</div>
                </Link>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hazırsınız!</h2>
              <p className="text-gray-700 dark:text-gray-200">Sistemi kullanmaya hazırsınız. İyi çalışmalar 🚀</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Geri
              </button>
            )}
          </div>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {step === 1 ? 'Başlayalım' : 'Devam'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
