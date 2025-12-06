import { create } from 'zustand';

const useChequeStore = create((set, get) => ({
  // State
  cheques: [],
  selectedCheque: null,
  statistics: {
    totalCheques: 0,
    pendingCount: 0,
    clearedCount: 0,
    bouncedCount: 0,
    cancelledCount: 0,
    pendingAmount: 0,
    clearedAmount: 0,
    bouncedAmount: 0,
    cancelledAmount: 0,
    dueSoonCount: 0,
    dueSoonAmount: 0,
    overdueCount: 0,
    overdueAmount: 0
  },
  dueSoonCheques: [],
  overdueCheques: [],
  filters: {
    status: '',
    customer_id: '',
    bank_name: '',
    start_date: '',
    end_date: ''
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0
  },
  sorting: {
    sort_by: 'due_date',
    sort_order: 'ASC'
  },
  isLoading: false,
  error: null,

  // Actions
  setCheques: (cheques) => set({ cheques }),

  setSelectedCheque: (cheque) => set({ selectedCheque: cheque }),

  addCheque: (cheque) => set((state) => ({
    cheques: [cheque, ...state.cheques]
  })),

  updateCheque: (id, updates) => set((state) => ({
    cheques: state.cheques.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
    selectedCheque: state.selectedCheque?.id === id
      ? { ...state.selectedCheque, ...updates }
      : state.selectedCheque
  })),

  deleteCheque: (id) => set((state) => ({
    cheques: state.cheques.filter((c) => c.id !== id),
    selectedCheque: state.selectedCheque?.id === id ? null : state.selectedCheque
  })),

  setStatistics: (stats) => set({ statistics: stats }),

  setDueSoonCheques: (cheques) => set({ dueSoonCheques: cheques }),

  setOverdueCheques: (cheques) => set({ overdueCheques: cheques }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, page: 1 } // Reset to first page when filters change
  })),

  resetFilters: () => set({
    filters: {
      status: '',
      customer_id: '',
      bank_name: '',
      start_date: '',
      end_date: ''
    },
    pagination: { page: 1, limit: 10, total: 0 }
  }),

  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),

  setSorting: (sorting) => set((state) => ({
    sorting: { ...state.sorting, ...sorting }
  })),

  setPage: (page) => set((state) => ({
    pagination: { ...state.pagination, page }
  })),

  setLimit: (limit) => set((state) => ({
    pagination: { ...state.pagination, limit, page: 1 }
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Helper to get current query params
  getQueryParams: () => {
    const state = get();
    return {
      ...state.filters,
      page: state.pagination.page,
      limit: state.pagination.limit,
      sort_by: state.sorting.sort_by,
      sort_order: state.sorting.sort_order
    };
  }
}));

export default useChequeStore;
