/**
 * Attendance Module Type Definitions
 * Types for attendance records, clock in/out, timesheets, and schedules
 */

// ============ Attendance Types ============

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
export type ClockStatus = 'clocked-in' | 'clocked-out' | 'on-break';
export type ShiftType = 'regular' | 'overtime' | 'night' | 'weekend' | 'holiday';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// ============ Attendance Record ============

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  
  // Employee Information
  employeeId: string;
  date: string; // YYYY-MM-DD
  
  // Attendance Details
  status: AttendanceStatus;
  clockStatus: ClockStatus;
  
  // Time Tracking
  clockInTime?: string; // ISO 8601
  clockOutTime?: string; // ISO 8601
  breakStartTime?: string;
  breakEndTime?: string;
  totalBreakMinutes: number;
  
  // Calculated Fields
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  totalHoursWorked: number;
  overtimeHours: number;
  
  // Location & Device
  clockInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  clockOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deviceInfo?: string;
  ipAddress?: string;
  
  // Notes & Approval
  notes?: string;
  managerNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    department?: {
      id: string;
      name: string;
    };
  };
}

// ============ Clock In/Out DTOs ============

export interface ClockInDTO {
  employeeId: string;
  clockInTime: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deviceInfo?: string;
  notes?: string;
}

export interface ClockOutDTO {
  clockOutTime: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
}

export interface BreakStartDTO {
  breakStartTime: string;
}

export interface BreakEndDTO {
  breakEndTime: string;
}

// ============ Attendance Management DTOs ============

export interface CreateAttendanceRecordDTO {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  breakDuration?: number;
  totalHoursWorked?: number;
  notes?: string;
  reason?: string;
  isManualEntry?: boolean;
}

export interface UpdateAttendanceRecordDTO {
  status?: AttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  totalBreakMinutes?: number;
  notes?: string;
  managerNotes?: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  departmentId?: string;
  status?: AttendanceStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  clockStatus?: ClockStatus;
}

// ============ Work Schedule ============

export interface WorkSchedule {
  id: string;
  organizationId: string;
  
  // Schedule Details
  name: string;
  description?: string;
  
  // Time Settings
  workDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakDuration: number; // minutes
  
  // Shift Type
  shiftType: ShiftType;
  
  // Grace Periods
  lateGraceMinutes: number; // minutes allowed before marked late
  earlyLeaveGraceMinutes: number;
  
  // Status
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateWorkScheduleDTO {
  name: string;
  description?: string;
  workDays: number[];
  startTime: string;
  endTime: string;
  breakDuration: number;
  shiftType: ShiftType;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateWorkScheduleDTO {
  name?: string;
  description?: string;
  workDays?: number[];
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  shiftType?: ShiftType;
  lateGraceMinutes?: number;
  earlyLeaveGraceMinutes?: number;
  isActive?: boolean;
  effectiveTo?: string;
}

export interface WorkScheduleFilters {
  shiftType?: ShiftType;
  isActive?: boolean;
}

// ============ Timesheet ============

export interface Timesheet {
  id: string;
  organizationId: string;
  
  // Timesheet Details
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  
  // Hours Summary
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalBreakHours: number;
  totalHours: number;
  
  // Status & Approval
  status: TimesheetStatus;
  submittedAt?: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Attendance Records
  attendanceRecordIds: string[]; // IDs of attendance records
  
  // Notes
  employeeNotes?: string;
  managerNotes?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    department?: {
      id: string;
      name: string;
    };
  };
  attendanceRecords?: AttendanceRecord[];
}

export interface CreateTimesheetDTO {
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  attendanceRecordIds: string[];
  employeeNotes?: string;
}

export interface UpdateTimesheetDTO {
  attendanceRecordIds?: string[];
  employeeNotes?: string;
}

export interface SubmitTimesheetDTO {
  employeeNotes?: string;
}

export interface ApproveTimesheetDTO {
  managerNotes?: string;
}

export interface RejectTimesheetDTO {
  rejectionReason: string;
  managerNotes?: string;
}

export interface TimesheetFilters {
  employeeId?: string;
  departmentId?: string;
  status?: TimesheetStatus;
  weekStartDate?: string;
  weekEndDate?: string;
}

// ============ Statistics & Reports ============

export interface AttendanceStatistics {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  clockedIn: number;
  clockedOut: number;
  onBreak: number;
  attendanceRate: number; // percentage
  punctualityRate: number; // percentage
  averageHoursWorked: number;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  totalHoursWorked: number;
  averageHoursPerDay: number;
  attendanceRate: number; // percentage
  punctualityRate: number; // percentage
}

export interface DepartmentAttendanceReport {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  averageAttendanceRate: number;
  averagePunctualityRate: number;
  totalHoursWorked: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  departmentIds?: string[];
  status?: AttendanceStatus[];
}
