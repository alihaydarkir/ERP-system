import { create } from 'zustand';
import api from '../services/api';

const useSupplierStore = create((set, get) => ({
  // State
  suppliers: [],
  purchaseOrders: [],
  supplierPrices: {},
  selectedSupplier: null,
  selectedPurchaseOrder: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0
  },

  // Actions - Suppliers
  fetchSuppliers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/suppliers', { params: filters });
      if (response.data.success) {
        set({
          suppliers: response.data.data,
          pagination: response.data.pagination || get().pagination,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch suppliers',
        isLoading: false
      });
    }
  },

  fetchSupplierById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/suppliers/${id}`);
      if (response.data.success) {
        set({ selectedSupplier: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch supplier',
        isLoading: false
      });
    }
  },

  createSupplier: async (supplierData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/suppliers', supplierData);
      if (response.data.success) {
        set((state) => ({
          suppliers: [response.data.data, ...state.suppliers],
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create supplier',
        isLoading: false
      });
      throw error;
    }
  },

  updateSupplier: async (id, supplierData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/suppliers/${id}`, supplierData);
      if (response.data.success) {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? response.data.data : s
          ),
          selectedSupplier: response.data.data,
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update supplier',
        isLoading: false
      });
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`/api/suppliers/${id}`);
      if (response.data.success) {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
          isLoading: false
        }));
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to delete supplier',
        isLoading: false
      });
      throw error;
    }
  },

  searchSuppliers: async (query) => {
    try {
      const response = await api.get('/api/suppliers/search', {
        params: { q: query }
      });
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Search suppliers error:', error);
      return [];
    }
  },

  // Actions - Purchase Orders
  fetchPurchaseOrders: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/purchase-orders', { params: filters });
      if (response.data.success) {
        set({
          purchaseOrders: response.data.data,
          pagination: response.data.pagination || get().pagination,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch purchase orders',
        isLoading: false
      });
    }
  },

  fetchPurchaseOrderById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/purchase-orders/${id}`);
      if (response.data.success) {
        set({ selectedPurchaseOrder: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch purchase order',
        isLoading: false
      });
    }
  },

  createPurchaseOrder: async (poData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/purchase-orders', poData);
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: [response.data.data, ...state.purchaseOrders],
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  updatePurchaseOrder: async (id, poData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/purchase-orders/${id}`, poData);
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) =>
            po.id === id ? response.data.data : po
          ),
          selectedPurchaseOrder: response.data.data,
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  sendPurchaseOrder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/api/purchase-orders/${id}/send`);
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) =>
            po.id === id ? { ...po, status: 'sent' } : po
          ),
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to send purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  receivePurchaseOrder: async (id, items) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/api/purchase-orders/${id}/receive`, {
        items
      });
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) =>
            po.id === id ? response.data.data : po
          ),
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to receive purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  cancelPurchaseOrder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/api/purchase-orders/${id}/cancel`);
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) =>
            po.id === id ? { ...po, status: 'cancelled' } : po
          ),
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to cancel purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  deletePurchaseOrder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`/api/purchase-orders/${id}`);
      if (response.data.success) {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id),
          isLoading: false
        }));
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to delete purchase order',
        isLoading: false
      });
      throw error;
    }
  },

  fetchPendingPurchaseOrders: async () => {
    try {
      const response = await api.get('/api/purchase-orders/pending');
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Fetch pending purchase orders error:', error);
      return [];
    }
  },

  // Actions - Supplier Prices
  fetchSupplierPrices: async (supplierId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/supplier-prices/suppliers/${supplierId}/prices`);
      if (response.data.success) {
        set((state) => ({
          supplierPrices: {
            ...state.supplierPrices,
            [supplierId]: response.data.data
          },
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch supplier prices',
        isLoading: false
      });
    }
  },

  addSupplierPrice: async (supplierId, priceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(
        `/api/supplier-prices/suppliers/${supplierId}/prices`,
        priceData
      );
      if (response.data.success) {
        set((state) => ({
          supplierPrices: {
            ...state.supplierPrices,
            [supplierId]: [
              ...(state.supplierPrices[supplierId] || []),
              response.data.data
            ]
          },
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to add supplier price',
        isLoading: false
      });
      throw error;
    }
  },

  updateSupplierPrice: async (priceId, priceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(
        `/api/supplier-prices/prices/${priceId}`,
        priceData
      );
      if (response.data.success) {
        // Update price in the correct supplier's price list
        set((state) => {
          const updatedPrices = { ...state.supplierPrices };
          Object.keys(updatedPrices).forEach((supplierId) => {
            updatedPrices[supplierId] = updatedPrices[supplierId].map((p) =>
              p.id === priceId ? response.data.data : p
            );
          });
          return { supplierPrices: updatedPrices, isLoading: false };
        });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update supplier price',
        isLoading: false
      });
      throw error;
    }
  },

  deleteSupplierPrice: async (priceId, supplierId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`/api/supplier-prices/prices/${priceId}`);
      if (response.data.success) {
        set((state) => ({
          supplierPrices: {
            ...state.supplierPrices,
            [supplierId]: (state.supplierPrices[supplierId] || []).filter(
              (p) => p.id !== priceId
            )
          },
          isLoading: false
        }));
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to delete supplier price',
        isLoading: false
      });
      throw error;
    }
  },

  // Utility actions
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),
  setSelectedPurchaseOrder: (po) => set({ selectedPurchaseOrder: po }),
  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading })
}));

export default useSupplierStore;
