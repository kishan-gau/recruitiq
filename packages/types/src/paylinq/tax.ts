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
}

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
