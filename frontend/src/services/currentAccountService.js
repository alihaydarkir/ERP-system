import api from './api';

const currentAccountService = {
  /** Genel özet: toplam alacak, ödenen, açık bakiye */
  getSummary: async () => {
    const res = await api.get('/api/current-accounts/summary');
    return res.data;
  },

  /** Tüm müşteri bakiye listesi */
  getList: async (params = {}) => {
    const res = await api.get('/api/current-accounts', { params });
    return res.data;
  },

  /** Tek müşteri detayı */
  getDetail: async (customerId) => {
    const res = await api.get(`/api/current-accounts/${customerId}`);
    return res.data;
  },

  /** Müşteri hareket geçmişi (sipariş + fatura) */
  getTransactions: async (customerId, params = {}) => {
    const res = await api.get(`/api/current-accounts/${customerId}/transactions`, { params });
    return res.data;
  },
};

export default currentAccountService;
