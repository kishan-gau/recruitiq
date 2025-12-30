import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { deductionsService } from '../services/deductions.service';

export function useDeductions(filters?: any) {
  return useQuery({
    queryKey: ['deductions', filters],
    queryFn: () => deductionsService.getDeductions(filters),
  });
}

export function useDeduction(id: string) {
  return useQuery({
    queryKey: ['deductions', id],
    queryFn: () => deductionsService.getDeduction(id),
    enabled: !!id,
  });
}

export function useCreateDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deductionsService.createDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    },
  });
}

export function useUpdateDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      deductionsService.updateDeduction(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deductions', id] });
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    },
  });
}

export function useDeleteDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deductionsService.deleteDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    },
  });
}
