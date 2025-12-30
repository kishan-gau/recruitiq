import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { compensationService } from '../services/compensation.service';

export function useCompensation(filters?: any) {
  return useQuery({
    queryKey: ['compensation', filters],
    queryFn: () => compensationService.getCompensation(filters),
  });
}

export function useCompensationRecord(id: string) {
  return useQuery({
    queryKey: ['compensation', id],
    queryFn: () => compensationService.getCompensationById(id),
    enabled: !!id,
  });
}

export function useCreateCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: compensationService.createCompensation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation'] });
    },
  });
}

export function useUpdateCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      compensationService.updateCompensation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['compensation', id] });
      queryClient.invalidateQueries({ queryKey: ['compensation'] });
    },
  });
}

export function useDeleteCompensation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: compensationService.deleteCompensation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation'] });
    },
  });
}
