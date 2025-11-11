/**
 * Payroll Run & Payment Type Definitions
 * Aligns with backend schema: payroll.payroll_run, payroll.paycheck, payroll.payroll_run_component
 */

import { BaseEntity, PaymentMethod } from './common';

/**
 * Payroll Run Status
 */
export type PayrollRunStatus = 
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'approved'
  | 'processing'
  | 'processed'
  | 'cancelled';

/**
 * Paycheck Status
 */
export type PaycheckStatus = 'pending' | 'approved' | 'paid' | 'voided';

/**
 * Component Type (for payroll run components)
 */
export type PayrollComponentType = 'earning' | 'tax' | 'deduction';

/**
 * Payroll Run
 * Backend table: payroll.payroll_run
 */
export interface PayrollRun extends BaseEntity {
  // Run identification
  runNumber: string;
  runName: string;
  runType: string; // 'Regular', 'Bonus', 'Correction', etc.
  
  // Pay period
  payPeriodStart: string; // ISO date
  payPeriodEnd: string; // ISO date
  paymentDate: string; // ISO date
  
  // Summary totals
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalDeductions: number;
  
  // Status tracking
  status: PayrollRunStatus;
  calculatedAt?: string; // ISO datetime
  approvedAt?: string; // ISO datetime
  approvedBy?: string;
  processedAt?: string; // ISO datetime
  processedBy?: string;
  
  // Populated fields
  paychecks?: Paycheck[];
}

/**
 * Paycheck
 * Backend table: payroll.paycheck
 */
export interface Paycheck extends BaseEntity {
  payrollRunId: string;
  employeeId: string;
  
  // Pay period
  paymentDate: string; // ISO date
  payPeriodStart: string; // ISO date
  payPeriodEnd: string; // ISO date
  
  // Earnings
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonusPay: number;
  commissionPay: number;
  
  // Taxes
  federalTax: number;
  stateTax: number;
  localTax: number;
  socialSecurity: number;
  medicare: number;
  wageTax: number; // Suriname wage tax
  aovTax: number; // Suriname AOV
  awwTax: number; // Suriname AWW
  
  // Deductions
  preTaxDeductions: number;
  postTaxDeductions: number;
  otherDeductions: number;
  
  // Net pay
  netPay: number;
  
  // Payment details
  paymentMethod: PaymentMethod;
  checkNumber?: string;
  
  // Status
  status: PaycheckStatus;
  paidAt?: string; // ISO datetime
  
  // Populated fields
  employeeName?: string;
  runNumber?: string;
  components?: PayrollRunComponent[];
}

/**
 * Payroll Run Component
 * Backend table: payroll.payroll_run_component
 */
export interface PayrollRunComponent extends BaseEntity {
  payrollRunId: string;
  paycheckId: string;
  
  // Component details
  componentType: PayrollComponentType;
  componentCode: string;
  componentName: string;
  
  // Calculation
  units?: number; // Hours, percentage, etc.
  rate?: number; // Rate per unit
  amount: number;
  
  // Metadata
  isTaxable: boolean;
  taxCategory?: string;
}

/**
 * Create Payroll Run Request
 */
export interface CreatePayrollRunRequest {
  payrollName: string;         // Maps to runName in backend
  periodStart: string;         // ISO date (YYYY-MM-DD)
  periodEnd: string;           // ISO date (YYYY-MM-DD)
  paymentDate: string;         // ISO date (YYYY-MM-DD)
  status?: 'draft' | 'calculating' | 'calculated' | 'approved' | 'processing' | 'processed' | 'cancelled';
}

/**
 * Update Payroll Run Request
 */
export interface UpdatePayrollRunRequest {
  payrollName?: string;        // Maps to runName in backend
  periodStart?: string;        // ISO date (YYYY-MM-DD)
  periodEnd?: string;          // ISO date (YYYY-MM-DD)
  paymentDate?: string;        // ISO date (YYYY-MM-DD)
  status?: 'draft' | 'calculating' | 'calculated' | 'approved' | 'processing' | 'processed' | 'cancelled';
}

/**
 * Calculate Payroll Request
 */
export interface CalculatePayrollRequest {
  payrollRunId: string;
  employeeIds?: string[]; // Optional: specific employees, or all if omitted
  includeTimesheets?: boolean;
  includeDeductions?: boolean;
  includeTaxes?: boolean;
}

/**
 * Approve Payroll Request
 */
export interface ApprovePayrollRequest {
  payrollRunId: string;
  approvalNotes?: string;
}

/**
 * Process Payroll Request
 */
export interface ProcessPayrollRequest {
  payrollRunId: string;
  paymentDate?: string; // ISO date, override default
}

/**
 * Void Paycheck Request
 */
export interface VoidPaycheckRequest {
  paycheckId: string;
  reason: string;
}

/**
 * Payroll Run Filters
 */
export interface PayrollRunFilters {
  status?: PayrollRunStatus;
  runType?: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  paymentDate?: string;
}

/**
 * Paycheck Filters
 */
export interface PaycheckFilters {
  payrollRunId?: string;
  employeeId?: string;
  status?: PaycheckStatus;
  paymentDate?: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
}

/**
 * Payroll Summary
 */
export interface PayrollSummary {
  payrollRunId: string;
  runNumber: string;
  runName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalDeductions: number;
}

/**
 * Employee Paycheck History
 */
export interface PaycheckHistory {
  employeeId: string;
  employeeName: string;
  paychecks: Paycheck[];
  yearToDateGrossPay: number;
  yearToDateNetPay: number;
  yearToDateTaxes: number;
  yearToDateDeductions: number;
}

/**
 * Payroll Calculation Result
 */
export interface PayrollCalculationResult {
  payrollRunId: string;
  status: 'success' | 'partial' | 'failed';
  paychecksCreated: number;
  paychecksFailed: number;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
  warnings: Array<{
    employeeId: string;
    employeeName: string;
    warning: string;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Single payroll run response
 */
export interface PayrollRunResponse {
  success: boolean;
  payrollRun: PayrollRun;
  message?: string;
}

/**
 * Payroll runs list response
 */
export interface PayrollRunsListResponse {
  success: boolean;
  payrollRuns: PayrollRun[];
  count: number;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Single paycheck response
 */
export interface PaycheckResponse {
  success: boolean;
  paycheck: Paycheck;
  message?: string;
}

/**
 * Paychecks list response
 */
export interface PaychecksListResponse {
  success: boolean;
  paychecks: Paycheck[];
  count: number;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Paycheck history response
 */
export interface PaycheckHistoryResponse {
  success: boolean;
  paycheckHistory: PaycheckHistory;
}

/**
 * Payroll calculation result response
 */
export interface PayrollCalculationResponse {
  success: boolean;
  calculationResult: PayrollCalculationResult;
}
