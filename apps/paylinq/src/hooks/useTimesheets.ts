/**
 * Timesheets Hooks
 * 
 * Custom React Query hooks for time tracking and attendance management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  Timesheet,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  SubmitTimesheetRequest,
  // CreateTimesheetRequest, // TODO: Add these types to @recruitiq/types
  // UpdateTimesheetRequest,
  CreateShiftTypeRequest,
  UpdateShiftTypeRequest,
  // CreateAttendanceEventRequest,
  TimeEntryFilters,
  TimesheetFilters,
  PaginationParams,
} from '@recruitiq/types';

// Temporary type aliases until these are added to @recruitiq/types
type CreateTimesheetRequest = any;
type UpdateTimesheetRequest = any;
type CreateAttendanceEventRequest = any;

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
      return response.data || [];
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
      const response = await paylinq.getTimeEntries({ ...params, employeeId });
      return response.data || [];
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'list'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'employee', data.employeeId] });
      }
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
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY, 'employee', data.employeeId] });
      }
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
      return response.data || [];
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
      const response = await paylinq.getEmployeeTimesheets(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Timesheets Mutations
// ============================================================================

/**
 * Hook to create a new timesheet
 * Note: Timesheets are typically created by submitting time entries, not directly
 * TODO: Verify if this hook is needed or if submitTimesheet should be used instead
 */
export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (_data: CreateTimesheetRequest) => {
      throw new Error('Direct timesheet creation not supported. Use submitTimesheet instead.');
    },
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'employee', data.employeeId] });
        success('Timesheet created successfully');
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create timesheet');
    },
  });
}

/**
 * Hook to update a timesheet
 * Note: Timesheets are updated by modifying time entries, not the timesheet directly
 * TODO: Verify if this hook should update time entries instead
 */
export function useUpdateTimesheet() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (_params: { id: string; data: UpdateTimesheetRequest }) => {
      throw new Error('Direct timesheet updates not supported. Update time entries instead.');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return null as any;
    },
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'employee', data.employeeId] });
        success('Timesheet updated successfully');
      }
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
    mutationFn: async (data: SubmitTimesheetRequest) => {
      const response = await paylinq.submitTimesheet(data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
        success('Timesheet submitted successfully');
      }
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
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) => {
      const response = await paylinq.approveRejectTimesheet(id, { status, notes });
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...TIMESHEETS_KEY, 'list'] });
        success('Timesheet approved successfully');
      }
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
      return response.data || [];
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, 'list'] });
      if (data) {
        success(`Shift type "${data.shiftName}" created successfully`);
      }
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
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, 'list'] });
        success(`Shift type "${data.shiftName}" updated successfully`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update shift type');
    },
  });
}

/**
 * Hook to delete a shift type
 */
export function useDeleteShiftType() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.deleteShiftType(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...SHIFT_TYPES_KEY, 'list'] });
      success('Shift type deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete shift type');
    },
  });
}

// ============================================================================
// Attendance Events Queries & Mutations
// ============================================================================

/**
 * Hook to fetch attendance events for an employee
 * TODO: Implement when getAttendanceEvents API method is available
 */
export function useAttendanceEvents(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getTimeAttendanceEvents({ employeeId, ...params });
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to create an attendance event (clock in/out)
 * TODO: Implement when createAttendanceEvent API method is available
 */
export function useCreateAttendanceEvent() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (_data: CreateAttendanceEventRequest) => {
      // TODO: API method not yet implemented
      throw new Error('createTimeAttendanceEvent API method not yet implemented');
    },
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, 'employee', data.employeeId] });
      }
      queryClient.invalidateQueries({ queryKey: [...TIME_ENTRIES_KEY] });
      success('Attendance event recorded successfully');
    },
    onError: (err: any) => {
      error(err?.message || err?.response?.data?.message || 'Failed to record attendance event');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch pending timesheets (submitted status)
 */
export function usePendingTimesheets(params?: PaginationParams) {
  return useTimesheets({ ...params, status: 'submitted' });
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
  const pendingCount = data?.filter((t: Timesheet) => t.status === 'submitted').length || 0;
  
  return {
    hasPending: pendingCount > 0,
    count: pendingCount,
    isLoading,
  };
}
