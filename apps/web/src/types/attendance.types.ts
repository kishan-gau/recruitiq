/**
 * Attendance types matching backend hris.attendance schema
 */

import type { AuditFields } from './common.types';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';

export interface AttendanceRecord extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string; // Joined from employee table
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  clockInTime?: string; // ISO 8601 or HH:MM
  clockOutTime?: string; // ISO 8601 or HH:MM
  totalHoursWorked: number;
  notes?: string;
}

export interface CreateAttendanceRecordDTO {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  notes?: string;
}

export interface UpdateAttendanceRecordDTO extends Partial<CreateAttendanceRecordDTO> {}

export interface AttendanceFilters {
  search?: string; // Employee name search
  employeeId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: AttendanceStatus;
}

export interface AttendanceStatistics {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
}
