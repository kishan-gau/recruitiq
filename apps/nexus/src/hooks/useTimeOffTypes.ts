/**
 * React Query hooks for Time-Off Type Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeOffTypesService } from '../services/timeOffTypes.service';
import { useToast } from '../contexts/ToastContext';
import type {
  CreateTimeOffTypeDTO,
  UpdateTimeOffTypeDTO,
  AccrueTimeOffDTO,
  TimeOffTypeFilters
} from '../types/timeOffTypes.types';

/**
 * Hook to fetch all time-off types
 */
export function useTimeOffTypes(filters?: TimeOffTypeFilters) {
  return useQuery({
    queryKey: ['timeOffTypes', filters],
    queryFn: () => timeOffTypesService.listTimeOffTypes(filters),
  });
}

/**
 * Hook to fetch single time-off type
 */
export function useTimeOffType(id: string) {
  return useQuery({
    queryKey: ['timeOffTypes', id],
    queryFn: () => timeOffTypesService.getTimeOffType(id),
    enabled: !!id,
  });
}

/**
 * Hook to create time-off type
 */
export function useCreateTimeOffType() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateTimeOffTypeDTO) =>
      timeOffTypesService.createTimeOffType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffTypes'] });
      toast.success('Time-off type created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create time-off type');
    },
  });
}

/**
 * Hook to update time-off type
 */
export function useUpdateTimeOffType() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTimeOffTypeDTO }) =>
      timeOffTypesService.updateTimeOffType(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['timeOffTypes', id] });
      queryClient.invalidateQueries({ queryKey: ['timeOffTypes'] });
      toast.success('Time-off type updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update time-off type');
    },
  });
}

/**
 * Hook to delete time-off type
 */
export function useDeleteTimeOffType() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => timeOffTypesService.deleteTimeOffType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffTypes'] });
      toast.success('Time-off type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete time-off type');
    },
  });
}

/**
 * Hook to accrue time-off for employee
 */
export function useAccrueTimeOff() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: AccrueTimeOffDTO) =>
      timeOffTypesService.accrueTimeOff(data),
    onSuccess: (_, variables) => {
      // Invalidate employee balances
      queryClient.invalidateQueries({ 
        queryKey: ['timeOffBalances', variables.employeeId] 
      });
      queryClient.invalidateQueries({ queryKey: ['timeOffBalances'] });
      toast.success('Time-off accrued successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to accrue time-off');
    },
  });
}

/**
 * Hook to fetch employee time-off balances
 */
export function useEmployeeTimeOffBalances(employeeId: string, year?: number) {
  return useQuery({
    queryKey: ['timeOffBalances', employeeId, year],
    queryFn: () => timeOffTypesService.getEmployeeBalances(employeeId, year),
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch accrual history
 */
export function useAccrualHistory(employeeId: string, timeOffTypeId?: string) {
  return useQuery({
    queryKey: ['accrualHistory', employeeId, timeOffTypeId],
    queryFn: () => timeOffTypesService.getAccrualHistory(employeeId, timeOffTypeId),
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch time-off type statistics
 */
export function useTimeOffTypeStats(typeId: string, year: number) {
  return useQuery({
    queryKey: ['timeOffTypeStats', typeId, year],
    queryFn: () => timeOffTypesService.getTypeStats(typeId, year),
    enabled: !!typeId && !!year,
  });
}
