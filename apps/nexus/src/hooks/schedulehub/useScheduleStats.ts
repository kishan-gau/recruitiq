import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';

export function useScheduleStats() {
  return useQuery({
    queryKey: ['schedulehub', 'stats'],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return {
        activeWorkers: 45,
        publishedSchedules: 12,
        pendingTimeOff: 8,
        openShifts: 23,
        upcomingShifts: [],
        pendingApprovals: [],
      };
    },
  });
}

export function useWorkers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  departmentId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['schedulehub', 'workers', params],
    queryFn: () => schedulehubApi.workers.list(params),
  });
}

export function useWorker(id: string) {
  return useQuery({
    queryKey: ['schedulehub', 'workers', id],
    queryFn: () => schedulehubApi.workers.get(id),
    enabled: !!id,
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulehubApi.workers.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
    },
  });
}

export function useUpdateWorker(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => schedulehubApi.workers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers', id] });
    },
  });
}

export function useTerminateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, terminationDate }: { id: string; terminationDate: string }) =>
      schedulehubApi.workers.terminate(id, terminationDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
    },
  });
}

export function useSchedules(params?: {
  page?: number;
  limit?: number;
  status?: string;
  departmentId?: string;
  startDate?: string;
}) {
  return useQuery({
    queryKey: ['schedulehub', 'schedules', params],
    queryFn: () => schedulehubApi.schedules.list(params),
  });
}

export function useSchedule(id: string, includeShifts = true) {
  return useQuery({
    queryKey: ['schedulehub', 'schedules', id, { includeShifts }],
    queryFn: () => schedulehubApi.schedules.get(id, includeShifts),
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulehubApi.schedules.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'schedules'] });
    },
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulehubApi.schedules.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'schedules'] });
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, ...data }: any) =>
      schedulehubApi.schedules.createShift(scheduleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['schedulehub', 'schedules', variables.scheduleId],
      });
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, workerId }: { shiftId: string; workerId: string }) =>
      schedulehubApi.shifts.assign(shiftId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'schedules'] });
    },
  });
}

export function useAvailability(workerId: string, params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'availability', workerId, params],
    queryFn: () => schedulehubApi.availability.getWorkerAvailability(workerId, params),
    enabled: !!workerId,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulehubApi.availability.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'availability'] });
    },
  });
}

export function useTimeOffRequests(params?: {
  workerId?: string;
  status?: string;
  pending?: boolean;
}) {
  return useQuery({
    queryKey: ['schedulehub', 'timeoff', params],
    queryFn: () => {
      if (params?.pending) {
        return schedulehubApi.timeOff.getPending();
      }
      if (params?.workerId) {
        return schedulehubApi.timeOff.getWorkerRequests(params.workerId, params);
      }
      return schedulehubApi.timeOff.list(params);
    },
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulehubApi.timeOff.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'timeoff'] });
    },
  });
}

export function useReviewTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: string; notes?: string }) =>
      schedulehubApi.timeOff.review(id, decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'timeoff'] });
    },
  });
}

export function useShiftSwaps(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'shiftswaps', params],
    queryFn: () => schedulehubApi.shiftSwaps.getMarketplace(params),
  });
}

export function useCreateSwapOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulehubApi.shiftSwaps.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shiftswaps'] });
    },
  });
}

export function useRequestSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, ...data }: any) =>
      schedulehubApi.shiftSwaps.requestSwap(offerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shiftswaps'] });
    },
  });
}

export function useRoles(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'roles', params],
    queryFn: () => schedulehubApi.roles.list(params),
  });
}

export function useStations(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'stations', params],
    queryFn: () => schedulehubApi.stations.list(params),
  });
}
