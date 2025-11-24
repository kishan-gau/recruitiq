/**
 * Employee Pay Component Types
 * Types for assigning pay components to individual employees
 */

import type { BaseEntity } from './common';

/**
 * Employee Pay Component Assignment (rich configuration)
 * Used for complex benefit assignments with full configuration
 */
export interface EmployeePayComponentAssignment extends BaseEntity {
  id: string;
  organizationId: string;
  employeeId: string;
  componentId: string;
  componentCode: string;
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  configuration?: Record<string, any>; // JSON configuration
  overrideAmount?: number;
  overrideFormula?: string;
  notes?: string;
  
  // Populated from joins
  component?: {
    componentCode: string;
    componentName: string;
    componentType: string;
    calculationType: string;
  };
}

/**
 * Create Employee Component Assignment Request
 */
export interface CreateEmployeeComponentAssignmentRequest {
  employeeId: string;
  componentId: string;
  componentCode: string;
  effectiveFrom: string;
  effectiveTo?: string;
  configuration?: Record<string, any>;
  overrideAmount?: number;
  overrideFormula?: string;
  notes?: string;
}

/**
 * Update Employee Component Assignment Request
 */
export interface UpdateEmployeeComponentAssignmentRequest {
  effectiveFrom?: string;
  effectiveTo?: string;
  configuration?: Record<string, any>;
  overrideAmount?: number;
  overrideFormula?: string;
  notes?: string;
}

/**
 * Employee Component Filters
 */
export interface EmployeeComponentFilters {
  componentType?: 'earning' | 'deduction' | 'benefit' | 'tax' | 'reimbursement';
  isActive?: boolean;
  effectiveDate?: string;
}

/**
 * Forfaitair Benefit Configuration
 * Specific configuration for Dutch forfaitair benefits
 */
export interface ForfaitairBenefitConfig {
  benefitType: 'car' | 'housing' | 'phone' | 'internet' | 'other';
  description?: string;
  
  // Car benefit specific
  carDetails?: {
    make?: string;
    model?: string;
    licensePlate?: string;
    catalogValue?: number;
    co2Emission?: number;
    fuelType?: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  };
  
  // Housing benefit specific
  housingDetails?: {
    address?: string;
    marketRent?: number;
    actualRent?: number;
  };
  
  // Tax calculation
  taxableValue: number;
  calculationMethod: 'fixed' | 'percentage' | 'market_value';
  calculationBasis?: number;
  percentageApplied?: number;
}

/**
 * Employee Component Summary
 */
export interface EmployeeComponentSummary {
  totalComponents: number;
  activeComponents: number;
  earnings: number;
  deductions: number;
  benefits: number;
  totalMonthlyImpact: number;
}
