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
    
    // Pay amounts - ALWAYS convert to numbers (not strings)
    grossPay: paycheck.gross_pay ? parseFloat(paycheck.gross_pay) : 0,
    regularPay: paycheck.regular_pay ? parseFloat(paycheck.regular_pay) : 0,
    overtimePay: paycheck.overtime_pay ? parseFloat(paycheck.overtime_pay) : 0,
    netPay: paycheck.net_pay ? parseFloat(paycheck.net_pay) : 0,
    
    // Tax-free allowances and taxable income
    taxFreeAllowance: parseFloat(paycheck.tax_free_allowance) || 0,
    taxableIncome: parseFloat(paycheck.taxable_income) || 0,
    
    // Surinamese taxes - convert to numbers
    wageTax: paycheck.wage_tax ? parseFloat(paycheck.wage_tax) : 0,
    aovTax: paycheck.aov_tax ? parseFloat(paycheck.aov_tax) : 0,
    awwTax: paycheck.aww_tax ? parseFloat(paycheck.aww_tax) : 0,
    
    // US taxes (for backward compatibility) - convert to numbers
    federalTax: paycheck.federal_tax ? parseFloat(paycheck.federal_tax) : 0,
    stateTax: paycheck.state_tax ? parseFloat(paycheck.state_tax) : 0,
    localTax: paycheck.local_tax ? parseFloat(paycheck.local_tax) : 0,
    socialSecurity: paycheck.social_security ? parseFloat(paycheck.social_security) : 0,
    medicare: paycheck.medicare ? parseFloat(paycheck.medicare) : 0,
    
    // Deductions - convert to numbers
    otherDeductions: paycheck.other_deductions ? parseFloat(paycheck.other_deductions) : 0,
    
    // Payment info
    paymentMethod: paycheck.payment_method,
    status: paycheck.status,
    paymentReference: paycheck.payment_reference,
    
    // Components (earnings, deductions, taxes) - from payroll_run_component JOIN
    // CRITICAL: Components are aggregated as JSONB array in the query
    components: paycheck.components || [],
    
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
