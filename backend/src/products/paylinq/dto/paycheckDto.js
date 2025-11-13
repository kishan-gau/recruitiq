/**
 * Paycheck DTO - Maps database paycheck records to API response format
 * Handles snake_case to camelCase conversion
 */

/**
 * Map a single paycheck from database format to API format
 * @param {Object} paycheck - Database paycheck record (snake_case)
 * @returns {Object} API-formatted paycheck (camelCase)
 */
function mapPaycheckToDto(paycheck) {
  if (!paycheck) return null;

  return {
    id: paycheck.id,
    organizationId: paycheck.organization_id,
    payrollRunId: paycheck.payroll_run_id,
    employeeId: paycheck.employee_id,
    paymentDate: paycheck.payment_date,
    payPeriodStart: paycheck.pay_period_start,
    payPeriodEnd: paycheck.pay_period_end,
    
    // Employee info (from JOIN with hris.employee)
    employeeNumber: paycheck.employee_number,
    firstName: paycheck.first_name,
    lastName: paycheck.last_name,
    fullName: paycheck.first_name && paycheck.last_name 
      ? `${paycheck.first_name} ${paycheck.last_name}` 
      : paycheck.first_name || paycheck.last_name || 'Unknown',
    email: paycheck.email,
    
    // Pay amounts
    grossPay: paycheck.gross_pay,
    regularPay: paycheck.regular_pay,
    overtimePay: paycheck.overtime_pay,
    netPay: paycheck.net_pay,
    
    // Tax-free allowances and taxable income
    taxFreeAllowance: parseFloat(paycheck.tax_free_allowance) || 0,
    taxableIncome: parseFloat(paycheck.taxable_income) || 0,
    
    // Surinamese taxes
    wageTax: paycheck.wage_tax,
    aovTax: paycheck.aov_tax,
    awwTax: paycheck.aww_tax,
    
    // US taxes (for backward compatibility)
    federalTax: paycheck.federal_tax,
    stateTax: paycheck.state_tax,
    localTax: paycheck.local_tax,
    socialSecurity: paycheck.social_security,
    medicare: paycheck.medicare,
    
    // Deductions
    otherDeductions: paycheck.other_deductions,
    
    // Payment info
    paymentMethod: paycheck.payment_method,
    status: paycheck.status,
    paymentReference: paycheck.payment_reference,
    
    // Metadata
    createdAt: paycheck.created_at,
    updatedAt: paycheck.updated_at,
    createdBy: paycheck.created_by,
    updatedBy: paycheck.updated_by
  };
}

/**
 * Map an array of paychecks from database format to API format
 * @param {Array} paychecks - Array of database paycheck records
 * @returns {Array} Array of API-formatted paychecks
 */
function mapPaychecksToDto(paychecks) {
  if (!Array.isArray(paychecks)) return [];
  return paychecks.map(mapPaycheckToDto);
}

export {
  mapPaycheckToDto,
  mapPaychecksToDto
};
