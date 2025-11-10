/**
 * Worker Type Service
 * 
 * Business logic layer for worker type template management and employee assignments.
 * Handles worker type operations, historical tracking, and tier limit validation.
 * 
 * @module products/paylinq/services/workerTypeService
 */

import Joi from 'joi';
import WorkerTypeRepository from '../repositories/workerTypeRepository.js';
import productConfig from '../config/product.config.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import { query  } from '../../../config/database.js';

class WorkerTypeService {
  constructor() {
    this.workerTypeRepository = new WorkerTypeRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  workerTypeTemplateSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).allow(null, ''),
    defaultPayFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
    defaultPaymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').required(),
    benefitsEligible: Joi.boolean().default(false),
    overtimeEligible: Joi.boolean().default(true),
    ptoEligible: Joi.boolean().default(false),
    sickLeaveEligible: Joi.boolean().default(false),
    vacationAccrualRate: Joi.number().min(0).max(1).allow(null)
  });

  workerTypeAssignmentSchema = Joi.object({
    employeeRecordId: Joi.string().uuid().required(),
    workerTypeTemplateId: Joi.string().uuid().required(),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    payFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').allow(null),
    paymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').allow(null),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== TEMPLATES ====================

  /**
   * Create worker type template
   * @param {Object} templateData - Template data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the template
   * @returns {Promise<Object>} Created worker type template
   */
  async createWorkerTypeTemplate(templateData, organizationId, userId) {
    // Validate input
    const { error, value } = this.workerTypeTemplateSchema.validate(templateData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Check tier limits
      await this.checkWorkerTypeLimit(organizationId);

      // Check for duplicate code
      const existing = await this.workerTypeRepository.findTemplateByCode(
        value.code,
        organizationId
      );

      if (existing) {
        throw new ConflictError(`Worker type template with code '${value.code}' already exists`);
      }

      const template = await this.workerTypeRepository.createTemplate(
        value,
        organizationId,
        userId
      );

      logger.info('Worker type template created', {
        templateId: template.id,
        templateCode: template.code,
        organizationId
      });

      return template;
    } catch (err) {
      logger.error('Error creating worker type template', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get worker type templates
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Worker type templates
   */
  async getWorkerTypeTemplates(organizationId, filters = {}) {
    try {
      return await this.workerTypeRepository.findTemplatesByOrganization(organizationId, filters);
    } catch (err) {
      logger.error('Error fetching worker type templates', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get worker type template by ID
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Worker type template
   */
  async getWorkerTypeTemplateById(templateId, organizationId) {
    try {
      const template = await this.workerTypeRepository.findTemplateById(templateId, organizationId);
      if (!template) {
        throw new NotFoundError('Worker type template not found');
      }
      return template;
    } catch (err) {
      logger.error('Error fetching worker type template', { error: err.message, templateId });
      throw err;
    }
  }

  /**
   * Update worker type template
   * @param {string} templateId - Template UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated worker type template
   */
  async updateWorkerTypeTemplate(templateId, updates, organizationId, userId) {
    try {
      // Validate partial schema
      const allowedFields = [
        'name', 'description', 'defaultPayFrequency', 'defaultPaymentMethod',
        'benefitsEligible', 'overtimeEligible', 'ptoEligible', 
        'sickLeaveEligible', 'vacationAccrualRate'
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const template = await this.workerTypeRepository.updateTemplate(
        templateId,
        filteredUpdates,
        organizationId,
        userId
      );

      logger.info('Worker type template updated', {
        templateId,
        updatedFields: Object.keys(filteredUpdates),
        organizationId
      });

      return template;
    } catch (err) {
      logger.error('Error updating worker type template', { error: err.message, templateId });
      throw err;
    }
  }

  /**
   * Delete worker type template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the template
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkerTypeTemplate(templateId, organizationId, userId) {
    try {
      const deleted = await this.workerTypeRepository.deleteTemplate(
        templateId,
        organizationId,
        userId
      );

      if (deleted) {
        logger.info('Worker type template deleted', { templateId, organizationId });
      }

      return deleted;
    } catch (err) {
      logger.error('Error deleting worker type template', { error: err.message, templateId });
      throw err;
    }
  }

  // ==================== ASSIGNMENTS ====================

  /**
   * Assign worker type to employee
   * @param {Object} assignmentData - Assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignment
   * @returns {Promise<Object>} Created worker type assignment
   */
  async assignWorkerType(assignmentData, organizationId, userId) {
    const { error, value } = this.workerTypeAssignmentSchema.validate(assignmentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate effective dates
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }

    try {
      // Verify template exists
      const template = await this.workerTypeRepository.findTemplateById(
        value.workerTypeTemplateId,
        organizationId
      );

      if (!template) {
        throw new NotFoundError('Worker type template not found');
      }

      // Check for overlapping assignments
      const existingAssignments = await this.workerTypeRepository.findWorkerTypeHistory(
        value.employeeRecordId,
        organizationId
      );

      for (const existing of existingAssignments) {
        if (existing.is_current) {
          // Will be set to non-current by repository
          continue;
        }

        // Check for date overlap
        const newStart = new Date(value.effectiveFrom);
        const newEnd = value.effectiveTo ? new Date(value.effectiveTo) : null;
        const existingStart = new Date(existing.effective_from);
        const existingEnd = existing.effective_to ? new Date(existing.effective_to) : null;

        if (newEnd && existingEnd) {
          if (
            (newStart <= existingEnd && newEnd >= existingStart)
          ) {
            throw new Error('Worker type assignment dates overlap with existing assignment');
          }
        }
      }

      const assignment = await this.workerTypeRepository.assignWorkerType(
        value,
        organizationId,
        userId
      );

      logger.info('Worker type assigned to employee', {
        assignmentId: assignment.id,
        employeeId: assignment.employee_id,
        templateId: assignment.worker_type_template_id,
        organizationId
      });

      return assignment;
    } catch (err) {
      logger.error('Error assigning worker type', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get current worker type for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Current worker type assignment
   */
  async getCurrentWorkerType(employeeRecordId, organizationId) {
    try {
      return await this.workerTypeRepository.findCurrentWorkerType(employeeRecordId, organizationId);
    } catch (err) {
      logger.error('Error fetching current worker type', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Get worker type history for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Worker type history
   */
  async getWorkerTypeHistory(employeeRecordId, organizationId) {
    try {
      return await this.workerTypeRepository.findWorkerTypeHistory(employeeRecordId, organizationId);
    } catch (err) {
      logger.error('Error fetching worker type history', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Bulk assign worker types
   * @param {Array} assignments - Array of assignment objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignments
   * @returns {Promise<Array>} Created worker type assignments
   */
  async bulkAssignWorkerTypes(assignments, organizationId, userId) {
    try {
      const results = [];

      for (const assignment of assignments) {
        try {
          const result = await this.assignWorkerType(assignment, organizationId, userId);
          results.push({ success: true, data: result });
        } catch (err) {
          results.push({ 
            success: false, 
            error: err.message, 
            employeeRecordId: assignment.employeeRecordId 
          });
        }
      }

      logger.info('Bulk worker type assignment completed', {
        total: assignments.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error in bulk worker type assignment', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get employee count by worker type
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Employee count by worker type template
   */
  async getEmployeeCountByWorkerType(organizationId) {
    try {
      return await this.workerTypeRepository.countEmployeesByWorkerType(organizationId);
    } catch (err) {
      logger.error('Error fetching employee count by worker type', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== TIER LIMIT VALIDATION ====================

  /**
   * Check worker type limit for organization's tier
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>} Throws error if limit exceeded
   */
  async checkWorkerTypeLimit(organizationId) {
    try {
      // Get organization's tier
      const orgResult = await query(
        'SELECT tier FROM public.organizations WHERE id = $1',
        [organizationId],
        organizationId,
        { operation: 'SELECT', table: 'organizations' }
      );

      if (!orgResult.rows.length) {
        throw new NotFoundError('Organization not found');
      }

      const tierName = orgResult.rows[0].tier;

      // Get tier preset from database
      const tierPreset = await productConfig.tierManagement.getTierPreset(tierName, query);

      if (!tierPreset) {
        logger.warn('Tier preset not found, skipping limit check', { tierName, organizationId });
        return;
      }

      // Check if maxWorkerTypes limit exists
      if (!tierPreset.max_worker_types || tierPreset.max_worker_types === -1) {
        // No limit or unlimited
        return;
      }

      // Get current worker type count
      const templates = await this.workerTypeRepository.findTemplatesByOrganization(
        organizationId,
        { status: 'active' }
      );

      if (templates.length >= tierPreset.max_worker_types) {
        throw new Error(
          `Worker type limit reached for ${tierName} tier. Maximum: ${tierPreset.max_worker_types}`
        );
      }

    } catch (err) {
      if (err.message.includes('Worker type limit reached')) {
        throw err;
      }
      logger.error('Error checking worker type limit', { error: err.message, organizationId });
      // Don't block on limit check errors
    }
  }
}

export default WorkerTypeService;
