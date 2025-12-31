/**
 * Time Off types matching backend HRIS time-off schema
 */

import type { AuditFields } from './common.types';

// Re-export ApiError for backward compatibility
export type { ApiError } from './api.types';

export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TimeOffType = 
  | 'vacation' 
  | 'sick' 
  | 'personal' 
  | 'unpaid' 
  | 'bereavement' 
  | 'maternity' 
  | 'paternity' 
  | 'other';

export interface TimeOffRequest extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string; // For UI display
  timeOffType: TimeOffType;
  type: string; // Alias for timeOffType for backward compatibility
  startDate: string;
  endDate: string;
  totalDays: number;
  days: number; // Alias for totalDays for backward compatibility
  status: TimeOffStatus;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface CreateTimeOffRequestDTO {
  employeeId: string;
  timeOffType: TimeOffType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateTimeOffRequestDTO extends Partial<CreateTimeOffRequestDTO> {
  status?: TimeOffStatus;
  reviewNotes?: string;
}

export interface TimeOffBalance {
  id: string;
  organizationId: string;
  employeeId: string;
  timeOffType: TimeOffType;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
}

export interface TimeOffFilters {
  employeeId?: string;
  status?: TimeOffStatus;
  timeOffType?: TimeOffType;
  startDate?: string;
  endDate?: string;
}
