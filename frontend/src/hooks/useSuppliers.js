import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';

export const SUPPLIERS_KEY = 'suppliers';

export function useSuppliers({ enabled = true, ...params } = {}) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, params],
    queryFn: () => supplierService.getAll(params),
    select: (res) => res.data ?? [],
    enabled,
  });
}

export function useSupplier(id) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, id],
    queryFn: () => supplierService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => supplierService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => supplierService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => supplierService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }),
  });
}
