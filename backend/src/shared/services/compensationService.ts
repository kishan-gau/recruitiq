/**
 * Shared Compensation Service
 * 
 * Industry-standard shared service for managing employee compensation records.
 * Used by both Nexus (HRIS) and PayLinQ (Payroll) products to ensure
 * consistent compensation data management across the platform.
 * 
 * Following SOLID principles and Clean Architecture patterns.
 */

import { query } from '../../config/database.js';
import logger from '../../utils/logger.js';

class CompensationService {
  /**
   * Create initial compensation record for newly hired employee
   * 
   * This is called when an employee is created with initial compensation data.
   * Creates the first formal compensation record with audit trail.
   * 
   * @param {string} employeeId - Employee UUID from hris.employee
   * @param {Object} compensationData - Compensation details
   * @param {number} compensationData.amount - Compensation amount
   * @param {string} compensationData.type - Type: 'salary', 'hourly', 'commission', 'bonus'
   * @param {string} compensationData.currency - Currency code (e.g., 'SRD', 'USD')
   * @param {string} compensationData.effectiveFrom - ISO date string (defaults to today)
   * @param {string} compensationData.payFrequency - Pay frequency (optional)
   * @param {number} compensationData.overtimeRate - Overtime multiplier (optional, for hourly)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the record
   * @returns {Promise<Object>} Created compensation record
   */
  async createInitialCompensation(employeeId, compensationData, organizationId, userId) {
    try {
      logger.info('Creating initial compensation record', {
        employeeId,
        organizationId,
        amount: compensationData.amount,
        type: compensationData.type || 'salary'
      });

      // Validate required fields
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }
      if (!compensationData.amount || compensationData.amount <= 0) {
        throw new Error('Valid compensation amount is required');
      }

      // Check if employee already has a current compensation record
      const existingCheck = await query(
        `SELECT id FROM payroll.compensation
         WHERE employee_id = $1 
           AND organization_id = $2
           AND is_current = true
           AND deleted_at IS NULL`,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'payroll.compensation' }
      );

      if (existingCheck.rows.length > 0) {
        logger.warn('Employee already has current compensation, skipping creation', {
          employeeId,
          existingCompensationId: existingCheck.rows[0].id
        });
        return existingCheck.rows[0];
      }

      // Prepare compensation record
      const effectiveFrom = compensationData.effectiveFrom || 
                           new Date().toISOString().split('T')[0];

      const compensationType = compensationData.type || 
                               compensationData.compensationType || 
                               'salary';

      // Create the compensation record
      const result = await query(
        `INSERT INTO payroll.compensation (
          organization_id,
          employee_id,
          compensation_type,
          amount,
          currency,
          effective_from,
          is_current,
          overtime_rate,
          pay_frequency,
          change_reason,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          organizationId,
          employeeId,
          compensationType,
          compensationData.amount,
          compensationData.currency || 'SRD',
          effectiveFrom,
          true, // is_current
          compensationData.overtimeRate || null,
          compensationData.payFrequency || null,
          'Initial compensation at hire',
          userId,
          userId
        ],
        organizationId,
        { 
          operation: 'INSERT', 
          table: 'payroll.compensation',
          userId 
        }
      );

      logger.info('Initial compensation record created successfully', {
        compensationId: result.rows[0].id,
        employeeId,
        amount: compensationData.amount,
        type: compensationType
      });

      return result.rows[0];
    } catch (_error) {
      logger.error('Error creating initial compensation', {
        error: error.message,
        employeeId,
        organizationId,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update compensation (creates new record and marks old as non-current)
   * 
   * @param {string} employeeId - Employee UUID
   * @param {Object} compensationData - New compensation details
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the change
   * @returns {Promise<Object>} Created compensation record
   */
  async updateCompensation(employeeId, compensationData, organizationId, userId) {
    try {
      logger.info('Updating employee compensation', {
        employeeId,
        organizationId,
        newAmount: compensationData.amount
      });

      const effectiveFrom = compensationData.effectiveFrom || 
                           new Date().toISOString().split('T')[0];

      // Mark current compensation as non-current
      await query(
        `UPDATE payroll.compensation 
         SET is_current = false, 
             effective_to = $1, 
             updated_at = NOW(),
             updated_by = $2
         WHERE employee_id = $3 
           AND organization_id = $4 
           AND is_current = true
           AND deleted_at IS NULL`,
        [effectiveFrom, userId, employeeId, organizationId],
        organizationId,
        { 
          operation: 'UPDATE', 
          table: 'payroll.compensation',
          userId 
        }
      );

      // Create new compensation record
      const result = await query(
        `INSERT INTO payroll.compensation (
          organization_id,
          employee_id,
          compensation_type,
          amount,
          currency,
          effective_from,
          is_current,
          overtime_rate,
          pay_frequency,
          change_reason,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          organizationId,
          employeeId,
          compensationData.type || 'salary',
          compensationData.amount,
          compensationData.currency || 'SRD',
          effectiveFrom,
          true, // is_current
          compensationData.overtimeRate || null,
          compensationData.payFrequency || null,
          compensationData.changeReason || 'Compensation adjustment',
          userId,
          userId
        ],
        organizationId,
        { 
          operation: 'INSERT', 
          table: 'payroll.compensation',
          userId 
        }
      );

      logger.info('Compensation updated successfully', {
        compensationId: result.rows[0].id,
        employeeId,
        newAmount: compensationData.amount
      });

      return result.rows[0];
    } catch (_error) {
      logger.error('Error updating compensation', {
        error: error.message,
        employeeId,
        organizationId,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get current compensation for employee
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Current compensation or null
   */
  async getCurrentCompensation(employeeId, organizationId) {
    try {
      const result = await query(
        `SELECT * FROM payroll.compensation
         WHERE employee_id = $1 
           AND organization_id = $2
           AND is_current = true
           AND deleted_at IS NULL
         ORDER BY effective_from DESC
         LIMIT 1`,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'payroll.compensation' }
      );

      return result.rows[0] || null;
    } catch (_error) {
      logger.error('Error fetching current compensation', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get compensation history for employee
   * 
   * Returns all compensation records for an employee ordered by effective date (newest first).
   * Used for displaying compensation history in the UI.
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of compensation records
   */
  async getCompensationHistory(employeeId, organizationId) {
    try {
      logger.info('Fetching compensation history', {
        employeeId,
        organizationId
      });

      const result = await query(
        `SELECT * FROM payroll.compensation
         WHERE employee_id = $1 
           AND organization_id = $2
           AND deleted_at IS NULL
         ORDER BY effective_from DESC, created_at DESC`,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'payroll.compensation' }
      );

      logger.info('Compensation history fetched successfully', {
        employeeId,
        recordCount: result.rows.length
      });

      return result.rows;
    } catch (_error) {
      logger.error('Error fetching compensation history', {
        error: error.message,
        employeeId,
        organizationId,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Export singleton instance
export default new CompensationService();
