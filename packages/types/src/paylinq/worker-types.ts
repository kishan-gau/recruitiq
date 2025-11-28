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
  payStructureTemplateCode?: string; // References pay structure template
  
  // Default settings
  defaultPayFrequency?: PayFrequency;
  defaultPaymentMethod?: PaymentMethod;
  
  // Eligibility flags
  benefitsEligible: boolean;
  overtimeEligible: boolean;
  ptoEligible: boolean;
  sickLeaveEligible: boolean;
  vacationAccrualRate: number; // Hours per pay period
  
  // Status (from HRIS worker_type table)
  isActive: boolean;
  
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
  payStructureTemplateCode?: string | null; // References pay structure template
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
  payStructureTemplateCode?: string | null; // References pay structure template
  defaultPayFrequency?: PayFrequency;
  defaultPaymentMethod?: PaymentMethod;
  benefitsEligible?: boolean;
  overtimeEligible?: boolean;
  ptoEligible?: boolean;
  sickLeaveEligible?: boolean;
  vacationAccrualRate?: number;
  isActive?: boolean;
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

/**
 * API Response Types for Worker Types
 * Following API standards: resource-specific keys, not generic "data"
 */

/** Single worker type template response: { success, workerType: {...} } */
export interface WorkerTypeResponse {
  success: boolean;
  workerType: WorkerTypeTemplate;
  message?: string;
}

/** List of worker types response: { success, workerTypes: [...], count } */
export interface WorkerTypesListResponse {
  success: boolean;
  workerTypes: WorkerTypeTemplate[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Worker type assignment response: { success, assignment: {...} } */
export interface WorkerTypeAssignmentResponse {
  success: boolean;
  assignment: WorkerTypeAssignment;
  message?: string;
}

/** List of assignments response: { success, assignments: [...], count } */
export interface WorkerTypeAssignmentsListResponse {
  success: boolean;
  assignments: WorkerTypeAssignment[];
  count: number;
}

/**
 * Worker Type Template Upgrade Types
 * For managing pay structure template upgrades
 */

/** Worker needing upgrade */
export interface WorkerNeedingUpgrade {
  employeeId: string;
  employeeName?: string;
  currentTemplateId: string;
  currentTemplateName?: string;
  currentTemplateVersion?: number;
  assignedDate: string;
}

/** Upgrade status response */
export interface WorkerTypeUpgradeStatus {
  workerTypeId: string;
  workerTypeName: string;
  currentTemplateCode?: string;
  currentTemplateVersion?: number;
  latestTemplateVersion?: number;
  requiresUpgrade: boolean;
  workersNeedingUpgrade: WorkerNeedingUpgrade[];
  totalWorkersCount: number;
  upgradeableWorkersCount: number;
}

/** Component change in upgrade preview */
export interface ComponentChange {
  componentCode: string;
  componentName: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
}

/** Upgrade preview response */
export interface WorkerTypeUpgradePreview {
  workerTypeId: string;
  fromTemplate: {
    id: string;
    code: string;
    version: number;
    name: string;
  };
  toTemplate: {
    id: string;
    code: string;
    version: number;
    name: string;
  };
  componentChanges: ComponentChange[];
  affectedWorkersCount: number;
  affectedWorkers: WorkerNeedingUpgrade[];
}

/** Template comparison response */
export interface TemplateComparison {
  fromTemplate: {
    id: string;
    code: string;
    version: number;
    name: string;
    components: any[];
  };
  toTemplate: {
    id: string;
    code: string;
    version: number;
    name: string;
    components: any[];
  };
  changes: {
    added: ComponentChange[];
    removed: ComponentChange[];
    modified: ComponentChange[];
  };
}

/** Upgrade workers request */
export interface UpgradeWorkersRequest {
  workerIds?: string[]; // If not provided, upgrades all workers
  effectiveDate?: string; // ISO date, defaults to today
}

/** Upgrade workers result */
export interface UpgradeWorkersResult {
  success: boolean;
  upgradedCount: number;
  failedCount: number;
  upgradedWorkers: string[]; // employee IDs
  errors?: Array<{
    employeeId: string;
    error: string;
  }>;
  message?: string;
}

/** API response for upgrade status */
export interface WorkerTypeUpgradeStatusResponse {
  success: boolean;
  upgradeStatus: WorkerTypeUpgradeStatus;
}

/** API response for upgrade preview */
export interface WorkerTypeUpgradePreviewResponse {
  success: boolean;
  preview: WorkerTypeUpgradePreview;
}

/** API response for template comparison */
export interface TemplateComparisonResponse {
  success: boolean;
  comparison: TemplateComparison;
}

/** API response for upgrade workers */
export interface UpgradeWorkersResponse {
  success: boolean;
  result: UpgradeWorkersResult;
}
