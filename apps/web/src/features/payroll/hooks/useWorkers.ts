import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { workersService } from '../../scheduling/services/workers.service';

export function useWorkers(filters?: any) {
  return useQuery({
    queryKey: ['workers', filters],
    queryFn: () => workersService.listWorkers(filters),
  });
}

export function useWorker(id: string) {
  return useQuery({
    queryKey: ['workers', id],
    queryFn: () => workersService.getWorker(id),
    enabled: !!id,
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workersService.createWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      workersService.updateWorker(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workers', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useDeleteWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workersService.deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useAssignToShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workerId, shiftId }: { workerId: string; shiftId: string }) =>
      workersService.assignToShift(workerId, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
