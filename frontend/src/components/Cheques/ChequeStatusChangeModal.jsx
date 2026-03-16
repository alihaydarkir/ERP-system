import React, { useState, useEffect } from 'react';
import customerService from '../../services/customerService';

const ChequeStatusChangeModal = ({ cheque, onClose, onSubmit }) => {
  const [status, setStatus] = useState(cheque?.status || 'pending');
  const [notes, setNotes] = useState('');
  const [collateralBank, setCollateralBank] = useState('');
  const [givenToCustomerId, setGivenToCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const turkishBanks = [
    'Akbank', 'Alternatif Bank', 'Anadolubank', 'Denizbank', 'Fibabanka',
    'Garanti BBVA', 'Halkbank', 'HSBC', 'ING', 'İş Bankası',
    'Kuveyt Türk', 'Odeabank', 'QNB Finansbank', 'Şekerbank', 'TEB',
    'Türk Ekonomi Bankası', 'Türkiye Finans', 'Vakıfbank', 'Yapı Kredi',
    'Ziraat Bankası', 'Albaraka Türk', 'Bank of America', 'Bank of Tokyo',
    'Burgan Bank', 'Citibank', 'Deutsche Bank', 'JPMorgan Chase',
    'Rabobank', 'Türkiye İş Bankası', 'Vakıf Katılım', 'Ziraat Katılım',
    'Emlak Katılım', 'Türkiye Emlak Katılım Bankası'
  ].sort();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll({ limit: 1000 });
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        status,
        notes,
        ...(status === 'teminat' && { collateral_bank: collateralBank }),
        ...(status === 'musteriye_verildi' && { given_to_customer_id: givenToCustomerId })
      };

      await onSubmit(cheque.id, updateData);
      onClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Durum Değiştir
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <div><strong>Çek No:</strong> {cheque?.check_serial_no}</div>
                <div><strong>Banka:</strong> {cheque?.bank_name}</div>
                <div><strong>Tutar:</strong> ₺{parseFloat(cheque?.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Durum Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Durum <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="pending">Beklemede</option>
              <option value="paid">Ödendi</option>
              <option value="cancelled">İptal</option>
              <option value="teminat">Teminata Verildi</option>
              <option value="musteriye_verildi">Müşteriye Verildi</option>
            </select>
          </div>

          {/* Teminat Bankası (sadece teminat durumunda) */}
          {status === 'teminat' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teminat Bankası <span className="text-red-500">*</span>
              </label>
              <select
                value={collateralBank}
                onChange={(e) => setCollateralBank(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Banka Seçin</option>
                {turkishBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Müşteri Seçimi (sadece müşteriye verildi durumunda) */}
          {status === 'musteriye_verildi' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Müşteri <span className="text-red-500">*</span>
              </label>
              <select
                value={givenToCustomerId}
                onChange={(e) => setGivenToCustomerId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Müşteri Seçin</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name || customer.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notlar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Durum değişikliği ile ilgili notlar..."
            />
          </div>

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChequeStatusChangeModal;
