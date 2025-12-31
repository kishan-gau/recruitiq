/**
 * Time Off Types - Re-exports from main types
 * This file provides backward compatibility for components that import from feature-specific types
 */

export type {
  TimeOffType,
  TimeOffStatus,
  TimeOffRequest,
  CreateTimeOffRequestDTO,
  UpdateTimeOffRequestDTO,
  TimeOffBalance,
  TimeOffFilters,
} from '../../../types/timeoff.types';

// Admin configuration types for managing time off types
export type AccrualFrequency = 
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'per_pay_period';

export type CarryOverPolicy = 
  | 'none'
  | 'unlimited'
  | 'limited'
  | 'expire_end_of_year';

export interface TimeOffTypeConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  requiresApproval: boolean;
  allowsNegativeBalance: boolean;
  accrualEnabled: boolean;
  accrualFrequency?: AccrualFrequency;
  accrualRate?: number;
  maxAccrualBalance?: number;
  carryOverPolicy: CarryOverPolicy;
  maxCarryOverDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeOffTypeDTO {
  name: string;
  code: string;
  description?: string;
  color?: string;
  requiresApproval: boolean;
  allowsNegativeBalance: boolean;
  accrualEnabled: boolean;
  accrualFrequency?: AccrualFrequency;
  accrualRate?: number;
  maxAccrualBalance?: number;
  carryOverPolicy: CarryOverPolicy;
  maxCarryOverDays?: number;
}
