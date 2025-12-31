import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { timeoffService } from '../services/timeoff.service';

const TIMEOFF_QUERY_KEY = ['timeoff'];

export function useTimeOffRequests(filters?: any) {
  return useQuery({
    queryKey: [...TIMEOFF_QUERY_KEY, filters],
    queryFn: () => timeoffService.listTimeOffRequests(filters),
    enabled: true,
  });
}

export function useTimeOffRequest(id?: string) {
  return useQuery({
    queryKey: [...TIMEOFF_QUERY_KEY, id],
    queryFn: () => timeoffService.getTimeOffRequest(id!),
    enabled: !!id,
  });
}

export function useEmployeeTimeOffBalance(employeeId?: string, year?: number) {
  return useQuery({
    queryKey: [...TIMEOFF_QUERY_KEY, 'balance', employeeId, year],
    queryFn: () => timeoffService.getEmployeeTimeOffBalance(employeeId!, year),
    enabled: !!employeeId,
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeoffService.createTimeOffRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMEOFF_QUERY_KEY });
    },
  });
}

export function useUpdateTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      timeoffService.updateTimeOffRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMEOFF_QUERY_KEY });
    },
  });
}

export function useDeleteTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeoffService.deleteTimeOffRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMEOFF_QUERY_KEY });
    },
  });
}

export function useApproveTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      timeoffService.approveTimeOffRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMEOFF_QUERY_KEY });
    },
  });
}

export function useRejectTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      timeoffService.rejectTimeOffRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMEOFF_QUERY_KEY });
    },
  });
}


// Alias for backward compatibility
export { useTimeOffRequests as useTimeOff };
