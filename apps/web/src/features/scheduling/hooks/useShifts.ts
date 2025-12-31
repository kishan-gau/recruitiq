import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { shiftsService } from '../services/shifts.service';

/**
 * Hook for fetching shifts list
 */
export function useShifts(filters?: any) {
  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: () => shiftsService.listShifts(filters),
  });
}

/**
 * Hook for fetching a single shift
 */
export function useShift(id?: string) {
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: () => shiftsService.getShift(id!),
    enabled: !!id,
  });
}

/**
 * Hook for creating a shift
 */
export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shiftsService.createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

/**
 * Hook for updating a shift
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      shiftsService.updateShift(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['shifts', id] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

/**
 * Hook for deleting a shift
 */
export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shiftsService.deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

/**
 * Hook for assigning a shift to a worker
 * TODO: Implement actual API call
 */
export function useAssignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, workerId }: { shiftId: string; workerId: string }) => {
      // TODO: Implement actual API call
      return { shiftId, workerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

/**
 * Hook for unassigning a shift from a worker
 * TODO: Implement actual API call
 */
export function useUnassignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId }: { shiftId: string }) => {
      // TODO: Implement actual API call
      return { shiftId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
