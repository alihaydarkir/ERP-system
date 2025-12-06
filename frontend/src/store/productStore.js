import { create } from 'zustand';

const useProductStore = create((set) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),
  
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  
  addProduct: (product) => set((state) => ({
    products: [...state.products, product],
  })),
  
  updateProduct: (id, updates) => set((state) => ({
    products: state.products.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),
  
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
}));

export default useProductStore;

