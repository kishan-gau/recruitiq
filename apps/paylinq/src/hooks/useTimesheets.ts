/**
 * Timesheets Hooks
 * 
 * Custom React Query hooks for time tracking and attendance management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  TimeEntry,
  Timesheet,
  ShiftType,
  AttendanceEvent,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  CreateTimesheetRequest,
  UpdateTimesheetRequest,
  CreateShiftTypeRequest,
  UpdateShiftTypeRequest,
  CreateAttendanceEventRequest,
  TimeEntryFilters,
  TimesheetFilters,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const TIME_ENTRIES_KEY = ['timeEntries'];
const TIMESHEETS_KEY = ['timesheets'];
const SHIFT_TYPES_KEY = ['shiftTypes'];
const ATTENDANCE_KEY = ['attendance'];

// ============================================================================
// Time Entries Queries
// ============================================================================

/**
 * Hook to fetch time entries with filters
 */
export function useTimeEntries(params?: TimeEntryFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIME_ENTRIES_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getTimeEntries(params);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single time entry by ID
 */
export function useTimeEntry(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIME_ENTRIES_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getTimeEntry(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch time entries for a specific employee
 */
export function useEmployeeTimeEntries(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIME_ENTRIES_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getEmployeeTimeEntries(employeeId, params);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Time Entries Mutations
// ============================================================================

/**
 * Hook to create a new time entry
 */
export function useCreateTimeEntry() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTimeEntryRequest) => {
      const response = await paylinq.createTimeEntry(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'employee', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY] });
      success('Time entry created successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create time entry');
    },
  });
}

/**
 * Hook to update a time entry
 */
export function useUpdateTimeEntry() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeEntryRequest }) => {
      const response = await paylinq.updateTimeEntry(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'employee', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY] });
      success('Time entry updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update time entry');
    },
  });
}

/**
 * Hook to delete a time entry
 */
export function useDeleteTimeEntry() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteTimeEntry(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'employee'] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY] });
      success('Time entry deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete time entry');
    },
  });
}

// ============================================================================
// Timesheets Queries
// ============================================================================

/**
 * Hook to fetch timesheets with filters
 */
export function useTimesheets(params?: TimesheetFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIMESHEETS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getTimesheets(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single timesheet by ID
 */
export function useTimesheet(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIMESHEETS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getTimesheet(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch timesheets for an employee
 */
export function useEmployeeTimesheets(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TIMESHEETS_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getEmployeeTimesheets(employeeId, params);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Timesheets Mutations
// ============================================================================

/**
 * Hook to create a new timesheet
 */
export function useCreateTimesheet() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTimesheetRequest) => {
      const response = await paylinq.createTimesheet(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'employee', data.employeeId] });
      success('Timesheet created successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create timesheet');
    },
  });
}

/**
 * Hook to update a timesheet
 */
export function useUpdateTimesheet() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimesheetRequest }) => {
      const response = await paylinq.updateTimesheet(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'employee', data.employeeId] });
      success('Timesheet updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update timesheet');
    },
  });
}

/**
 * Hook to submit a timesheet for approval
 */
export function useSubmitTimesheet() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.submitTimesheet(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
      success('Timesheet submitted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to submit timesheet');
    },
  });
}

/**
 * Hook to approve a timesheet
 */
export function useApproveTimesheet() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.approveTimesheet(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
      success('Timesheet approved successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to approve timesheet');
    },
  });
}

// ============================================================================
// Shift Types Queries
// ============================================================================

/**
 * Hook to fetch all shift types
 */
export function useShiftTypes(params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...SHIFT_TYPES_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getShiftTypes(params);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - shift types change infrequently
  });
}

/**
 * Hook to fetch a single shift type by ID
 */
export function useShiftType(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...SHIFT_TYPES_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getShiftType(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Shift Types Mutations
// ============================================================================

/**
 * Hook to create a new shift type
 */
export function useCreateShiftType() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateShiftTypeRequest) => {
      const response = await paylinq.createShiftType(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, 'list'] });
      success(`Shift type "${data.name}" created successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create shift type');
    },
  });
}

/**
 * Hook to update a shift type
 */
export function useUpdateShiftType() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateShiftTypeRequest }) => {
      const response = await paylinq.updateShiftType(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, 'list'] });
      success(`Shift type "${data.name}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update shift type');
    },
  });
}

// ============================================================================
// Attendance Events Queries & Mutations
// ============================================================================

/**
 * Hook to fetch attendance events for an employee
 */
export function useAttendanceEvents(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getAttendanceEvents(employeeId, params);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to create an attendance event (clock in/out)
 */
export function useCreateAttendanceEvent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAttendanceEventRequest) => {
      const response = await paylinq.createAttendanceEvent(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, 'employee', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY] });
      success(`${data.eventType} recorded successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to record attendance event');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch pending timesheets
 */
export function usePendingTimesheets(params?: PaginationParams) {
  return useTimesheets({ ...params, status: 'pending' });
}

/**
 * Hook to fetch approved timesheets
 */
export function useApprovedTimesheets(params?: PaginationParams) {
  return useTimesheets({ ...params, status: 'approved' });
}

/**
 * Hook to check if employee has pending timesheets
 */
export function useHasPendingTimesheets(employeeId: string) {
  const { data, isLoading } = useEmployeeTimesheets(employeeId);
  const pendingCount = data?.filter((t: Timesheet) => t.status === 'pending').length || 0;
  
  return {
    hasPending: pendingCount > 0,
    count: pendingCount,
    isLoading,
  };
}
