/**
 * Reporting Type Definitions
 * Reports, analytics, and export functionality for Paylinq
 */

/**
 * Report Type
 */
export type ReportType = 
  | 'payroll_summary'
  | 'employee_earnings'
  | 'tax_liability'
  | 'deductions_summary'
  | 'time_attendance'
  | 'labor_cost'
  | 'payment_history'
  | 'reconciliation'
  | 'compliance'
  | 'custom';

/**
 * Report Format
 */
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

/**
 * Report Period
 */
export interface ReportPeriod {
  periodType: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string; // ISO date
  endDate: string; // ISO date
}

/**
 * Payroll Summary Report Data
 */
export interface PayrollSummaryReport {
  reportPeriod: ReportPeriod;
  totalPayrollRuns: number;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalDeductions: number;
  averageGrossPayPerEmployee: number;
  averageNetPayPerEmployee: number;
  payrollRunDetails: Array<{
    runNumber: string;
    runName: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    paymentDate: string;
    employeeCount: number;
    grossPay: number;
    netPay: number;
    taxes: number;
    deductions: number;
  }>;
}

/**
 * Employee Earnings Report Data
 */
export interface EmployeeEarningsReport {
  reportPeriod: ReportPeriod;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalDeductions: number;
  paycheckDetails: Array<{
    paycheckId: string;
    paymentDate: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    grossPay: number;
    netPay: number;
    regularPay: number;
    overtimePay: number;
    bonusPay: number;
    commissionPay: number;
    taxes: number;
    deductions: number;
  }>;
  earningsBreakdown: {
    regularHours: number;
    overtimeHours: number;
    regularPay: number;
    overtimePay: number;
    bonuses: number;
    commissions: number;
  };
}

/**
 * Tax Liability Report Data
 */
export interface TaxLiabilityReport {
  reportPeriod: ReportPeriod;
  totalFederalTax: number;
  totalStateTax: number;
  totalLocalTax: number;
  totalSocialSecurity: number;
  totalMedicare: number;
  totalWageTax: number; // Suriname
  totalAovTax: number; // Suriname
  totalAwwTax: number; // Suriname
  totalTaxLiability: number;
  byEmployee: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    federalTax: number;
    stateTax: number;
    localTax: number;
    socialSecurity: number;
    medicare: number;
    wageTax: number;
    aovTax: number;
    awwTax: number;
    totalTax: number;
  }>;
}

/**
 * Deductions Summary Report Data
 */
export interface DeductionsSummaryReport {
  reportPeriod: ReportPeriod;
  totalPreTaxDeductions: number;
  totalPostTaxDeductions: number;
  totalDeductions: number;
  byDeductionType: Array<{
    deductionType: string;
    deductionName: string;
    employeeCount: number;
    totalAmount: number;
    isPreTax: boolean;
  }>;
  byEmployee: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    preTaxDeductions: number;
    postTaxDeductions: number;
    totalDeductions: number;
  }>;
}

/**
 * Time Attendance Report Data
 */
export interface TimeAttendanceReport {
  reportPeriod: ReportPeriod;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalPtoHours: number;
  totalSickHours: number;
  totalHours: number;
  byEmployee: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    regularHours: number;
    overtimeHours: number;
    ptoHours: number;
    sickHours: number;
    totalHours: number;
    daysWorked: number;
    averageHoursPerDay: number;
  }>;
}

/**
 * Labor Cost Report Data
 */
export interface LaborCostReport {
  reportPeriod: ReportPeriod;
  totalLaborCost: number;
  totalRegularCost: number;
  totalOvertimeCost: number;
  totalBenefitsCost: number;
  totalTaxesCost: number;
  byDepartment?: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalCost: number;
    regularCost: number;
    overtimeCost: number;
    benefitsCost: number;
    taxesCost: number;
  }>;
  byWorkerType: Array<{
    workerTypeName: string;
    employeeCount: number;
    totalCost: number;
  }>;
}

/**
 * Report Request
 */
export interface ReportRequest {
  reportType: ReportType;
  reportPeriod: ReportPeriod;
  format: ReportFormat;
  filters?: {
    employeeIds?: string[];
    departmentIds?: string[];
    workerTypeIds?: string[];
    payrollRunIds?: string[];
  };
  includeDetails?: boolean;
}

/**
 * Report Generation Result
 */
export interface ReportGenerationResult {
  reportId: string;
  reportType: ReportType;
  format: ReportFormat;
  status: 'generating' | 'completed' | 'failed';
  generatedAt?: string; // ISO datetime
  downloadUrl?: string;
  expiresAt?: string; // ISO datetime
  error?: string;
}

/**
 * Export Request
 */
export interface ExportRequest {
  exportType: 'paychecks' | 'timesheets' | 'deductions' | 'taxes' | 'payments';
  format: ReportFormat;
  period: ReportPeriod;
  filters?: {
    employeeIds?: string[];
    payrollRunIds?: string[];
    status?: string;
  };
}

/**
 * Analytics Dashboard Data
 */
export interface AnalyticsDashboard {
  period: ReportPeriod;
  overview: {
    totalEmployees: number;
    totalPayrollRuns: number;
    totalGrossPay: number;
    totalNetPay: number;
    averagePayPerEmployee: number;
  };
  trends: {
    grossPayTrend: Array<{ date: string; amount: number }>;
    employeeCountTrend: Array<{ date: string; count: number }>;
    overtimeHoursTrend: Array<{ date: string; hours: number }>;
  };
  topMetrics: {
    highestPaidEmployees: Array<{ employeeName: string; grossPay: number }>;
    mostOvertimeEmployees: Array<{ employeeName: string; overtimeHours: number }>;
    departmentCosts: Array<{ departmentName: string; totalCost: number }>;
  };
}

/**
 * Year-to-Date Summary
 */
export interface YearToDateSummary {
  year: number;
  employeeId: string;
  employeeName: string;
  totalGrossPay: number;
  totalNetPay: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalSocialSecurity: number;
  totalMedicare: number;
  totalDeductions: number;
  regularHours: number;
  overtimeHours: number;
  ptoHours: number;
  sickHours: number;
}
