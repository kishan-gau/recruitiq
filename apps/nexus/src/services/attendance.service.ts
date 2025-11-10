/**
 * Attendance Service
 * API service for attendance tracking, clock in/out, and timesheets
 */

import { apiClient } from './api';
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

export const attendanceService = {
  // ============ Attendance Records ============
  
  async listAttendanceRecords(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.clockStatus) params.append('clockStatus', filters.clockStatus);
    
    const queryString = params.toString();
    return apiClient.get(`/attendance/records${queryString ? `?${queryString}` : ''}`);
  },

  async getAttendanceRecord(id: string): Promise<AttendanceRecord> {
    return apiClient.get(`/attendance/records/${id}`);
  },

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return apiClient.get(`/attendance/records/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`);
  },

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    return apiClient.get('/attendance/records/today');
  },

  async createAttendanceRecord(data: CreateAttendanceRecordDTO): Promise<AttendanceRecord> {
    return apiClient.post('/attendance/records', data);
  },

  async updateAttendanceRecord(id: string, updates: UpdateAttendanceRecordDTO): Promise<AttendanceRecord> {
    return apiClient.put(`/attendance/records/${id}`, updates);
  },

  async deleteAttendanceRecord(id: string): Promise<void> {
    return apiClient.delete(`/attendance/records/${id}`);
  },

  // ============ Clock In/Out Operations ============
  
  async clockIn(data: ClockInDTO): Promise<AttendanceRecord> {
    return apiClient.post('/attendance/clock-in', data);
  },

  async clockOut(recordId: string, data: ClockOutDTO): Promise<AttendanceRecord> {
    return apiClient.post(`/attendance/records/${recordId}/clock-out`, data);
  },

  async startBreak(recordId: string, data: BreakStartDTO): Promise<AttendanceRecord> {
    return apiClient.post(`/attendance/records/${recordId}/break-start`, data);
  },

  async endBreak(recordId: string, data: BreakEndDTO): Promise<AttendanceRecord> {
    return apiClient.post(`/attendance/records/${recordId}/break-end`, data);
  },

  async getCurrentClockStatus(employeeId: string): Promise<AttendanceRecord | null> {
    return apiClient.get(`/attendance/clock-status/${employeeId}`);
  },

  // ============ Work Schedules ============
  
  async listWorkSchedules(filters?: WorkScheduleFilters): Promise<WorkSchedule[]> {
    const params = new URLSearchParams();
    if (filters?.shiftType) params.append('shiftType', filters.shiftType);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    
    const queryString = params.toString();
    return apiClient.get(`/attendance/schedules${queryString ? `?${queryString}` : ''}`);
  },

  async getWorkSchedule(id: string): Promise<WorkSchedule> {
    return apiClient.get(`/attendance/schedules/${id}`);
  },

  async createWorkSchedule(data: CreateWorkScheduleDTO): Promise<WorkSchedule> {
    return apiClient.post('/attendance/schedules', data);
  },

  async updateWorkSchedule(id: string, updates: UpdateWorkScheduleDTO): Promise<WorkSchedule> {
    return apiClient.put(`/attendance/schedules/${id}`, updates);
  },

  async deleteWorkSchedule(id: string): Promise<void> {
    return apiClient.delete(`/attendance/schedules/${id}`);
  },

  // ============ Timesheets ============
  
  async listTimesheets(filters?: TimesheetFilters): Promise<Timesheet[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.weekStartDate) params.append('weekStartDate', filters.weekStartDate);
    if (filters?.weekEndDate) params.append('weekEndDate', filters.weekEndDate);
    
    const queryString = params.toString();
    return apiClient.get(`/attendance/timesheets${queryString ? `?${queryString}` : ''}`);
  },

  async getTimesheet(id: string): Promise<Timesheet> {
    return apiClient.get(`/attendance/timesheets/${id}`);
  },

  async getEmployeeTimesheets(employeeId: string): Promise<Timesheet[]> {
    return apiClient.get(`/attendance/timesheets/employee/${employeeId}`);
  },

  async createTimesheet(data: CreateTimesheetDTO): Promise<Timesheet> {
    return apiClient.post('/attendance/timesheets', data);
  },

  async updateTimesheet(id: string, updates: UpdateTimesheetDTO): Promise<Timesheet> {
    return apiClient.put(`/attendance/timesheets/${id}`, updates);
  },

  async submitTimesheet(id: string, data: SubmitTimesheetDTO): Promise<Timesheet> {
    return apiClient.post(`/attendance/timesheets/${id}/submit`, data);
  },

  async approveTimesheet(id: string, data: ApproveTimesheetDTO): Promise<Timesheet> {
    return apiClient.post(`/attendance/timesheets/${id}/approve`, data);
  },

  async rejectTimesheet(id: string, data: RejectTimesheetDTO): Promise<Timesheet> {
    return apiClient.post(`/attendance/timesheets/${id}/reject`, data);
  },

  async deleteTimesheet(id: string): Promise<void> {
    return apiClient.delete(`/attendance/timesheets/${id}`);
  },

  // ============ Statistics & Reports ============
  
  async getAttendanceStatistics(): Promise<AttendanceStatistics> {
    return apiClient.get('/attendance/statistics');
  },

  async getEmployeeAttendanceSummary(employeeId: string, startDate: string, endDate: string): Promise<EmployeeAttendanceSummary> {
    return apiClient.get(`/attendance/summary/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`);
  },

  async getDepartmentAttendanceReport(filters: AttendanceReportFilters): Promise<DepartmentAttendanceReport[]> {
    return apiClient.post('/attendance/reports/department', filters);
  },

  async generateAttendanceReport(filters: AttendanceReportFilters): Promise<EmployeeAttendanceSummary[]> {
    return apiClient.post('/attendance/reports/generate', filters);
  },
};
