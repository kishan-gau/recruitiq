/**
 * Worker Type Type Definitions
 * Aligns with backend schema: payroll.worker_type_template & payroll.worker_type
 */

import { BaseEntity, PayFrequency, PaymentMethod, Status } from './common';

/**
 * Worker Type Template (Classification Template)
 * Backend table: payroll.worker_type_template
 */
export interface WorkerTypeTemplate extends BaseEntity {
  // Template details
  name: string;
  code: string;
  description?: string;
  
  // Default settings
  defaultPayFrequency?: PayFrequency;
  defaultPaymentMethod?: PaymentMethod;
  
  // Eligibility flags
  benefitsEligible: boolean;
  overtimeEligible: boolean;
  ptoEligible: boolean;
  sickLeaveEligible: boolean;
  vacationAccrualRate: number; // Hours per pay period
  
  // Status
  status: Status;
  
  // Computed fields (from backend)
  employeeCount?: number;
}

/**
 * Create Worker Type Template Request
 * Maps to backend validation schema in workerTypeService.js
 */
export interface CreateWorkerTypeTemplateRequest {
  name: string;
  code: string;
  description?: string;
  defaultPayFrequency: PayFrequency;
  defaultPaymentMethod: PaymentMethod;
  benefitsEligible?: boolean;
  overtimeEligible?: boolean;
  ptoEligible?: boolean;
  sickLeaveEligible?: boolean;
  vacationAccrualRate?: number;
}

/**
 * Update Worker Type Template Request
 * Partial update allowed
 */
export interface UpdateWorkerTypeTemplateRequest {
  name?: string;
  description?: string;
  defaultPayFrequency?: PayFrequency;
  defaultPaymentMethod?: PaymentMethod;
  benefitsEligible?: boolean;
  overtimeEligible?: boolean;
  ptoEligible?: boolean;
  sickLeaveEligible?: boolean;
  vacationAccrualRate?: number;
  status?: Status;
}

/**
 * Worker Type Assignment (Employee Assignment)
 * Backend table: payroll.worker_type
 */
export interface WorkerTypeAssignment extends BaseEntity {
  employeeId: string;
  workerTypeTemplateId: string;
  
  // Assignment details
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  isCurrent: boolean;
  
  // Overrides (optional, defaults come from template)
  payFrequency?: PayFrequency;
  paymentMethod?: PaymentMethod;
  
  // Populated fields
  workerTypeTemplate?: WorkerTypeTemplate;
  employeeName?: string;
}

/**
 * Create Worker Type Assignment Request
 */
export interface CreateWorkerTypeAssignmentRequest {
  employeeId: string;
  workerTypeTemplateId: string;
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  payFrequency?: PayFrequency;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Worker Type Filters
 */
export interface WorkerTypeFilters {
  status?: Status;
  code?: string;
  includeInactive?: boolean;
}

/**
 * Assign Employees to Worker Type Request
 */
export interface AssignEmployeesToWorkerTypeRequest {
  employeeIds: string[];
  effectiveFrom: string; // ISO date
  notes?: string;
}

/**
 * Update Worker Type Assignment Request
 */
export interface UpdateWorkerTypeAssignmentRequest {
  effectiveTo?: string; // ISO date
  notes?: string;
}

/**
 * Worker Type with Employee Count
 */
export interface WorkerTypeWithCount extends WorkerTypeTemplate {
  assignedEmployees: number;
  activeEmployees: number;
}
