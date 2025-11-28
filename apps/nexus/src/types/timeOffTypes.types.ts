/**
 * Time-Off Type Management Types
 * TypeScript definitions for time-off types and accrual management
 */

export type AccrualFrequency = 'monthly' | 'quarterly' | 'annually' | 'per_pay_period' | 'on_anniversary';
export type CarryOverPolicy = 'none' | 'all' | 'limited' | 'use_or_lose';

/**
 * Time-Off Type Configuration
 */
export interface TimeOffTypeConfig {
  id: string;
  organizationId: string;
  
  // Type Details
  typeName: string;
  typeCode: string;
  description?: string;
  color?: string; // For calendar display
  icon?: string;
  
  // Accrual Settings
  accrualEnabled: boolean;
  accrualFrequency?: AccrualFrequency;
  accrualRate?: number; // Days per period
  
  // Balance Settings
  maxBalance?: number; // Maximum days that can be accumulated
  minBalance?: number; // Minimum balance (e.g., for negative sick leave)
  
  // Carryover Settings
  carryOverPolicy: CarryOverPolicy;
  maxCarryOverDays?: number; // Only if carryOverPolicy is 'limited'
  
  // Approval Requirements
  requiresApproval: boolean;
  requiresDocumentation: boolean; // e.g., sick leave may require doctor's note
  
  // Probation Rules
  availableDuringProbation: boolean;
  probationWaitingPeriodDays?: number;
  
  // Usage Rules
  minRequestDays?: number; // Minimum days that can be requested
  maxRequestDays?: number; // Maximum consecutive days
  advanceNoticeDays?: number; // How many days advance notice required
  
  // Status
  isActive: boolean;
  isPaid: boolean; // Whether this is paid time off
  isUnlimited: boolean; // Unlimited PTO policy
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * DTO for creating time-off type
 */
export interface CreateTimeOffTypeDTO {
  typeName: string;
  typeCode: string;
  description?: string;
  color?: string;
  icon?: string;
  
  accrualEnabled: boolean;
  accrualFrequency?: AccrualFrequency;
  accrualRate?: number;
  
  maxBalance?: number;
  minBalance?: number;
  
  carryOverPolicy: CarryOverPolicy;
  maxCarryOverDays?: number;
  
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  
  availableDuringProbation: boolean;
  probationWaitingPeriodDays?: number;
  
  minRequestDays?: number;
  maxRequestDays?: number;
  advanceNoticeDays?: number;
  
  isPaid: boolean;
  isUnlimited: boolean;
}

/**
 * DTO for updating time-off type
 */
export interface UpdateTimeOffTypeDTO extends Partial<CreateTimeOffTypeDTO> {
  isActive?: boolean;
}

/**
 * Accrual Transaction
 */
export interface AccrualTransaction {
  id: string;
  organizationId: string;
  employeeId: string;
  timeOffTypeId: string;
  
  // Transaction Details
  transactionType: 'accrual' | 'manual_adjustment' | 'carryover' | 'usage' | 'expiration';
  daysChanged: number; // Positive for accrual, negative for usage
  balanceAfter: number;
  
  // Context
  accrualPeriod?: string; // e.g., '2025-01', 'Q1-2025'
  notes?: string;
  
  // Audit
  createdAt: string;
  createdBy?: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  timeOffType?: {
    id: string;
    typeName: string;
    typeCode: string;
  };
}

/**
 * DTO for accruing time-off
 */
export interface AccrueTimeOffDTO {
  employeeId: string;
  timeOffTypeId: string;
  daysAccrued: number;
  accrualPeriod?: string;
  notes?: string;
}

/**
 * Accrual Preview (for testing accrual calculations)
 */
export interface AccrualPreview {
  employeeId: string;
  timeOffTypeId: string;
  currentBalance: number;
  daysToAccrue: number;
  projectedBalance: number;
  willExceedMax: boolean;
  maxBalance?: number;
}

/**
 * Filters for time-off types
 */
export interface TimeOffTypeFilters {
  isActive?: boolean;
  accrualEnabled?: boolean;
  requiresApproval?: boolean;
  isPaid?: boolean;
  search?: string;
}

/**
 * Summary stats for time-off type usage
 */
export interface TimeOffTypeStats {
  typeId: string;
  typeName: string;
  totalEmployees: number;
  averageBalance: number;
  totalAccrued: number;
  totalUsed: number;
  totalPending: number;
  year: number;
}
