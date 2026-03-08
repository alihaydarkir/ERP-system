import api from './api';

export const reportService = {
  // Get weekly report
  getWeeklyReport: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get('/api/reports/weekly', { params });
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/api/reports/dashboard-stats');
    return response.data;
  },

  // Get monthly report
  getMonthlyReport: async (year, month) => {
    const response = await api.get('/api/reports/monthly', {
      params: { year, month }
    });
    return response.data;
  },

  // Get top products
  getTopProducts: async (limit = 10, startDate, endDate) => {
    const params = { limit };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get('/api/reports/top-products', { params });
    return response.data;
  }
};
