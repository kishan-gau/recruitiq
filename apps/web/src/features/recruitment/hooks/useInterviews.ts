import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewsService } from '../services/interviews.service';

export function useInterviews(filters?: any) {
  return useQuery({
    queryKey: ['interviews', filters],
    queryFn: () => interviewsService.listInterviews(filters),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: ['interviews', id],
    queryFn: () => interviewsService.getInterview(id),
    enabled: !!id,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewsService.createInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      interviewsService.updateInterview(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['interviews', id] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewsService.deleteInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: interviewsService.scheduleInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}

export function useRecordFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ interviewId, feedback }: { interviewId: string; feedback: any }) =>
      interviewsService.recordFeedback(interviewId, feedback),
    onSuccess: (_, { interviewId }) => {
      queryClient.invalidateQueries({ queryKey: ['interviews', interviewId] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}
