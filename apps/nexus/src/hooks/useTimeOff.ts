/**
 * Time Off React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeOffService } from '@/services/timeOff.service';
import type {
  CreateTimeOffRequestDTO,
  UpdateTimeOffRequestDTO,
  ReviewTimeOffRequestDTO,
  TimeOffRequestFilters,
} from '@/types/timeOff.types';
import { useToast } from '@/contexts/ToastContext';

// ============ Requests Hooks ============

/**
 * Hook to fetch all time-off requests with optional filters
 */
export function useTimeOffRequests(filters?: TimeOffRequestFilters) {
  return useQuery({
    queryKey: ['timeoff', 'requests', filters],
    queryFn: () => timeOffService.listRequests(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single time-off request by ID
 */
export function useTimeOffRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['timeoff', 'requests', id],
    queryFn: () => timeOffService.getRequest(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch all time-off requests for a specific employee
 */
export function useEmployeeTimeOffRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['timeoff', 'requests', 'employee', employeeId],
    queryFn: () => timeOffService.getEmployeeRequests(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create a new time-off request
 */
export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (request: CreateTimeOffRequestDTO) => timeOffService.createRequest(request),
    onSuccess: (newRequest) => {
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', 'employee', newRequest.employeeId] });
      success('Time-off request created successfully');
    },
    onError: (err: Error) => {
      error(`Failed to create time-off request: ${err.message}`);
    },
  });
}

/**
 * Hook to update a time-off request
 */
export function useUpdateTimeOffRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTimeOffRequestDTO }) =>
      timeOffService.updateRequest(id, updates),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', updatedRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', 'employee', updatedRequest.employeeId] });
      success('Time-off request updated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to update time-off request: ${err.message}`);
    },
  });
}

/**
 * Hook to delete a time-off request
 */
export function useDeleteTimeOffRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => timeOffService.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'balances'] });
      success('Time-off request deleted successfully');
    },
    onError: (err: Error) => {
      error(`Failed to delete time-off request: ${err.message}`);
    },
  });
}

/**
 * Hook to approve or reject a time-off request
 */
export function useReviewTimeOffRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, review }: { id: string; review: ReviewTimeOffRequestDTO }) =>
      timeOffService.reviewRequest(id, review),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', updatedRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', 'employee', updatedRequest.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'balances'] });
      success(`Time-off request ${updatedRequest.status} successfully`);
    },
    onError: (err: Error) => {
      error(`Failed to review time-off request: ${err.message}`);
    },
  });
}

/**
 * Hook to cancel a time-off request
 */
export function useCancelTimeOffRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => timeOffService.cancelRequest(id),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', updatedRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'requests', 'employee', updatedRequest.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['timeoff', 'balances'] });
      success('Time-off request cancelled successfully');
    },
    onError: (err: Error) => {
      error(`Failed to cancel time-off request: ${err.message}`);
    },
  });
}

// ============ Balances Hooks ============

/**
 * Hook to fetch time-off balances for an employee
 */
export function useEmployeeTimeOffBalances(employeeId: string | undefined, year?: number) {
  return useQuery({
    queryKey: ['timeoff', 'balances', 'employee', employeeId, year],
    queryFn: () => timeOffService.getEmployeeBalances(employeeId!, year),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch all time-off balances
 */
export function useTimeOffBalances(year?: number) {
  return useQuery({
    queryKey: ['timeoff', 'balances', year],
    queryFn: () => timeOffService.listBalances(year),
    staleTime: 5 * 60 * 1000,
  });
}

// ============ Policies Hooks ============

/**
 * Hook to fetch all time-off policies
 */
export function useTimeOffPolicies() {
  return useQuery({
    queryKey: ['timeoff', 'policies'],
    queryFn: () => timeOffService.listPolicies(),
    staleTime: 10 * 60 * 1000, // 10 minutes - policies change rarely
  });
}

/**
 * Hook to fetch a single policy by ID
 */
export function useTimeOffPolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['timeoff', 'policies', id],
    queryFn: () => timeOffService.getPolicy(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// ============ Calendar Hooks ============

/**
 * Hook to fetch calendar events for time-off
 */
export function useTimeOffCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['timeoff', 'calendar', startDate, endDate],
    queryFn: () => timeOffService.getCalendarEvents(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}
