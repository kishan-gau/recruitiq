/**
 * PayLinQ Domain Types
 * 
 * Type definitions for PayLinQ payroll management system.
 * Industry-standard interfaces with no temporary `any` types.
 */

// ==================== Type Literals ====================

export type PayFrequency = 'weekly' | 'bi-weekly' | 'biweekly' | 'semi-monthly' | 'semimonthly' | 'monthly';
export type PaymentMethod = 'ach' | 'check' | 'wire' | 'cash' | 'direct_deposit' | 'card';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type CompensationType = 'salary' | 'hourly' | 'commission' | 'bonus';
export type PayPeriod = 'hour' | 'day' | 'week' | 'month' | 'year';
export type TaxFilingStatus = 'single' | 'married' | 'head_of_household';
export type AccountType = 'checking' | 'savings';
export type PayrollRunStatus = 'draft' | 'calculating' | 'calculated' | 'review' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type PayStructureStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type ComponentCategory = 'earning' | 'deduction' | 'tax' | 'benefit' | 'employer_cost' | 'reimbursement';
export type CalculationType = 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered' | 'external';
export type AssignmentType = 'default' | 'department' | 'group' | 'custom' | 'temporary';

// ==================== PayrollService Interfaces ====================

export interface EmployeeRecordData {
  hrisEmployeeId?: string;
  employeeId?: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  phone?: string | null;
  nationalId?: string | null;
  dateOfBirth?: Date | string | null;
  departmentId?: string | null;
  locationId?: string | null;
  managerId?: string | null;
  department?: string | null;
  location?: string | null;
  payFrequency?: PayFrequency;
  paymentMethod?: PaymentMethod;
  currency?: string;
  status?: EmployeeStatus;
  startDate?: Date | string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  accountType?: AccountType | null;
  taxIdNumber?: string | null;
  taxId?: string | null;
  taxFilingStatus?: TaxFilingStatus | null;
  taxExemptions?: number | null;
  taxAllowances?: number | null;
  additionalWithholding?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface CompensationData {
  employeeId: string;
  compensationType: CompensationType;
  amount: number;
  payPeriod?: PayPeriod;
  effectiveDate?: Date | string;
  currency?: string;
  overtimeRate?: number | null;
  notes?: string | null;
}

export interface PayrollRunData {
  runType: string;
  payPeriodStart: Date | string;
  payPeriodEnd: Date | string;
  payDate?: Date | string;
  description?: string | null;
}

export interface TimesheetData {
  employeeRecordId: string;
  payPeriodStart: Date | string;
  payPeriodEnd: Date | string;
  regularHours: number;
  overtimeHours?: number;
  holidayHours?: number;
  sickHours?: number;
  vacationHours?: number;
  notes?: string | null;
}

export interface TaxCalculationResult {
  incomeTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  totalTax: number;
  taxableIncome: number;
  components?: PaycheckComponent[];
}

export interface PaycheckComponent {
  componentCode: string;
  componentName: string;
  componentCategory: ComponentCategory;
  amount: number;
  currency?: string;
  isDeduction?: boolean;
  isTaxable?: boolean;
}

// ==================== PayStructureService Interfaces ====================

export interface PayStructureTemplateData {
  templateCode: string;
  templateName: string;
  description?: string | null;
  versionMajor?: number;
  versionMinor?: number;
  versionPatch?: number;
  status?: PayStructureStatus;
  applicableToWorkerTypes?: string[];
  applicableToJurisdictions?: string[];
  payFrequency?: PayFrequency;
  currency?: string;
  isOrganizationDefault?: boolean;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  tags?: string[];
  notes?: string | null;
}

export interface PayComponentData {
  payComponentId?: string | null;
  componentCode: string;
  componentName: string;
  componentCategory: ComponentCategory;
  calculationType: CalculationType;
  defaultAmount?: number | null;
  defaultCurrency?: string | null;
  percentageOf?: string | null;
  percentageRate?: number | null;
  formulaExpression?: string | null;
  formulaVariables?: Record<string, unknown> | null;
  rateMultiplier?: number | null;
  appliesToHoursType?: string | null;
  tierConfiguration?: unknown[] | null;
  tierBasis?: string | null;
  sequenceOrder: number;
  dependsOnComponents?: string[];
  isMandatory?: boolean;
  isTaxable?: boolean;
  affectsGrossPay?: boolean;
  affectsNetPay?: boolean;
  taxCategory?: string | null;
  accountingCode?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  minPercentage?: number | null;
  maxPercentage?: number | null;
  maxAnnual?: number | null;
  maxPerPeriod?: number | null;
  allowWorkerOverride?: boolean;
  overrideAllowedFields?: string[];
  requiresApproval?: boolean;
  allowCurrencyOverride?: boolean;
  displayOnPayslip?: boolean;
  displayName?: string | null;
  displayOrder?: number | null;
  displayCategory?: string | null;
  conditions?: Record<string, unknown> | null;
  isConditional?: boolean;
  description?: string | null;
  notes?: string | null;
}

export interface TemplateAssignmentData {
  employeeId: string;
  templateId?: string | null;
  assignmentType?: AssignmentType;
  assignmentReason?: string | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  overrides?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface PayStructureCalculationResult {
  structureId: string;
  templateVersion: string;
  summary: {
    totalEarnings: number;
    totalDeductions: number;
    totalTaxes: number;
    netPay: number;
  };
  calculations: PaycheckComponent[];
}
