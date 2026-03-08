import api from './api';

const dashboardService = {
  /**
   * ⚡ Tek çağrıyla tüm dashboard verisini döner
   * KPI, son siparişler, top ürünler, haftalık + aylık grafik
   */
  getSummary: async () => {
    const response = await api.get('/api/reports/summary');
    return response.data;
  },
};

export default dashboardService;
