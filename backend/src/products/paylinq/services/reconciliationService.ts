/**
 * Reconciliation Service
 * 
 * Business logic layer for payroll reconciliation, variance tracking, and adjustments.
 * Handles bank reconciliation, GL reconciliation, and payroll adjustment processing.
 * 
 * MVP Version: Manual reconciliation with variance tracking
 * Phase 2: Automated bank reconciliation, GL integration, ML-based discrepancy detection
 * 
 * @module products/paylinq/services/reconciliationService
 */

import Joi from 'joi';
import ReconciliationRepository from '../repositories/reconciliationRepository.ts';
import logger from '../../../utils/logger.ts';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.ts';

class ReconciliationService {
  constructor() {
    this.reconciliationRepository = new ReconciliationRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  reconciliationSchema = Joi.object({
    payrollRunId: Joi.string().uuid().required(),
    reconciliationType: Joi.string().valid('bank', 'gl', 'tax', 'benefit').required(),
    reconciliationDate: Joi.date().default(() => new Date()),
    periodStart: Joi.date().allow(null),
    periodEnd: Joi.date().allow(null),
    expectedAmount: Joi.number().allow(null),
    expectedTotal: Joi.number().allow(null), // Alias
    actualAmount: Joi.number().allow(null),
    actualTotal: Joi.number().allow(null), // Alias
    notes: Joi.string().max(500).allow(null, '')
  }).options({ stripUnknown: true });

  reconciliationItemSchema = Joi.object({
    reconciliationId: Joi.string().uuid().required(),
    itemType: Joi.string().trim().max(50).required(),
    referenceId: Joi.string().uuid().allow(null, ''),
    expectedAmount: Joi.number().required(),
    actualAmount: Joi.number().required(),
    varianceAmount: Joi.number().allow(null),
    variance: Joi.number().allow(null), // Alias for varianceAmount
    status: Joi.string().valid('pending', 'resolved', 'escalated').default('pending'),
    description: Joi.string().max(200).required(),
    notes: Joi.string().max(500).allow(null, ''),
    createdBy: Joi.string().uuid().allow(null) // Added by controller
  }).options({ stripUnknown: true });

  payrollAdjustmentSchema = Joi.object({
    payrollRunId: Joi.string().uuid().required(),
    paycheckId: Joi.string().uuid().allow(null),
    adjustmentType: Joi.string().valid('correction', 'bonus', 'deduction', 'reimbursement').required(),
    adjustmentReason: Joi.string().min(5).max(500).required(),
    adjustmentAmount: Joi.number().required(),
    effectiveDate: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).optional().allow(null),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== RECONCILIATION ====================

  /**
   * Create reconciliation (alias for API compatibility)
   * @param {Object} reconciliationData - Reconciliation data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the reconciliation
   * @returns {Promise<Object>} Created reconciliation
   */
  async createReconciliation(reconciliationData, organizationId, userId) {
    return this.startReconciliation(reconciliationData, organizationId, userId);
  }

  /**
   * Start reconciliation
   * @param {Object} reconciliationData - Reconciliation data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User starting the reconciliation
   * @returns {Promise<Object>} Created reconciliation
   */
  async startReconciliation(reconciliationData, organizationId, userId) {
    const { error, value } = this.reconciliationSchema.validate(reconciliationData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const reconciliation = await this.reconciliationRepository.createReconciliation(
        value,
        organizationId,
        userId
      );

      logger.info('Reconciliation started', {
        reconciliationId: reconciliation.id,
        reconciliationType: reconciliation.reconciliation_type,
        payrollRunId: reconciliation.payroll_run_id,
        organizationId
      });

      return reconciliation;
    } catch (err) {
      logger.error('Error starting reconciliation', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get reconciliations
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Reconciliations
   */
  async getReconciliations(organizationId, filters = {}) {
    try {
      return await this.reconciliationRepository.findReconciliations(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching reconciliations', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get reconciliations by organization (alias for API compatibility)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Reconciliations
   */
  async getReconciliationsByOrganization(organizationId, filters = {}) {
    return this.getReconciliations(organizationId, filters);
  }

  /**
   * Get reconciliation by ID
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Reconciliation with summary
   */
  async getReconciliationById(reconciliationId, organizationId) {
    try {
      const reconciliation = await this.reconciliationRepository.findReconciliationById(
        reconciliationId,
        organizationId
      );

      if (!reconciliation) {
        throw new NotFoundError('Reconciliation not found');
      }

      // Get summary
      const summary = await this.reconciliationRepository.getReconciliationSummary(
        reconciliationId,
        organizationId
      );

      return {
        ...reconciliation,
        summary
      };
    } catch (err) {
      logger.error('Error fetching reconciliation', { error: err.message, reconciliationId });
      throw err;
    }
  }

  /**
   * Update reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated reconciliation
   */
  async updateReconciliation(reconciliationId, organizationId, updateData) {
    try {
      const reconciliation = await this.reconciliationRepository.updateReconciliation(
        reconciliationId,
        organizationId,
        updateData
      );

      if (!reconciliation) {
        throw new NotFoundError('Reconciliation not found');
      }

      logger.info('Reconciliation updated', {
        reconciliationId,
        organizationId
      });

      return reconciliation;
    } catch (err) {
      logger.error('Error updating reconciliation', { error: err.message, reconciliationId });
      throw err;
    }
  }

  /**
   * Delete reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the reconciliation
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteReconciliation(reconciliationId, organizationId, userId) {
    try {
      const deleted = await this.reconciliationRepository.deleteReconciliation(
        reconciliationId,
        organizationId,
        userId
      );

      if (!deleted) {
        throw new NotFoundError('Reconciliation not found');
      }

      logger.info('Reconciliation deleted', {
        reconciliationId,
        deletedBy: userId,
        organizationId
      });

      return deleted;
    } catch (err) {
      logger.error('Error deleting reconciliation', { error: err.message, reconciliationId });
      throw err;
    }
  }

  /**
   * Complete reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User completing the reconciliation
   * @param {string} notes - Optional completion notes
   * @returns {Promise<Object>} Completed reconciliation
   */
  async completeReconciliation(reconciliationId, organizationId, userId, notes = null) {
    try {
      // Check if reconciliation exists first
      const existingReconciliation = await this.reconciliationRepository.findReconciliationById(
        reconciliationId,
        organizationId
      );

      if (!existingReconciliation) {
        throw new NotFoundError('Reconciliation not found');
      }

      // Business rule: All items must be resolved
      // Check for unresolved items (is_reconciled = false)
      const unresolvedItems = await this.reconciliationRepository.findReconciliationItems(
        reconciliationId,
        organizationId,
        { isReconciled: false }
      );

      if (unresolvedItems.length > 0) {
        throw new ConflictError(`Cannot complete reconciliation. ${unresolvedItems.length} unresolved items remain.`);
      }

      // Get all items to calculate actual total
      const allItems = await this.reconciliationRepository.findReconciliationItems(
        reconciliationId,
        organizationId
      );
      
      const actualTotal = allItems.reduce((sum, item) => sum + parseFloat(item.actual_amount || 0), 0);

      // Complete the reconciliation
      const reconciliation = await this.reconciliationRepository.completeReconciliation(
        reconciliationId,
        actualTotal,
        organizationId,
        userId
      );

      if (!reconciliation) {
        throw new Error('Failed to complete reconciliation');
      }

      logger.info('Reconciliation completed', {
        reconciliationId,
        actualTotal,
        varianceAmount: reconciliation.variance_amount,
        completedBy: userId,
        organizationId
      });

      return reconciliation;
    } catch (err) {
      logger.error('Error completing reconciliation', { error: err.message, reconciliationId });
      throw err;
    }
  }

  // ==================== RECONCILIATION ITEMS ====================

  /**
   * Add reconciliation item
   * @param {Object} itemData - Reconciliation item data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User adding the item
   * @returns {Promise<Object>} Created reconciliation item
   */
  async addReconciliationItem(itemData, organizationId, userId) {
    // Normalize field names: support both 'variance' and 'varianceAmount'
    if (itemData.variance !== undefined && itemData.varianceAmount === undefined) {
      itemData.varianceAmount = itemData.variance;
    }
    
    // Auto-calculate variance if not provided
    if (itemData.varianceAmount === undefined || itemData.varianceAmount === null) {
      itemData.varianceAmount = (itemData.actualAmount || 0) - (itemData.expectedAmount || 0);
    }

    const { error, value } = this.reconciliationItemSchema.validate(itemData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Auto-determine status based on variance
    if (value.varianceAmount === 0) {
      value.status = 'resolved';
    } else if (Math.abs(value.varianceAmount) > 100) {
      value.status = 'escalated';
    }

    try {
      const item = await this.reconciliationRepository.createReconciliationItem(
        value,
        organizationId,
        userId
      );

      logger.info('Reconciliation item added', {
        itemId: item.id,
        reconciliationId: item.reconciliation_id,
        varianceAmount: item.variance_amount,
        organizationId
      });

      return item;
    } catch (err) {
      logger.error('Error adding reconciliation item', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get reconciliation items
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string|Object} statusOrFilters - Status filter (string) or filters object
   * @returns {Promise<Array>} Reconciliation items
   */
  async getReconciliationItems(reconciliationId, organizationId, statusOrFilters = null) {
    try {
      // Handle both string status and filters object for API compatibility
      const filters = {};
      if (typeof statusOrFilters === 'string') {
        // Map status string to is_reconciled boolean
        // 'resolved' maps to is_reconciled = true
        // 'pending' maps to is_reconciled = false
        if (statusOrFilters === 'resolved') {
          filters.isReconciled = true;
        } else if (statusOrFilters === 'pending') {
          filters.isReconciled = false;
        }
      } else if (statusOrFilters && typeof statusOrFilters === 'object') {
        Object.assign(filters, statusOrFilters);
      }

      return await this.reconciliationRepository.findReconciliationItems(
        reconciliationId,
        organizationId,
        filters
      );
    } catch (err) {
      logger.error('Error fetching reconciliation items', { error: err.message, reconciliationId });
      throw err;
    }
  }

  /**
   * Update reconciliation item
   * @param {string} itemId - Reconciliation item UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated reconciliation item
   */
  async updateReconciliationItem(itemId, organizationId, updateData) {
    try {
      const item = await this.reconciliationRepository.updateReconciliationItem(
        itemId,
        organizationId,
        updateData
      );

      if (!item) {
        throw new NotFoundError('Reconciliation item not found');
      }

      logger.info('Reconciliation item updated', {
        itemId,
        organizationId
      });

      return item;
    } catch (err) {
      logger.error('Error updating reconciliation item', { error: err.message, itemId });
      throw err;
    }
  }

  /**
   * Resolve reconciliation item
   * @param {string} itemId - Reconciliation item UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User resolving the item
   * @param {string} resolution - Resolution action/notes
   * @returns {Promise<Object>} Resolved reconciliation item
   */
  async resolveReconciliationItem(itemId, organizationId, userId, resolution) {
    try {
      const item = await this.reconciliationRepository.resolveReconciliationItem(
        itemId,
        resolution,
        organizationId,
        userId
      );

      if (!item) {
        throw new NotFoundError('Reconciliation item not found');
      }

      logger.info('Reconciliation item resolved', {
        itemId,
        resolution,
        resolvedBy: userId,
        organizationId
      });

      return item;
    } catch (err) {
      logger.error('Error resolving reconciliation item', { error: err.message, itemId });
      throw err;
    }
  }

  // ==================== PAYROLL ADJUSTMENTS ====================

  /**
   * Create payroll adjustment
   * @param {Object} adjustmentData - Payroll adjustment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the adjustment
   * @returns {Promise<Object>} Created payroll adjustment
   */
  async createPayrollAdjustment(adjustmentData, organizationId, userId) {
    const { error, value } = this.payrollAdjustmentSchema.validate(adjustmentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const adjustment = await this.reconciliationRepository.createPayrollAdjustment(
        value,
        organizationId,
        userId
      );

      logger.info('Payroll adjustment created', {
        adjustmentId: adjustment.id,
        adjustmentType: adjustment.adjustment_type,
        adjustmentAmount: adjustment.adjustment_amount,
        organizationId
      });

      return adjustment;
    } catch (err) {
      logger.error('Error creating payroll adjustment', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get adjustments by payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Payroll adjustments
   */
  async getAdjustmentsByRun(payrollRunId, organizationId) {
    try {
      return await this.reconciliationRepository.findAdjustmentsByRun(payrollRunId, organizationId);
    } catch (err) {
      logger.error('Error fetching adjustments by run', { error: err.message, payrollRunId });
      throw err;
    }
  }

  /**
   * Apply payroll adjustment
   * @param {string} adjustmentId - Payroll adjustment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User applying the adjustment
   * @returns {Promise<Object>} Applied payroll adjustment
   */
  async applyPayrollAdjustment(adjustmentId, organizationId, userId) {
    try {
      const adjustment = await this.reconciliationRepository.applyAdjustment(
        adjustmentId,
        organizationId,
        userId
      );

      logger.info('Payroll adjustment applied', {
        adjustmentId,
        appliedBy: userId,
        organizationId
      });

      return adjustment;
    } catch (err) {
      logger.error('Error applying payroll adjustment', { error: err.message, adjustmentId });
      throw err;
    }
  }

  /**
   * Identify discrepancies (helper method)
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Items with variances
   */
  async identifyDiscrepancies(reconciliationId, organizationId) {
    try {
      return await this.reconciliationRepository.findReconciliationItems(
        reconciliationId,
        organizationId,
        { hasVariance: true }
      );
    } catch (err) {
      logger.error('Error identifying discrepancies', { error: err.message, reconciliationId });
      throw err;
    }
  }
}

// Export singleton instance
export default new ReconciliationService();
