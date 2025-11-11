/**
 * Compensation Type Definitions
 * Aligns with backend schema: payroll.compensation
 */

import { BaseEntity, Currency } from './common';

/**
 * Compensation Type
 */
export type CompensationType = 'hourly' | 'salary' | 'commission' | 'bonus';

/**
 * Compensation Record
 * Backend table: payroll.compensation
 */
export interface Compensation extends BaseEntity {
  employeeId: string;
  
  // Compensation details
  compensationType: CompensationType;
  amount: number; // Primary amount
  hourlyRate?: number; // For hourly workers
  overtimeRate?: number; // Overtime multiplier (e.g., 1.5)
  payPeriodAmount?: number; // Amount per pay period
  annualAmount?: number; // Annual salary equivalent
  
  // Effective dates
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  isCurrent: boolean;
  currency: Currency;
  
  // Populated fields
  employeeName?: string;
  workerTypeName?: string;
}

/**
 * Create Compensation Request
 */
export interface CreateCompensationRequest {
  employeeId: string;
  compensationType: CompensationType;
  amount: number;
  hourlyRate?: number;
  overtimeRate?: number;
  payPeriodAmount?: number;
  annualAmount?: number;
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  currency?: Currency;
}

/**
 * Update Compensation Request
 */
export interface UpdateCompensationRequest {
  compensationType?: CompensationType;
  amount?: number;
  hourlyRate?: number;
  overtimeRate?: number;
  payPeriodAmount?: number;
  annualAmount?: number;
  effectiveTo?: string; // ISO date
  currency?: Currency;
}

/**
 * Compensation History Entry
 */
export interface CompensationHistoryEntry extends Compensation {
  changeReason?: string;
  changePercentage?: number;
  previousAmount?: number;
}

/**
 * Compensation Summary
 */
export interface CompensationSummary {
  employeeId: string;
  currentCompensation?: Compensation;
  historyCount: number;
  totalYearsOfService: number;
  averageAnnualIncrease?: number;
}

/**
 * Compensation Filters
 */
export interface CompensationFilters {
  employeeId?: string;
  compensationType?: CompensationType;
  isCurrent?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

/**
 * API Response Types for Compensation
 * Following API standards: resource-specific keys, not generic "data"
 */

/** Single compensation response: { success, compensation: {...} } */
export interface CompensationResponse {
  success: boolean;
  compensation: Compensation;
  message?: string;
}

/** List of compensation records response: { success, compensations: [...], count } */
export interface CompensationsListResponse {
  success: boolean;
  compensations: Compensation[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Compensation summary response: { success, summary: {...} } */
export interface CompensationSummaryResponse {
  success: boolean;
  summary: CompensationSummary;
}

/** Compensation history response: { success, history: [...] } */
export interface CompensationHistoryResponse {
  success: boolean;
  history: CompensationHistoryEntry[];
  count: number;
}
