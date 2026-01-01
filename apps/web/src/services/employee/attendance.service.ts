/**
 * Attendance Service
 * Handles employee attendance and time tracking records
 * 
 * Features:
 * - View attendance history
 * - Track clock-in/out times
 * - View attendance statistics
 * - Request attendance corrections
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Types
export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakDuration?: number;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'early_departure' | 'on_leave';
  location?: string;
  notes?: string;
  approvedBy?: string;
  hasCorrection: boolean;
}

export interface AttendanceSummary {
  period: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  totalHours: number;
  averageHoursPerDay: number;
  attendanceRate: number;
}

export interface TimeOffRequest {
  id: string;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  response?: string;
}

export interface AttendanceCorrection {
  id: string;
  date: string;
  field: 'clock_in' | 'clock_out' | 'break_duration';
  currentValue?: string;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

/**
 * Attendance Service
 * Provides methods for attendance and time tracking
 */
export const attendanceService = {
  /**
   * Lists attendance records for a date range
   */
  async listAttendanceRecords(params: {
    startDate: string;
    endDate: string;
  }): Promise<AttendanceRecord[]> {
    const response = await nexusClient.listAttendanceRecords(params);
    return response.data.records || response.data;
  },

  /**
   * Gets attendance summary for a period
   */
  async getAttendanceSummary(params: {
    startDate: string;
    endDate: string;
  }): Promise<AttendanceSummary> {
    const response = await nexusClient.getAttendanceStatistics(params);
    return response.data.summary || response.data;
  },

  /**
   * Gets monthly attendance calendar
   */
  async getMonthlyAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    return this.listAttendanceRecords({ startDate, endDate });
  },

  /**
   * Lists time-off requests
   */
  async listTimeOffRequests(params?: {
    status?: string;
    year?: number;
  }): Promise<TimeOffRequest[]> {
    const response = await nexusClient.listTimeOffRequests(params);
    return response.data.requests || response.data;
  },

  /**
   * Creates a time-off request
   */
  async requestTimeOff(request: Omit<TimeOffRequest, 'id' | 'status' | 'requestedAt'>): Promise<TimeOffRequest> {
    const response = await nexusClient.createTimeOffRequest(request);
    return response.data.request || response.data;
  },

  /**
   * Lists attendance correction requests
   */
  async listCorrectionRequests(): Promise<AttendanceCorrection[]> {
    const response = await nexusClient.listAttendanceCorrectionRequests();
    return response.data.corrections || response.data;
  },

  /**
   * Requests an attendance correction
   */
  async requestCorrection(correction: Omit<AttendanceCorrection, 'id' | 'status' | 'requestedAt'>): Promise<AttendanceCorrection> {
    const response = await nexusClient.createAttendanceCorrectionRequest(correction);
    return response.data.correction || response.data;
  },

  /**
   * Gets attendance statistics for year-to-date
   */
  async getYTDStatistics(): Promise<AttendanceSummary> {
    const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    return this.getAttendanceSummary({ startDate, endDate });
  },
};
