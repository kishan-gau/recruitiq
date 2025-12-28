import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesService } from '../services/schedules.service';

export function useSchedules(filters?: any) {
  return useQuery({
    queryKey: ['schedules', filters],
    queryFn: () => schedulesService.listSchedules(filters),
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesService.getSchedule(id),
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulesService.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      schedulesService.updateSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulesService.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulesService.publishSchedule,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
