/**
 * Employee Test Helper
 * 
 * Helper functions for creating test employees following the new schema architecture:
 * - hris.employee (single source of truth for employee data)
 * - payroll.employee_payroll_config (payroll-specific configuration)
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../../src/config/database.js';

/**
 * Create a complete test employee with both HRIS and payroll records
 * @param {Object} options - Configuration options
 * @param {string} options.organizationId - Organization ID
 * @param {string} options.userId - User ID for audit fields
 * @param {Object} options.employee - Employee data overrides
 * @param {Object} options.payrollConfig - Payroll config overrides
 * @returns {Object} Created employee and config data
 */
export async function createTestEmployee(options = {}) {
  const {
    organizationId,
    userId,
    employee = {},
    payrollConfig = {}
  } = options;

  // Generate default employee data
  const employeeId = employee.id || uuidv4();
  const employeeData = {
    id: employeeId,
    organization_id: organizationId,
    employee_number: employee.employee_number || `EMP-${Date.now()}`,
    first_name: employee.first_name || 'Test',
    last_name: employee.last_name || 'Employee',
    email: employee.email || `test.${Date.now()}@example.com`,
    hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
    employment_status: employee.employment_status || 'active',
    employment_type: employee.employment_type || 'full_time',
    created_by: userId,
    ...employee
  };

  // Create HRIS employee record
  const employeeResult = await query(
    `INSERT INTO hris.employee (
      id, organization_id, employee_number, first_name, last_name,
      email, hire_date, employment_status, employment_type,
      department_id, location_id, manager_id, job_title,
      created_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)
    RETURNING *`,
    [
      employeeData.id,
      employeeData.organization_id,
      employeeData.employee_number,
      employeeData.first_name,
      employeeData.last_name,
      employeeData.email,
      employeeData.hire_date,
      employeeData.employment_status,
      employeeData.employment_type,
      employeeData.department_id || null,
      employeeData.location_id || null,
      employeeData.manager_id || null,
      employeeData.job_title || null,
      employeeData.created_by
    ]
  );

  // Generate default payroll config data
  const payrollConfigData = {
    id: payrollConfig.id || uuidv4(),
    organization_id: organizationId,
    employee_id: employeeId,
    pay_frequency: payrollConfig.pay_frequency || 'monthly',
    payment_method: payrollConfig.payment_method || 'ach',
    currency: payrollConfig.currency || 'SRD',
    payroll_status: payrollConfig.payroll_status || 'active',
    payroll_start_date: payrollConfig.payroll_start_date || employeeData.hire_date,
    bank_name: payrollConfig.bank_name || null,
    account_number: payrollConfig.account_number || null,
    routing_number: payrollConfig.routing_number || null,
    tax_id: payrollConfig.tax_id || null,
    created_by: userId,
    ...payrollConfig
  };

  // Create payroll config record
  const configResult = await query(
    `INSERT INTO payroll.employee_payroll_config (
      id, organization_id, employee_id, pay_frequency, payment_method,
      currency, payroll_status, payroll_start_date,
      bank_name, account_number, routing_number, tax_id,
      created_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
    RETURNING *`,
    [
      payrollConfigData.id,
      payrollConfigData.organization_id,
      payrollConfigData.employee_id,
      payrollConfigData.pay_frequency,
      payrollConfigData.payment_method,
      payrollConfigData.currency,
      payrollConfigData.payroll_status,
      payrollConfigData.payroll_start_date,
      payrollConfigData.bank_name,
      payrollConfigData.account_number,
      payrollConfigData.routing_number,
      payrollConfigData.tax_id,
      payrollConfigData.created_by
    ]
  );

  return {
    employee: employeeResult.rows[0],
    payrollConfig: configResult.rows[0]
  };
}

/**
 * Create multiple test employees
 * @param {number} count - Number of employees to create
 * @param {Object} options - Base configuration options
 * @returns {Array} Array of created employee records
 */
export async function createTestEmployees(count, options = {}) {
  const employees = [];
  for (let i = 0; i < count; i++) {
    const employee = await createTestEmployee({
      ...options,
      employee: {
        ...options.employee,
        employee_number: `EMP-${Date.now()}-${i}`,
        email: `test.${Date.now()}.${i}@example.com`
      }
    });
    employees.push(employee);
  }
  return employees;
}

/**
 * Delete a test employee and all related payroll data
 * @param {string} employeeId - Employee ID to delete
 */
export async function deleteTestEmployee(employeeId) {
  // Delete payroll config (will cascade to other payroll tables via FK)
  await query(
    'DELETE FROM payroll.employee_payroll_config WHERE employee_id = $1',
    [employeeId]
  );
  
  // Delete HRIS employee record
  await query(
    'DELETE FROM hris.employee WHERE id = $1',
    [employeeId]
  );
}

/**
 * Delete all test employees for an organization created recently
 * @param {string} organizationId - Organization ID
 * @param {string} hoursAgo - Hours to look back (default: 1)
 */
export async function cleanupTestEmployees(organizationId, hoursAgo = 1) {
  // Delete payroll configs for recent test employees
  // Note: hoursAgo must be a number, not a UUID
  const intervalHours = typeof hoursAgo === 'number' ? hoursAgo : 1;
  await query(
    `DELETE FROM payroll.employee_payroll_config 
     WHERE organization_id = $1 
     AND created_at > NOW() - INTERVAL '${intervalHours} hours'`,
    [organizationId]
  );
  
  // Delete HRIS employees
  await query(
    `DELETE FROM hris.employee 
     WHERE organization_id = $1 
     AND created_at > NOW() - INTERVAL '${intervalHours} hours'`,
    [organizationId]
  );
}

/**
 * Get employee with payroll config
 * @param {string} employeeId - Employee ID
 * @returns {Object} Employee and payroll config data
 */
export async function getTestEmployee(employeeId) {
  const employeeResult = await query(
    'SELECT * FROM hris.employee WHERE id = $1',
    [employeeId]
  );
  
  const configResult = await query(
    'SELECT * FROM payroll.employee_payroll_config WHERE employee_id = $1',
    [employeeId]
  );
  
  return {
    employee: employeeResult.rows[0] || null,
    payrollConfig: configResult.rows[0] || null
  };
}

/**
 * Update employee employment status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New employment status
 */
export async function updateEmployeeStatus(employeeId, status) {
  await query(
    'UPDATE hris.employee SET employment_status = $1, updated_at = NOW() WHERE id = $2',
    [status, employeeId]
  );
}

/**
 * Update employee payroll status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New payroll status
 */
export async function updatePayrollStatus(employeeId, status) {
  await query(
    'UPDATE payroll.employee_payroll_config SET payroll_status = $1, updated_at = NOW() WHERE employee_id = $2',
    [status, employeeId]
  );
}

export default {
  createTestEmployee,
  createTestEmployees,
  deleteTestEmployee,
  cleanupTestEmployees,
  getTestEmployee,
  updateEmployeeStatus,
  updatePayrollStatus
};
