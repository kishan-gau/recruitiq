/**
 * Time Off Types
 * TypeScript definitions for time-off requests and balances
 */

export type TimeOffRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid';

/**
 * Time Off Request interface
 */
export interface TimeOffRequest {
  id: string;
  organizationId: string;
  employeeId: string;
  timeOffType: TimeOffType;
  status: TimeOffRequestStatus;
  
  // Request Details
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  
  // Approval Details
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
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
    departmentId?: string;
    department?: {
      id: string;
      departmentName: string;
    };
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Time Off Balance interface
 */
export interface TimeOffBalance {
  id: string;
  organizationId: string;
  employeeId: string;
  year: number;
  timeOffType: TimeOffType;
  
  // Balance Details
  totalAllowance: number;
  used: number;
  pending: number;
  available: number;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
}

/**
 * Time Off Policy interface
 */
export interface TimeOffPolicy {
  id: string;
  organizationId: string;
  policyName: string;
  timeOffType: TimeOffType;
  defaultAllowanceDays: number;
  carryOverDays?: number;
  requiresApproval: boolean;
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a time-off request
 */
export interface CreateTimeOffRequestDTO {
  employeeId: string;
  timeOffType: TimeOffType;
  startDate: string;
  endDate: string;
  reason?: string;
}

/**
 * DTO for updating a time-off request
 */
export interface UpdateTimeOffRequestDTO {
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: TimeOffRequestStatus;
}

/**
 * DTO for approving/rejecting a request
 */
export interface ReviewTimeOffRequestDTO {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

/**
 * Time off request filters
 */
export interface TimeOffRequestFilters {
  employeeId?: string;
  status?: TimeOffRequestStatus;
  timeOffType?: TimeOffType;
  startDate?: string;
  endDate?: string;
}

/**
 * Calendar event for time off
 */
export interface TimeOffCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  employee: {
    firstName: string;
    lastName: string;
  };
  type: TimeOffType;
  status: TimeOffRequestStatus;
}
