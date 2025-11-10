/**
 * Attendance Hooks
 * React Query hooks for attendance tracking, clock in/out, and timesheets
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import type {
  AttendanceRecord,
  CreateAttendanceRecordDTO,
  UpdateAttendanceRecordDTO,
  AttendanceFilters,
  ClockInDTO,
  ClockOutDTO,
  BreakStartDTO,
  BreakEndDTO,
  WorkSchedule,
  CreateWorkScheduleDTO,
  UpdateWorkScheduleDTO,
  WorkScheduleFilters,
  Timesheet,
  CreateTimesheetDTO,
  UpdateTimesheetDTO,
  SubmitTimesheetDTO,
  ApproveTimesheetDTO,
  RejectTimesheetDTO,
  TimesheetFilters,
  AttendanceStatistics,
  EmployeeAttendanceSummary,
  DepartmentAttendanceReport,
  AttendanceReportFilters,
} from '@/types/attendance.types';

// ============ Query Keys ============
export const attendanceKeys = {
  all: ['attendance'] as const,
  records: () => [...attendanceKeys.all, 'records'] as const,
  record: (id: string) => [...attendanceKeys.records(), id] as const,
  recordsList: (filters?: AttendanceFilters) => [...attendanceKeys.records(), 'list', filters] as const,
  today: () => [...attendanceKeys.records(), 'today'] as const,
  employeeRecords: (employeeId: string, startDate: string, endDate: string) => 
    [...attendanceKeys.records(), 'employee', employeeId, startDate, endDate] as const,
  clockStatus: (employeeId: string) => [...attendanceKeys.all, 'clock-status', employeeId] as const,
  schedules: () => [...attendanceKeys.all, 'schedules'] as const,
  schedule: (id: string) => [...attendanceKeys.schedules(), id] as const,
  schedulesList: (filters?: WorkScheduleFilters) => [...attendanceKeys.schedules(), 'list', filters] as const,
  timesheets: () => [...attendanceKeys.all, 'timesheets'] as const,
  timesheet: (id: string) => [...attendanceKeys.timesheets(), id] as const,
  timesheetsList: (filters?: TimesheetFilters) => [...attendanceKeys.timesheets(), 'list', filters] as const,
  employeeTimesheets: (employeeId: string) => [...attendanceKeys.timesheets(), 'employee', employeeId] as const,
  statistics: () => [...attendanceKeys.all, 'statistics'] as const,
  employeeSummary: (employeeId: string, startDate: string, endDate: string) => 
    [...attendanceKeys.all, 'summary', employeeId, startDate, endDate] as const,
};

// ============ Attendance Records Hooks ============

export function useAttendanceRecords(filters?: AttendanceFilters): UseQueryResult<AttendanceRecord[]> {
  return useQuery({
    queryKey: attendanceKeys.recordsList(filters),
    queryFn: () => attendanceService.listAttendanceRecords(filters) as any,
  });
}

export function useAttendanceRecord(id: string): UseQueryResult<AttendanceRecord> {
  return useQuery({
    queryKey: attendanceKeys.record(id),
    queryFn: () => attendanceService.getAttendanceRecord(id) as any,
    enabled: !!id,
  });
}

export function useTodayAttendance(): UseQueryResult<AttendanceRecord[]> {
  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: () => attendanceService.getTodayAttendance() as any,
  });
}

export function useEmployeeAttendance(employeeId: string, startDate: string, endDate: string): UseQueryResult<AttendanceRecord[]> {
  return useQuery({
    queryKey: attendanceKeys.employeeRecords(employeeId, startDate, endDate),
    queryFn: () => attendanceService.getEmployeeAttendance(employeeId, startDate, endDate) as any,
    enabled: !!employeeId && !!startDate && !!endDate,
  });
}

export function useCurrentClockStatus(employeeId: string): UseQueryResult<AttendanceRecord | null> {
  return useQuery({
    queryKey: attendanceKeys.clockStatus(employeeId),
    queryFn: () => attendanceService.getCurrentClockStatus(employeeId) as any,
    enabled: !!employeeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAttendanceRecordDTO) => attendanceService.createAttendanceRecord(data) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.statistics() });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAttendanceRecordDTO }) =>
      attendanceService.updateAttendanceRecord(id, updates) as any,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.record(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.statistics() });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteAttendanceRecord(id) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.statistics() });
    },
  });
}

// ============ Clock In/Out Hooks ============

export function useClockIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ClockInDTO) => attendanceService.clockIn(data) as any,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.clockStatus(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.statistics() });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: ClockOutDTO }) =>
      attendanceService.clockOut(recordId, data) as any,
    onSuccess: (record) => {
      if (record?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.clockStatus(record.employeeId) });
      }
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.statistics() });
    },
  });
}

export function useStartBreak() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: BreakStartDTO }) =>
      attendanceService.startBreak(recordId, data) as any,
    onSuccess: (record) => {
      if (record?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.clockStatus(record.employeeId) });
      }
      queryClient.invalidateQueries({ queryKey: attendanceKeys.record(record.id) });
    },
  });
}

export function useEndBreak() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: BreakEndDTO }) =>
      attendanceService.endBreak(recordId, data) as any,
    onSuccess: (record) => {
      if (record?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.clockStatus(record.employeeId) });
      }
      queryClient.invalidateQueries({ queryKey: attendanceKeys.record(record.id) });
    },
  });
}

// ============ Work Schedules Hooks ============

export function useWorkSchedules(filters?: WorkScheduleFilters): UseQueryResult<WorkSchedule[]> {
  return useQuery({
    queryKey: attendanceKeys.schedulesList(filters),
    queryFn: () => attendanceService.listWorkSchedules(filters) as any,
  });
}

export function useWorkSchedule(id: string): UseQueryResult<WorkSchedule> {
  return useQuery({
    queryKey: attendanceKeys.schedule(id),
    queryFn: () => attendanceService.getWorkSchedule(id) as any,
    enabled: !!id,
  });
}

export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWorkScheduleDTO) => attendanceService.createWorkSchedule(data) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.schedules() });
    },
  });
}

export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateWorkScheduleDTO }) =>
      attendanceService.updateWorkSchedule(id, updates) as any,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.schedule(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.schedules() });
    },
  });
}

export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteWorkSchedule(id) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.schedules() });
    },
  });
}

// ============ Timesheets Hooks ============

export function useTimesheets(filters?: TimesheetFilters): UseQueryResult<Timesheet[]> {
  return useQuery({
    queryKey: attendanceKeys.timesheetsList(filters),
    queryFn: () => attendanceService.listTimesheets(filters) as any,
  });
}

export function useTimesheet(id: string): UseQueryResult<Timesheet> {
  return useQuery({
    queryKey: attendanceKeys.timesheet(id),
    queryFn: () => attendanceService.getTimesheet(id) as any,
    enabled: !!id,
  });
}

export function useEmployeeTimesheets(employeeId: string): UseQueryResult<Timesheet[]> {
  return useQuery({
    queryKey: attendanceKeys.employeeTimesheets(employeeId),
    queryFn: () => attendanceService.getEmployeeTimesheets(employeeId) as any,
    enabled: !!employeeId,
  });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTimesheetDTO) => attendanceService.createTimesheet(data) as any,
    onSuccess: (timesheet) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
      if (timesheet?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.employeeTimesheets(timesheet.employeeId) });
      }
    },
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTimesheetDTO }) =>
      attendanceService.updateTimesheet(id, updates) as any,
    onSuccess: (timesheet, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
      if (timesheet?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.employeeTimesheets(timesheet.employeeId) });
      }
    },
  });
}

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmitTimesheetDTO }) =>
      attendanceService.submitTimesheet(id, data) as any,
    onSuccess: (timesheet, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
      if (timesheet?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.employeeTimesheets(timesheet.employeeId) });
      }
    },
  });
}

export function useApproveTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveTimesheetDTO }) =>
      attendanceService.approveTimesheet(id, data) as any,
    onSuccess: (timesheet, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
      if (timesheet?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.employeeTimesheets(timesheet.employeeId) });
      }
    },
  });
}

export function useRejectTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectTimesheetDTO }) =>
      attendanceService.rejectTimesheet(id, data) as any,
    onSuccess: (timesheet, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
      if (timesheet?.employeeId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.employeeTimesheets(timesheet.employeeId) });
      }
    },
  });
}

export function useDeleteTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteTimesheet(id) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timesheets() });
    },
  });
}

// ============ Statistics & Reports Hooks ============

export function useAttendanceStatistics(): UseQueryResult<AttendanceStatistics> {
  return useQuery({
    queryKey: attendanceKeys.statistics(),
    queryFn: () => attendanceService.getAttendanceStatistics() as any,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useEmployeeAttendanceSummary(
  employeeId: string,
  startDate: string,
  endDate: string
): UseQueryResult<EmployeeAttendanceSummary> {
  return useQuery({
    queryKey: attendanceKeys.employeeSummary(employeeId, startDate, endDate),
    queryFn: () => attendanceService.getEmployeeAttendanceSummary(employeeId, startDate, endDate) as any,
    enabled: !!employeeId && !!startDate && !!endDate,
  });
}

export function useGenerateAttendanceReport() {
  return useMutation({
    mutationFn: (filters: AttendanceReportFilters) => attendanceService.generateAttendanceReport(filters) as any,
  });
}

export function useGenerateDepartmentReport() {
  return useMutation({
    mutationFn: (filters: AttendanceReportFilters) => attendanceService.getDepartmentAttendanceReport(filters) as any,
  });
}
