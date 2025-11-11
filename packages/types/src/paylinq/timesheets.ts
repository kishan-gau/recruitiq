/**
 * Time & Attendance Type Definitions
 * Aligns with backend schema: payroll.shift_type, payroll.time_attendance_event, payroll.time_entry, payroll.timesheet
 */

import { BaseEntity, Status } from './common';

/**
 * Shift Type
 * Backend table: payroll.shift_type
 */
export interface ShiftType extends BaseEntity {
  shiftName: string;
  shiftCode: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  durationHours: number;
  isOvernight: boolean; // Shift crosses midnight
  
  // Break configuration
  breakDurationMinutes: number;
  isPaidBreak: boolean;
  
  // Shift differential
  shiftDifferentialRate: number; // Percentage or fixed amount
  
  description?: string;
  status: Status;
}

/**
 * Event Type
 */
export type EventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

/**
 * Time Attendance Event
 * Backend table: payroll.time_attendance_event
 */
export interface TimeAttendanceEvent extends BaseEntity {
  employeeId: string;
  
  // Event details
  eventType: EventType;
  eventTimestamp: string; // ISO datetime
  
  // Location tracking
  locationId?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  deviceId?: string;
  ipAddress?: string;
  
  notes?: string;
  
  // Populated fields
  employeeName?: string;
}

/**
 * Entry Type
 */
export type EntryType = 'regular' | 'overtime' | 'pto' | 'sick' | 'holiday' | 'unpaid';

/**
 * Entry Status
 */
export type EntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

/**
 * Time Entry
 * Backend table: payroll.time_entry
 */
export interface TimeEntry extends BaseEntity {
  employeeId: string;
  
  // Time entry details
  entryDate: string; // ISO date
  clockIn?: string; // ISO datetime
  clockOut?: string; // ISO datetime
  
  // Hours breakdown
  workedHours: number;
  regularHours: number;
  overtimeHours: number;
  breakHours: number;
  
  // Shift association
  shiftTypeId?: string;
  
  // Entry metadata
  entryType: EntryType;
  status: EntryStatus;
  notes?: string;
  
  // Approval tracking
  approvedBy?: string;
  approvedAt?: string; // ISO datetime
  
  // Link to clock events
  clockInEventId?: string;
  clockOutEventId?: string;
  
  // Populated fields
  employeeName?: string;
  shiftName?: string;
}

/**
 * Timesheet
 * Backend table: payroll.timesheet
 */
export interface Timesheet extends BaseEntity {
  employeeId: string;
  
  // Period covered
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  
  // Hours summary
  regularHours: number;
  overtimeHours: number;
  ptoHours: number;
  sickHours: number;
  
  // Status tracking
  status: EntryStatus;
  notes?: string;
  
  // Approval tracking
  approvedBy?: string;
  approvedAt?: string; // ISO datetime
  rejectedBy?: string;
  rejectedAt?: string; // ISO datetime
  
  // Populated fields
  employeeName?: string;
  timeEntries?: TimeEntry[];
}

/**
 * Create Shift Type Request
 */
export interface CreateShiftTypeRequest {
  shiftName: string;
  shiftCode: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  isOvernight?: boolean;
  breakDurationMinutes?: number;
  isPaidBreak?: boolean;
  shiftDifferentialRate?: number;
  description?: string;
  status?: Status;
}

/**
 * Update Shift Type Request
 */
export interface UpdateShiftTypeRequest {
  shiftName?: string;
  shiftCode?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  isOvernight?: boolean;
  breakDurationMinutes?: number;
  isPaidBreak?: boolean;
  shiftDifferentialRate?: number;
  description?: string;
  status?: Status;
}

/**
 * Create Time Entry Request
 */
export interface CreateTimeEntryRequest {
  employeeId: string;
  entryDate: string; // ISO date
  clockIn?: string; // ISO datetime
  clockOut?: string; // ISO datetime
  workedHours: number;
  regularHours?: number;
  overtimeHours?: number;
  breakHours?: number;
  shiftTypeId?: string;
  entryType?: EntryType;
  notes?: string;
  clockInEventId?: string;
  clockOutEventId?: string;
}

/**
 * Update Time Entry Request
 */
export interface UpdateTimeEntryRequest {
  clockIn?: string;
  clockOut?: string;
  workedHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  breakHours?: number;
  shiftTypeId?: string;
  entryType?: EntryType;
  status?: EntryStatus;
  notes?: string;
}

/**
 * Submit Timesheet Request
 */
export interface SubmitTimesheetRequest {
  employeeId: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  timeEntryIds: string[];
  notes?: string;
}

/**
 * Approve/Reject Timesheet Request
 */
export interface TimesheetApprovalRequest {
  status: 'approved' | 'rejected';
  notes?: string;
}

/**
 * Time Entry Filters
 */
export interface TimeEntryFilters {
  employeeId?: string;
  entryDate?: string;
  periodStart?: string;
  periodEnd?: string;
  entryType?: EntryType;
  status?: EntryStatus;
  shiftTypeId?: string;
}

/**
 * Timesheet Filters
 */
export interface TimesheetFilters {
  employeeId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: EntryStatus;
}

/**
 * Hours Summary
 */
export interface HoursSummary {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  ptoHours: number;
  sickHours: number;
  totalHours: number;
  daysWorked: number;
}

/**
 * API Response Types for Timesheets & Time Tracking
 * Following API standards: resource-specific keys, not generic "data"
 */

/** Single shift type response: { success, shiftType: {...} } */
export interface ShiftTypeResponse {
  success: boolean;
  shiftType: ShiftType;
  message?: string;
}

/** List of shift types response: { success, shiftTypes: [...], count } */
export interface ShiftTypesListResponse {
  success: boolean;
  shiftTypes: ShiftType[];
  count: number;
}

/** Single time entry response: { success, timeEntry: {...} } */
export interface TimeEntryResponse {
  success: boolean;
  timeEntry: TimeEntry;
  message?: string;
}

/** List of time entries response: { success, timeEntries: [...], count } */
export interface TimeEntriesListResponse {
  success: boolean;
  timeEntries: TimeEntry[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Single timesheet response: { success, timesheet: {...} } */
export interface TimesheetResponse {
  success: boolean;
  timesheet: Timesheet;
  message?: string;
}

/** List of timesheets response: { success, timesheets: [...], count } */
export interface TimesheetsListResponse {
  success: boolean;
  timesheets: Timesheet[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Hours summary response: { success, summary: {...} } */
export interface HoursSummaryResponse {
  success: boolean;
  summary: HoursSummary;
}
