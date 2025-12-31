/**
 * Tax-related types for Paylinq
 * Tax rules, calculation modes, and tax breakdown structures
 */

/**
 * Tax calculation modes
 */
export type TaxCalculationMode = 
  | 'aggregated'                // Tax on total only, no component breakdown
  | 'component_based'           // Tax per component (ONLY for flat-rate taxes)
  | 'proportional_distribution'; // Tax on total, distribute to components (correct for progressive)

/**
 * Tax calculation method
 */
export type TaxCalculationMethod = 
  | 'bracket'     // Progressive tax brackets
  | 'flat_rate'   // Flat percentage rate
  | 'graduated';  // Graduated rates

/**
 * Tax rule set (database representation)
 */
export interface TaxRuleSet {
  id: string;
  organizationId: string;
  taxType: string;
  taxName: string;
  country: string;
  state?: string;
  locality?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  annualCap?: number;
  calculationMethod: TaxCalculationMethod;
  calculationMode: TaxCalculationMode;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  name?: string; // Alias for taxName
  // Additional properties used in components
  ruleCode?: string;
  ruleName?: string; // Alias for taxName
  ruleType?: string; // Alias for taxType
  isActive?: boolean;
}

// Alias for backward compatibility
export type TaxRule = TaxRuleSet;

/**
 * Tax bracket (for progressive taxes)
 */
export interface TaxBracket {
  id: string;
  organizationId: string;
  taxRuleSetId: string;
  bracketOrder: number;
  minIncome: number;
  maxIncome?: number;
  taxRate: number;
  standardDeduction: number;
  additionalDeduction: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

/**
 * Calculation modes summary (included in component breakdown)
 */
export interface CalculationModes {
  wageTax: TaxCalculationMode;
  aov: TaxCalculationMode;
  aww: TaxCalculationMode;
}

/**
 * Tax calculation metadata
 */
export interface TaxCalculationMetadata {
  allowanceType?: string | null;
  payDate: string;
  wageTaxProportion?: number;
  wageTaxCalculationMode?: TaxCalculationMode;
  aovCalculationMode?: TaxCalculationMode;
  awwCalculationMode?: TaxCalculationMode;
  taxRulesApplied: {
    wageTaxRuleSet: string;
    wageTaxMode: TaxCalculationMode;
    aovRate: number | null;
    aovMode: TaxCalculationMode;
    awwRate: number | null;
    awwMode: TaxCalculationMode;
  };
}

/**
 * Component tax breakdown (individual component)
 */
export interface ComponentTaxDetail {
  componentCode: string;
  componentName: string;
  amount: number;
  isTaxable: boolean;
  taxFreeAllowance: number;
  taxableIncome: number;
  wageTax: number;
  aovTax: number;
  awwTax: number;
  totalTax: number;
  calculationMetadata: TaxCalculationMetadata;
}

/**
 * Tax calculation summary
 */
export interface TaxCalculationSummary {
  totalGrossPay: number;
  totalTaxFreeAllowance: number;
  totalTaxableIncome: number;
  totalWageTax: number;
  totalAovTax: number;
  totalAwwTax: number;
  totalTaxes: number;
  effectiveRate: number;
  componentCount: number;
  calculationModes: CalculationModes;
}

/**
 * Complete tax calculation result
 */
export interface TaxCalculationResult {
  employeeRecordId: string;
  payDate: string;
  payPeriod: string;
  summary: TaxCalculationSummary;
  componentTaxes: ComponentTaxDetail[];
  calculatedAt: string;
}

/**
 * Tax rule status
 */
export type TaxRuleStatus = 'draft' | 'published' | 'archived' | 'superseded';

/**
 * Tax rule versioning status
 */
export type TaxRuleVersionStatus = 'draft' | 'published' | 'archived';

/**
 * Tax rule (main interface with versioning support)
 */
export interface TaxRule {
  id: string;
  organizationId: string;
  taxType: string;
  taxName: string;
  country: string;
  state?: string;
  locality?: string;
  status: TaxRuleStatus;
  version: number;
  isCurrentVersion: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  annualCap?: number;
  calculationMethod: TaxCalculationMethod;
  calculationMode: TaxCalculationMode;
  description?: string;
  brackets: TaxBracket[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

/**
 * Tax rule version (for version history)
 */
export interface TaxRuleVersion {
  id: string;
  taxRuleId: string;
  organizationId: string;
  version: number;
  status: TaxRuleVersionStatus;
  taxType: string;
  taxName: string;
  country: string;
  state?: string;
  locality?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  annualCap?: number;
  calculationMethod: TaxCalculationMethod;
  calculationMode: TaxCalculationMode;
  description?: string;
  brackets: TaxBracket[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  changeReason?: string;
  changeDescription?: string;
}

/**
 * Tax rule version comparison
 */
export interface TaxRuleVersionComparison {
  versionA: TaxRuleVersion;
  versionB: TaxRuleVersion;
  differences: {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'modified';
  }[];
  bracketsComparison?: {
    added: TaxBracket[];
    removed: TaxBracket[];
    modified: {
      bracket: TaxBracket;
      changes: {
        field: string;
        oldValue: any;
        newValue: any;
      }[];
    }[];
  };
}

/**
 * Tax rule list item (for table display)
 */
export interface TaxRuleListItem {
  id: string;
  taxType: string;
  taxName: string;
  country: string;
  state?: string;
  locality?: string;
  status: TaxRuleStatus;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  calculationMethod: TaxCalculationMethod;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Tax rule creation request
 */
export interface CreateTaxRuleRequest {
  taxType: string;
  taxName: string;
  country: string;
  state?: string;
  locality?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  annualCap?: number;
  calculationMethod: TaxCalculationMethod;
  calculationMode: TaxCalculationMode;
  description?: string;
  brackets: Omit<TaxBracket, 'id' | 'organizationId' | 'taxRuleSetId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[];
}

/**
 * Tax rule update request
 */
export interface UpdateTaxRuleRequest {
  taxName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  annualCap?: number;
  calculationMethod?: TaxCalculationMethod;
  calculationMode?: TaxCalculationMode;
  description?: string;
  brackets?: Omit<TaxBracket, 'id' | 'organizationId' | 'taxRuleSetId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[];
}

/**
 * Create version request
 */
export interface CreateVersionRequest {
  changeReason?: string;
  changeDescription?: string;
  updates: UpdateTaxRuleRequest;
}
