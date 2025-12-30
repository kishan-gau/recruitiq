/**
 * Allowance Repository
 * Data access layer for tax-free allowance operations
 * 
 * CRITICAL: MULTI-TENANT SECURITY
 * - All queries MUST filter by organization_id
 * - Never use organization_id = NULL
 * - Each tenant has completely isolated allowance data
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class AllowanceRepository {
  
  query: any;

constructor(database = null) {
    this.query = database?.query || query;
  }

  /**
   * Find active allowance by type for a specific date
   * @param {string} allowanceType - e.g., 'tax_free_sum_monthly', 'holiday_allowance', 'bonus_gratuity'
   * @param {Date} effectiveDate - Date to check
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Object|null>} Allowance record or null
   */
  async findActiveAllowanceByType(allowanceType, effectiveDate, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      id,
      organization_id,
      allowance_type,
      allowance_name,
      country,
      state,
      amount,
      is_percentage,
      effective_from,
      effective_to,
      is_active,
      description,
      created_at,
      updated_at
    FROM payroll.allowance 
    WHERE organization_id = $1 
      AND allowance_type = $2
      AND effective_from <= $3
      AND (effective_to IS NULL OR effective_to >= $3)
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY effective_from DESC
    LIMIT 1
  `;

  const result = await this.query(
    text,
    [organizationId, allowanceType, effectiveDate],
    organizationId,
    { operation: 'SELECT', table: 'payroll.allowance', method: 'findActiveAllowanceByType' }
  );

  if (result.rows.length === 0) {
    logger.debug('No active allowance found', { 
      allowanceType, 
      effectiveDate, 
      organizationId 
    });
    return null;
  }

    return result.rows[0];
  }

  /**
   * Get employee allowance usage for a specific year
   * @param {string} employeeId - Employee UUID
   * @param {string} allowanceType - Allowance type (e.g., 'holiday_allowance', 'bonus_gratuity')
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Object|null>} Usage record or null
   */
  async getEmployeeAllowanceUsage(employeeId, allowanceType, year, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      id,
      organization_id,
      employee_id,
      allowance_type,
      calendar_year,
      amount_used,
      amount_remaining,
      last_updated,
      created_at,
      updated_at
    FROM payroll.employee_allowance_usage
    WHERE organization_id = $1
      AND employee_id = $2
      AND allowance_type = $3
      AND calendar_year = $4
  `;

  const result = await this.query(
    text,
    [organizationId, employeeId, allowanceType, year],
    organizationId,
    { operation: 'SELECT', table: 'payroll.employee_allowance_usage', method: 'getEmployeeAllowanceUsage' }
  );

  if (result.rows.length === 0) {
    logger.debug('No allowance usage record found', { 
      employeeId, 
      allowanceType, 
      year, 
      organizationId 
    });
    return null;
  }

    return result.rows[0];
  }

  /**
   * Record or update allowance usage
   * @param {string} employeeId - Employee UUID
   * @param {string} allowanceType - Allowance type
   * @param {number} amountUsed - Amount to add to usage
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Object>} Updated usage record
   */
  async recordAllowanceUsage(employeeId, allowanceType, amountUsed, year, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    INSERT INTO payroll.employee_allowance_usage 
      (organization_id, employee_id, allowance_type, calendar_year, amount_used, last_updated)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (employee_id, allowance_type, calendar_year)
    DO UPDATE SET 
      amount_used = payroll.employee_allowance_usage.amount_used + EXCLUDED.amount_used,
      last_updated = NOW()
    RETURNING 
      id,
      organization_id,
      employee_id,
      allowance_type,
      calendar_year,
      amount_used,
      amount_remaining,
      last_updated,
      created_at,
      updated_at
  `;

  const result = await this.query(
    text,
    [organizationId, employeeId, allowanceType, year, amountUsed],
    organizationId,
    { operation: 'INSERT', table: 'payroll.employee_allowance_usage', method: 'recordAllowanceUsage' }
  );

  logger.info('Allowance usage recorded', {
    employeeId,
    allowanceType,
    amountUsed,
    year,
    organizationId,
    totalUsed: result.rows[0].amount_used
  });

    return result.rows[0];
  }

  /**
   * Get all allowances for an organization
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Array>} Array of allowance records
   */
  async getAllAllowances(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      id,
      organization_id,
      allowance_type,
      allowance_name,
      country,
      state,
      amount,
      is_percentage,
      effective_from,
      effective_to,
      is_active,
      description,
      created_at,
      updated_at
    FROM payroll.allowance
    WHERE organization_id = $1
      AND deleted_at IS NULL
    ORDER BY allowance_type, effective_from DESC
  `;

  const result = await this.query(
    text,
    [organizationId],
    organizationId,
    { operation: 'SELECT', table: 'payroll.allowance', method: 'getAllAllowances' }
  );

    return result.rows;
  }

  /**
   * Reset allowance usage for a new year
   * Useful for yearly cap resets (e.g., holiday allowance, bonus allowance)
   * @param {string} employeeId - Employee UUID
   * @param {string} allowanceType - Allowance type
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<void>}
   */
  async resetAllowanceUsage(employeeId, allowanceType, year, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    UPDATE payroll.employee_allowance_usage
    SET 
      amount_used = 0,
      amount_remaining = NULL,
      last_updated = NOW()
    WHERE organization_id = $1
      AND employee_id = $2
      AND allowance_type = $3
      AND calendar_year = $4
  `;

  await this.query(
    text,
    [organizationId, employeeId, allowanceType, year],
    organizationId,
    { operation: 'UPDATE', table: 'payroll.employee_allowance_usage', method: 'resetAllowanceUsage' }
  );

    logger.info('Allowance usage reset', {
      employeeId,
      allowanceType,
      year,
      organizationId
    });
  }
}

export default AllowanceRepository;
