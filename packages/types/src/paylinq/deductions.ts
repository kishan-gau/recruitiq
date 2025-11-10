/**
 * Deduction Type Definitions
 * Aligns with backend schema: payroll.employee_deduction
 */

import { BaseEntity, PayFrequency } from './common';

/**
 * Deduction Type
 */
export type DeductionType = 
  | 'health_insurance'
  | 'dental_insurance'
  | 'vision_insurance'
  | 'retirement_401k'
  | 'retirement_403b'
  | 'hsa'
  | 'fsa'
  | 'life_insurance'
  | 'disability_insurance'
  | 'garnishment'
  | 'child_support'
  | 'loan_repayment'
  | 'union_dues'
  | 'other';

/**
 * Calculation Type for deductions
 */
export type DeductionCalculationType = 'fixed' | 'percentage';

/**
 * Employee Deduction
 * Backend table: payroll.employee_deduction
 */
export interface EmployeeDeduction extends BaseEntity {
  employeeId: string;
  
  // Deduction details
  deductionType: DeductionType;
  deductionName: string;
  deductionCode: string;
  calculationType: DeductionCalculationType;
  deductionAmount?: number; // For fixed deductions
  deductionPercentage?: number; // For percentage deductions
  
  // Limits
  maxPerPayroll?: number;
  maxAnnual?: number;
  
  // Tax and recurrence
  isPreTax: boolean;
  isRecurring: boolean;
  frequency: PayFrequency;
  
  // Effective dates
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  priority: number; // Deduction order (lower = higher priority)
  
  // Populated fields
  employeeName?: string;
  currentPeriodAmount?: number;
  yearToDateAmount?: number;
}

/**
 * Create Deduction Request
 */
export interface CreateDeductionRequest {
  employeeId: string;
  deductionType: DeductionType;
  deductionName: string;
  deductionCode: string;
  calculationType: DeductionCalculationType;
  deductionAmount?: number;
  deductionPercentage?: number;
  maxPerPayroll?: number;
  maxAnnual?: number;
  isPreTax?: boolean;
  isRecurring?: boolean;
  frequency: PayFrequency;
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  priority?: number;
}

/**
 * Update Deduction Request
 */
export interface UpdateDeductionRequest {
  deductionName?: string;
  deductionCode?: string;
  calculationType?: DeductionCalculationType;
  deductionAmount?: number;
  deductionPercentage?: number;
  maxPerPayroll?: number;
  maxAnnual?: number;
  isPreTax?: boolean;
  isRecurring?: boolean;
  frequency?: PayFrequency;
  effectiveTo?: string; // ISO date
  priority?: number;
}

/**
 * Deduction Summary
 */
export interface DeductionSummary {
  employeeId: string;
  totalDeductions: number;
  activeDeductions: number;
  preTaxTotal: number;
  postTaxTotal: number;
  yearToDateTotal: number;
  deductionsByType: Record<DeductionType, number>;
}

/**
 * Deduction Filters
 */
export interface DeductionFilters {
  employeeId?: string;
  deductionType?: DeductionType;
  isRecurring?: boolean;
  isPreTax?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

/**
 * Bulk Deduction Operation
 */
export interface BulkDeductionOperation {
  operation: 'create' | 'update' | 'terminate';
  employeeIds: string[];
  deductionData: CreateDeductionRequest | UpdateDeductionRequest;
}

/**
 * Bulk Deduction Result
 */
export interface BulkDeductionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
}
