/**
 * Benefits Module Type Definitions
 * Types for benefits plans, enrollments, and dependents management
 */

// ============ Benefit Types ============

export type BenefitCategory = 'health' | 'dental' | 'vision' | 'life' | 'disability' | 'retirement' | 'wellness' | 'other';
export type BenefitStatus = 'active' | 'inactive' | 'pending' | 'expired';
export type CoverageLevel = 'employee-only' | 'employee-spouse' | 'employee-children' | 'family';
export type EnrollmentStatus = 'active' | 'pending' | 'cancelled' | 'expired' | 'declined';
export type DependentRelationship = 'spouse' | 'child' | 'domestic-partner' | 'parent' | 'other';

// ============ Benefit Plan ============

export interface BenefitPlan {
  id: string;
  organizationId: string;
  
  // Plan Details
  planName: string;
  planCode: string;
  description: string;
  category: BenefitCategory;
  status: BenefitStatus;
  
  // Provider Information
  providerName: string;
  providerContact?: string;
  policyNumber?: string;
  
  // Cost Information
  employeeContribution: number; // monthly cost
  employerContribution: number; // monthly cost
  deductible?: number;
  outOfPocketMax?: number;
  
  // Coverage Details
  coverageLevels: CoverageLevel[];
  coverageStartDay: number; // day of month coverage starts for new enrollments
  
  // Eligibility
  eligibilityRules?: string; // JSON or text description
  waitingPeriodDays?: number; // days before coverage starts
  
  // Plan Period
  planYearStart: string; // YYYY-MM-DD
  planYearEnd: string; // YYYY-MM-DD
  
  // Documents
  summaryDocumentUrl?: string;
  handbookUrl?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateBenefitPlanDTO {
  planName: string;
  planCode: string;
  description: string;
  category: BenefitCategory;
  providerName: string;
  providerContact?: string;
  policyNumber?: string;
  employeeContribution: number;
  employerContribution: number;
  deductible?: number;
  outOfPocketMax?: number;
  coverageLevels: CoverageLevel[];
  coverageStartDay: number;
  eligibilityRules?: string;
  waitingPeriodDays?: number;
  planYearStart: string;
  planYearEnd: string;
  summaryDocumentUrl?: string;
  handbookUrl?: string;
}

export interface UpdateBenefitPlanDTO {
  planName?: string;
  description?: string;
  status?: BenefitStatus;
  providerContact?: string;
  policyNumber?: string;
  employeeContribution?: number;
  employerContribution?: number;
  deductible?: number;
  outOfPocketMax?: number;
  coverageLevels?: CoverageLevel[];
  eligibilityRules?: string;
  waitingPeriodDays?: number;
  planYearEnd?: string;
  summaryDocumentUrl?: string;
  handbookUrl?: string;
}

export interface BenefitPlanFilters {
  category?: BenefitCategory;
  status?: BenefitStatus;
  providerName?: string;
}

// ============ Benefit Enrollment ============

export interface BenefitEnrollment {
  id: string;
  organizationId: string;
  
  // Enrollment Details
  employeeId: string;
  planId: string;
  enrollmentStatus: EnrollmentStatus;
  coverageLevel: CoverageLevel;
  
  // Dates
  enrollmentDate: string;
  coverageStartDate: string;
  coverageEndDate?: string;
  
  // Cost Information (can change based on coverage level)
  employeeContribution: number;
  employerContribution: number;
  
  // Dependents
  dependents: string[]; // array of dependent IDs
  
  // Notes
  notes?: string;
  cancellationReason?: string;
  
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
    jobTitle?: string;
    department?: {
      id: string;
      departmentName: string;
    };
  };
  plan?: BenefitPlan;
}

export interface CreateBenefitEnrollmentDTO {
  employeeId: string;
  planId: string;
  coverageLevel: CoverageLevel;
  enrollmentDate: string;
  coverageStartDate: string;
  employeeContribution: number;
  employerContribution: number;
  dependents?: string[];
  notes?: string;
}

export interface UpdateBenefitEnrollmentDTO {
  enrollmentStatus?: EnrollmentStatus;
  coverageLevel?: CoverageLevel;
  coverageEndDate?: string;
  dependents?: string[];
  notes?: string;
  cancellationReason?: string;
}

export interface BenefitEnrollmentFilters {
  employeeId?: string;
  planId?: string;
  enrollmentStatus?: EnrollmentStatus;
  category?: BenefitCategory;
}

// ============ Dependent ============

export interface Dependent {
  id: string;
  organizationId: string;
  employeeId: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: DependentRelationship;
  
  // Contact Information
  email?: string;
  phone?: string;
  
  // Identification
  ssn?: string; // encrypted
  dependentId?: string; // custom ID
  
  // Eligibility
  isStudent?: boolean;
  isDisabled?: boolean;
  
  // Documents
  birthCertificateUrl?: string;
  otherDocumentUrl?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateDependentDTO {
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: DependentRelationship;
  email?: string;
  phone?: string;
  ssn?: string;
  dependentId?: string;
  isStudent?: boolean;
  isDisabled?: boolean;
  birthCertificateUrl?: string;
  otherDocumentUrl?: string;
}

export interface UpdateDependentDTO {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  relationship?: DependentRelationship;
  email?: string;
  phone?: string;
  dependentId?: string;
  isStudent?: boolean;
  isDisabled?: boolean;
  birthCertificateUrl?: string;
  otherDocumentUrl?: string;
}

export interface DependentFilters {
  employeeId?: string;
  relationship?: DependentRelationship;
}

// ============ Statistics & Analytics ============

export interface BenefitStatistics {
  totalPlans: number;
  activePlans: number;
  totalEnrollments: number;
  activeEnrollments: number;
  totalEmployees: number;
  enrolledEmployees: number;
  enrollmentRate: number; // percentage
  totalMonthlyCost: number;
  employeeContributionTotal: number;
  employerContributionTotal: number;
  byCategory: {
    category: BenefitCategory;
    count: number;
    cost: number;
  }[];
}

export interface EnrollmentSummary {
  planId: string;
  planName: string;
  category: BenefitCategory;
  enrollmentCount: number;
  totalCost: number;
  averageCostPerEnrollment: number;
}
