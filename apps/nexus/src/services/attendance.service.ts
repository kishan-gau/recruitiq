/**
 * Attendance Service
 * API service for attendance tracking, clock in/out, and timesheets
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
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

// Create singleton instance for service-level usage
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Permission metadata for RBAC
export const attendanceServicePermissions = {
  view: 'nexus.attendance.view',
  create: 'nexus.attendance.create',
  update: 'nexus.attendance.update',
  approve: 'nexus.attendance.approve',
  export: 'nexus.reports.export',
};

export const attendanceService = {
  // ============ Attendance Records ============
  
  async listAttendanceRecords(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    const response = await nexusClient.listAttendanceRecords(filters);
    return response.data;
  },

  async getAttendanceRecord(id: string): Promise<AttendanceRecord> {
    const response = await nexusClient.getAttendanceRecord(id);
    return response.data;
  },

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const response = await nexusClient.getEmployeeAttendance(employeeId, startDate, endDate);
    return response.data;
  },

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const response = await nexusClient.getTodayAttendance();
    return response.data;
  },

  async createAttendanceRecord(data: CreateAttendanceRecordDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.createAttendanceRecord(data);
    return response.data;
  },

  async updateAttendanceRecord(id: string, updates: UpdateAttendanceRecordDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.updateAttendanceRecord(id, updates);
    return response.data;
  },

  async deleteAttendanceRecord(id: string): Promise<void> {
    await nexusClient.deleteAttendanceRecord(id);
  },

  // ============ Clock In/Out Operations ============
  
  async clockIn(data: ClockInDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.clockIn(data);
    return response.data;
  },

  async clockOut(recordId: string, data: ClockOutDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.clockOut(recordId, data);
    return response.data;
  },

  async startBreak(recordId: string, data: BreakStartDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.startBreak(recordId, data);
    return response.data;
  },

  async endBreak(recordId: string, data: BreakEndDTO): Promise<AttendanceRecord> {
    const response = await nexusClient.endBreak(recordId, data);
    return response.data;
  },

  async getCurrentClockStatus(employeeId: string): Promise<AttendanceRecord | null> {
    const response = await nexusClient.getCurrentClockStatus(employeeId);
    return response.data;
  },

  // ============ Work Schedules ============
  
  async listWorkSchedules(filters?: WorkScheduleFilters): Promise<WorkSchedule[]> {
    const response = await nexusClient.listWorkSchedules(filters);
    return response.data;
  },

  async getWorkSchedule(id: string): Promise<WorkSchedule> {
    const response = await nexusClient.getWorkSchedule(id);
    return response.data;
  },

  async createWorkSchedule(data: CreateWorkScheduleDTO): Promise<WorkSchedule> {
    const response = await nexusClient.createWorkSchedule(data);
    return response.data;
  },

  async updateWorkSchedule(id: string, updates: UpdateWorkScheduleDTO): Promise<WorkSchedule> {
    const response = await nexusClient.updateWorkSchedule(id, updates);
    return response.data;
  },

  async deleteWorkSchedule(id: string): Promise<void> {
    await nexusClient.deleteWorkSchedule(id);
  },

  // ============ Timesheets ============
  
  async listTimesheets(filters?: TimesheetFilters): Promise<Timesheet[]> {
    const response = await nexusClient.listTimesheets(filters);
    return response.data;
  },

  async getTimesheet(id: string): Promise<Timesheet> {
    const response = await nexusClient.getTimesheet(id);
    return response.data;
  },

  async getEmployeeTimesheets(employeeId: string): Promise<Timesheet[]> {
    const response = await nexusClient.getEmployeeTimesheets(employeeId);
    return response.data;
  },

  async createTimesheet(data: CreateTimesheetDTO): Promise<Timesheet> {
    const response = await nexusClient.createTimesheet(data);
    return response.data;
  },

  async updateTimesheet(id: string, updates: UpdateTimesheetDTO): Promise<Timesheet> {
    const response = await nexusClient.updateTimesheet(id, updates);
    return response.data;
  },

  async submitTimesheet(id: string, data: SubmitTimesheetDTO): Promise<Timesheet> {
    const response = await nexusClient.submitTimesheet(id, data);
    return response.data;
  },

  async approveTimesheet(id: string, data: ApproveTimesheetDTO): Promise<Timesheet> {
    const response = await nexusClient.approveTimesheet(id, data);
    return response.data;
  },

  async rejectTimesheet(id: string, data: RejectTimesheetDTO): Promise<Timesheet> {
    const response = await nexusClient.rejectTimesheet(id, data);
    return response.data;
  },

  async deleteTimesheet(id: string): Promise<void> {
    await nexusClient.deleteTimesheet(id);
  },

  // ============ Statistics & Reports ============
  
  async getAttendanceStatistics(): Promise<AttendanceStatistics> {
    const response = await nexusClient.getAttendanceStatistics();
    return response.data;
  },

  async getEmployeeAttendanceSummary(employeeId: string, startDate: string, endDate: string): Promise<EmployeeAttendanceSummary> {
    const response = await nexusClient.getEmployeeAttendanceSummary(employeeId, startDate, endDate);
    return response.data;
  },

  async getDepartmentAttendanceReport(filters: AttendanceReportFilters): Promise<DepartmentAttendanceReport[]> {
    const response = await nexusClient.getDepartmentAttendanceReport(filters);
    return response.data;
  },

  async generateAttendanceReport(filters: AttendanceReportFilters): Promise<EmployeeAttendanceSummary[]> {
    const response = await nexusClient.generateAttendanceReport(filters);
    return response.data;
  },
};
