import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';

export const CUSTOMERS_KEY = 'customers';

export function useCustomers(params = {}) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: () => customerService.getAll(params),
    select: (res) => res.data ?? [],
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => customerService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => customerService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => customerService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => customerService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] }),
  });
}
