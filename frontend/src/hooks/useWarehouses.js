import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService } from '../services/warehouseService';

export const WAREHOUSES_KEY = 'warehouses';

export function useWarehouses({ enabled = true, ...params } = {}) {
  return useQuery({
    queryKey: [WAREHOUSES_KEY, params],
    queryFn: () => warehouseService.getAll(params),
    select: (res) => res.data ?? [],
    enabled,
  });
}

export function useWarehouse(id) {
  return useQuery({
    queryKey: [WAREHOUSES_KEY, id],
    queryFn: () => warehouseService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => warehouseService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => warehouseService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }),
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => warehouseService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] }),
  });
}
