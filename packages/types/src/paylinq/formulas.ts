/**
 * Pay Component & Formula Type Definitions
 * Aligns with backend schema: payroll.pay_component, payroll.component_formula, payroll.custom_pay_component
 */

import { BaseEntity, Status } from './common';
import type { EmployeePayComponentAssignment } from './employee-components';

/**
 * Component Type
 */
export type ComponentType = 'earning' | 'deduction';

/**
 * Calculation Type for pay components
 */
export type FormulaCalculationType = 'fixed_amount' | 'percentage' | 'hourly_rate' | 'formula';

/**
 * Formula Type
 */
export type FormulaType = 'arithmetic' | 'conditional' | 'lookup';

/**
 * GAAP Category
 */
export type GAAPCategory = 'labor_cost' | 'benefits' | 'taxes' | 'deductions' | 'reimbursements';

/**
 * Pay Component
 * Backend table: payroll.pay_component
 */
export interface PayComponent extends BaseEntity {
  // Component identification
  componentCode: string;
  componentName: string;
  componentType: ComponentType;
  category?: string; // 'regular_pay', 'overtime', 'bonus', 'commission', 'benefit', 'tax', etc.
  
  // Calculation method
  calculationType: FormulaCalculationType;
  defaultRate?: number; // Default rate (hourly rate, percentage, etc.)
  defaultAmount?: number; // Default fixed amount
  
  // Formula support
  formula?: string; // Simple formula expression (e.g., "gross_pay * 0.10")
  formulaId?: string; // Complex formula reference
  metadata?: Record<string, any>; // Additional data: formula AST, variables, validation results
  
  // Tax treatment
  isTaxable: boolean;
  isRecurring: boolean; // Appears on every paycheck
  isPreTax: boolean; // Pre-tax deduction (like 401k)
  isSystemComponent: boolean; // System-managed (can't be deleted)
  appliesToGross: boolean; // Applied to gross pay
  
  // GAAP compliance
  gaapCategory?: GAAPCategory;
  
  description?: string;
  status: Status;
}

/**
 * Component Formula
 * Backend table: payroll.component_formula
 */
export interface ComponentFormula extends BaseEntity {
  payComponentId?: string;
  
  // Formula details
  formulaName: string;
  formulaExpression: string; // Human-readable: "gross_pay * 0.15 - 500"
  formulaType: FormulaType;
  
  // Advanced formula support
  formulaAst?: Record<string, any>; // Parsed Abstract Syntax Tree
  conditionalRules?: Array<{
    condition: {
      var: string;
      op: string;
      value: any;
    };
    then: string;
    else: string;
  }>;
  variables?: Record<string, {
    type: string;
    required?: boolean;
  }>;
  validationSchema?: Record<string, any>;
  
  // Versioning
  formulaVersion: number;
  isActive: boolean;
  
  description?: string;
}

/**
 * Create Pay Component Request
 */
export interface CreatePayComponentRequest {
  componentCode: string;
  componentName: string;
  componentType: ComponentType;
  category?: string;
  calculationType: FormulaCalculationType;
  defaultRate?: number;
  defaultAmount?: number;
  formula?: string;
  formulaId?: string;
  isTaxable?: boolean;
  isRecurring?: boolean;
  isPreTax?: boolean;
  appliesToGross?: boolean;
  gaapCategory?: GAAPCategory;
  description?: string;
  status?: Status;
}

/**
 * Update Pay Component Request
 */
export interface UpdatePayComponentRequest {
  componentName?: string;
  category?: string;
  calculationType?: FormulaCalculationType;
  defaultRate?: number;
  defaultAmount?: number;
  formula?: string;
  formulaId?: string;
  isTaxable?: boolean;
  isRecurring?: boolean;
  isPreTax?: boolean;
  appliesToGross?: boolean;
  gaapCategory?: GAAPCategory;
  description?: string;
  status?: Status;
}

/**
 * Create Formula Request
 */
export interface CreateFormulaRequest {
  payComponentId?: string;
  formulaName: string;
  formulaExpression: string;
  formulaType: FormulaType;
  formulaAst?: Record<string, any>;
  conditionalRules?: any[];
  variables?: Record<string, any>;
  validationSchema?: Record<string, any>;
  description?: string;
}

/**
 * Update Formula Request
 */
export interface UpdateFormulaRequest {
  formulaName?: string;
  formulaExpression?: string;
  formulaType?: FormulaType;
  formulaAst?: Record<string, any>;
  conditionalRules?: any[];
  variables?: Record<string, any>;
  validationSchema?: Record<string, any>;
  isActive?: boolean;
  description?: string;
}

/**
 * Formula Validation Result
 */
export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  result?: number;
}

/**
 * Pay Component Filters
 */
export interface PayComponentFilters {
  componentType?: ComponentType;
  calculationType?: FormulaCalculationType;
  category?: string;
  isRecurring?: boolean;
  status?: Status;
}

/**
 * API Response Types for Pay Components
 * Following API standards: resource-specific keys, not generic "data"
 */

/** Single pay component response: { success, payComponent: {...} } */
export interface PayComponentResponse {
  success: boolean;
  payComponent: PayComponent;
  message?: string;
}

/** List of pay components response: { success, payComponents: [...], count } */
export interface PayComponentsListResponse {
  success: boolean;
  payComponents: PayComponent[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Single component formula response: { success, formula: {...} } */
export interface FormulaResponse {
  success: boolean;
  formula: ComponentFormula;
  message?: string;
}

/** List of formulas response: { success, formulas: [...], count } */
export interface FormulasListResponse {
  success: boolean;
  formulas: ComponentFormula[];
  count: number;
}

/** Employee component assignment response: { success, assignment: {...} } */
export interface EmployeeComponentAssignmentResponse {
  success: boolean;
  assignment: EmployeePayComponentAssignment;
  message?: string;
}

/** Formula validation result response: { success, validation: {...} } */
export interface FormulaValidationResponse {
  success: boolean;
  validation: FormulaValidationResult;
}

