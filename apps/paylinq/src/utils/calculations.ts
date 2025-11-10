import Decimal from 'decimal.js';

/**
 * Pay frequency divisors
 */
const PAY_FREQUENCY_DIVISORS = {
  weekly: 52,
  'bi-weekly': 26,
  'semi-monthly': 24,
  monthly: 12,
} as const;

export type PayFrequency = keyof typeof PAY_FREQUENCY_DIVISORS;

/**
 * Calculate gross pay for salaried employee
 * 
 * @param annualSalary - Annual salary amount
 * @param payFrequency - How often employee is paid
 * @returns Gross pay per pay period (rounded to 2 decimals)
 * 
 * @example
 * calculateSalaryPay(60000, 'bi-weekly') // Returns 2307.69
 */
export function calculateSalaryPay(
  annualSalary: number,
  payFrequency: PayFrequency
): number {
  const divisor = PAY_FREQUENCY_DIVISORS[payFrequency];
  return new Decimal(annualSalary).div(divisor).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate gross pay for hourly employee
 * 
 * @param rate - Hourly rate
 * @param regularHours - Regular hours worked
 * @param overtimeHours - Overtime hours worked (optional)
 * @param overtimeMultiplier - Overtime pay multiplier (default 1.5x)
 * @returns Total gross pay (rounded to 2 decimals)
 * 
 * @example
 * calculateHourlyPay(20, 40, 10) // Regular 40hrs + 10hrs OT = $1,100
 */
export function calculateHourlyPay(
  rate: number,
  regularHours: number,
  overtimeHours: number = 0,
  overtimeMultiplier: number = 1.5
): number {
  const regularPay = new Decimal(rate).mul(regularHours);
  const overtimePay = new Decimal(rate).mul(overtimeMultiplier).mul(overtimeHours);
  
  return regularPay.plus(overtimePay).toDecimalPlaces(2).toNumber();
}

/**
 * Tax bracket definition
 */
export interface TaxBracket {
  min: number;
  max: number | null; // null means no upper limit
  rate: number; // Decimal (0.15 = 15%)
}

/**
 * Suriname tax brackets (2024) - EXAMPLE ONLY
 * Replace with actual tax brackets from Suriname tax authority
 */
export const SURINAME_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 15000, rate: 0 },        // Tax-free allowance
  { min: 15000, max: 30000, rate: 0.08 }, // 8%
  { min: 30000, max: 50000, rate: 0.15 }, // 15%
  { min: 50000, max: null, rate: 0.25 },  // 25% (no upper limit)
];

/**
 * Calculate tax withholding using progressive tax brackets
 * 
 * @param grossPay - Gross pay amount
 * @param taxBrackets - Array of tax brackets
 * @returns Tax amount to withhold (rounded to 2 decimals)
 * 
 * @example
 * calculateTaxWithholding(40000, SURINAME_TAX_BRACKETS) // Returns 2700
 */
export function calculateTaxWithholding(
  grossPay: number,
  taxBrackets: TaxBracket[] = SURINAME_TAX_BRACKETS
): number {
  let remainingIncome = new Decimal(grossPay);
  let totalTax = new Decimal(0);

  for (const bracket of taxBrackets) {
    if (remainingIncome.lte(0)) break;

    // Calculate taxable amount in this bracket
    const bracketMin = new Decimal(bracket.min);
    const bracketMax = bracket.max !== null ? new Decimal(bracket.max) : null;

    let taxableInBracket: Decimal;
    if (bracketMax !== null) {
      const bracketRange = bracketMax.minus(bracketMin);
      taxableInBracket = Decimal.min(remainingIncome, bracketRange);
    } else {
      taxableInBracket = remainingIncome;
    }

    // Calculate tax for this bracket
    const taxInBracket = taxableInBracket.mul(bracket.rate);
    totalTax = totalTax.plus(taxInBracket);
    remainingIncome = remainingIncome.minus(taxableInBracket);
  }

  return totalTax.toDecimalPlaces(2).toNumber();
}

/**
 * Calculate net pay
 * 
 * @param grossPay - Gross pay amount
 * @param taxWithholding - Tax amount to withhold
 * @param deductions - Array of deduction amounts
 * @returns Net pay (never negative, rounded to 2 decimals)
 * 
 * @example
 * calculateNetPay(3000, 450, [100, 50]) // Returns 2400
 */
export function calculateNetPay(
  grossPay: number,
  taxWithholding: number,
  deductions: number[] = []
): number {
  const totalDeductions = deductions.reduce(
    (sum, ded) => sum.plus(ded),
    new Decimal(0)
  );

  const netPay = new Decimal(grossPay)
    .minus(taxWithholding)
    .minus(totalDeductions);

  // Ensure net pay is not negative
  return Decimal.max(0, netPay).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate social security contributions (AOV/AWW)
 * Suriname-specific - adjust rates as needed
 * 
 * @param grossPay - Gross pay amount
 * @param aovRate - AOV (pension) rate (default 8%)
 * @param awwRate - AWW (insurance) rate (default 1.5%)
 * @returns Object with AOV and AWW amounts
 */
export function calculateSocialContributions(
  grossPay: number,
  aovRate: number = 0.08,
  awwRate: number = 0.015
): { aov: number; aww: number; total: number } {
  const gross = new Decimal(grossPay);
  const aov = gross.mul(aovRate).toDecimalPlaces(2).toNumber();
  const aww = gross.mul(awwRate).toDecimalPlaces(2).toNumber();
  const total = new Decimal(aov).plus(aww).toDecimalPlaces(2).toNumber();

  return { aov, aww, total };
}

/**
 * Validate payroll calculation data
 * 
 * @param data - Payroll data to validate
 * @returns Object with isValid flag and errors array
 */
export interface PayrollData {
  workerId: string;
  compensationType: 'salary' | 'hourly';
  compensationAmount: number;
  regularHours?: number;
  overtimeHours?: number;
  deductions?: number[];
}

export function validatePayrollData(data: PayrollData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.workerId) {
    errors.push('Worker ID is required');
  }

  if (data.compensationAmount <= 0) {
    errors.push('Compensation amount must be positive');
  }

  if (data.compensationType === 'hourly') {
    if (data.regularHours === undefined || data.regularHours < 0) {
      errors.push('Regular hours must be specified and non-negative');
    }
    if (data.overtimeHours !== undefined && data.overtimeHours < 0) {
      errors.push('Overtime hours cannot be negative');
    }
  }

  if (data.deductions) {
    if (data.deductions.some((d) => d < 0)) {
      errors.push('Deductions cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
