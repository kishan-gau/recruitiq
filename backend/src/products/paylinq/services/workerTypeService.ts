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
import PayStructureRepository from '../repositories/payStructureRepository.js';
import productConfig from '../config/product.config.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError  } from '../../../middleware/errorHandler.js';
import { query  } from '../../../config/database.js';
import { 
  mapWorkerTypeDbToApi, 
  mapWorkerTypesDbToApi, 
  mapWorkerTypeApiToDb,
  mapAssignmentDbToApi,
  mapAssignmentsDbToApi,
  mapAssignmentApiToDb
} from '../dto/workerTypeDto.js';

class WorkerTypeService {
  
  payStructureRepository: any;

  workerTypeRepository: any;

constructor(repository = null, payStructureRepository = null) {
    this.workerTypeRepository = repository || new WorkerTypeRepository();
    this.payStructureRepository = payStructureRepository || new PayStructureRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  workerTypeTemplateSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).optional().allow(null, ''),
    defaultPayFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
    defaultPaymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').required(),
    payStructureTemplateCode: Joi.string().min(2).max(50).optional().allow(null, ''),
    benefitsEligible: Joi.boolean().optional().default(false),
    overtimeEligible: Joi.boolean().optional().default(true),
    ptoEligible: Joi.boolean().optional().default(false),
    sickLeaveEligible: Joi.boolean().optional().default(false),
    vacationAccrualRate: Joi.number().min(0).max(1).optional().allow(null)
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
    const { error, value } = this.workerTypeTemplateSchema.validate(templateData, {
      stripUnknown: true,
      abortEarly: false
    });
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Validate pay structure template code if provided
      if (value.payStructureTemplateCode) {
        await this.validateTemplateCode(value.payStructureTemplateCode, organizationId);
      }

      // Check tier limits
      await this.checkWorkerTypeLimit(organizationId);

      // Check for duplicate code (only active records)
      const existing = await this.workerTypeRepository.findTemplateByCode(
        value.code,
        organizationId
      );

      if (existing) {
        throw new ConflictError(`Worker type template with code '${value.code}' already exists in your organization`);
      }

      const dbTemplate = await this.workerTypeRepository.createTemplate(
        value,
        organizationId,
        userId
      );

      logger.info('Worker type template created', {
        templateId: dbTemplate.id,
        templateCode: dbTemplate.code,
        payStructureTemplateCode: value.payStructureTemplateCode,
        organizationId
      });

      return mapWorkerTypeDbToApi(dbTemplate);
    } catch (_err) {
      logger.error('Error creating worker type template', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get worker type templates with pagination, filtering, and sorting
   * @param {string} organizationId - Organization UUID
   * @param {Object} pagination - Pagination params {page, limit}
   * @param {Object} filters - Filter params
   * @param {Object} sort - Sort params {sortBy, sortOrder}
   * @returns {Promise<Object>} Paginated worker types with metadata
   */
  async getWorkerTypes(organizationId, pagination = {}, filters = {}, sort = {}) {
    try {
      // Delegate to repository with proper structure
      const result = await this.workerTypeRepository.findAllWithPagination(
        organizationId,
        filters,
        {
          page: pagination.page || 1,
          limit: Math.min(pagination.limit || 20, 100),
          sortBy: sort.sortBy || 'name',
          sortOrder: sort.sortOrder || 'asc'
        }
      );
      
      // Transform worker types using DTO
      return {
        workerTypes: mapWorkerTypesDbToApi(result.workerTypes),
        pagination: result.pagination,
      };
    } catch (_err) {
      logger.error('Error fetching worker types', { error: err.message, organizationId });
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
      const dbTemplates = await this.workerTypeRepository.findAll(organizationId, filters);
      return mapWorkerTypesDbToApi(dbTemplates);
    } catch (_err) {
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
      // Query with organizationId to enforce tenant isolation
      const dbTemplate = await this.workerTypeRepository.findById(templateId, organizationId);
      if (!dbTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      return mapWorkerTypeDbToApi(dbTemplate);
    } catch (_err) {
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
      // Query with organizationId to enforce tenant isolation
      const existingTemplate = await this.workerTypeRepository.findById(templateId, organizationId);
      if (!existingTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      // Validate pay structure template code if being updated
      if (updates.payStructureTemplateCode !== undefined) {
        await this.validateTemplateCode(updates.payStructureTemplateCode, organizationId);
      }
      
      // Validate partial schema
      const allowedFields = [
        'name', 'description', 'defaultPayFrequency', 'defaultPaymentMethod',
        'benefitsEligible', 'overtimeEligible', 'ptoEligible', 
        'sickLeaveEligible', 'vacationAccrualRate', 'payStructureTemplateCode'
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

      // Convert API format (camelCase) to DB format (snake_case)
      const dbUpdates = mapWorkerTypeApiToDb(filteredUpdates);

      logger.info('updateWorkerTypeTemplate - Data transformation:', {
        filteredUpdates,
        dbUpdates,
        hasPayStructureTemplateCode: 'pay_structure_template_code' in dbUpdates
      });

      const dbTemplate = await this.workerTypeRepository.update(
        templateId,
        dbUpdates,
        organizationId,
        userId
      );

      logger.info('Worker type template updated', {
        templateId,
        updatedFields: Object.keys(filteredUpdates),
        payStructureTemplateCode: filteredUpdates.payStructureTemplateCode,
        organizationId
      });

      return mapWorkerTypeDbToApi(dbTemplate);
    } catch (_err) {
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
  /**
   * Delete worker type template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the template
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkerTypeTemplate(templateId, organizationId, userId) {
    try {
      // Query with organizationId to enforce tenant isolation
      const existingTemplate = await this.workerTypeRepository.findById(templateId, organizationId);
      if (!existingTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      const deleted = await this.workerTypeRepository.delete(
        templateId,
        organizationId,
        userId
      );

      if (deleted) {
        logger.info('Worker type template deleted', { templateId, organizationId });
      }

      return deleted;
    } catch (_err) {
      logger.error('Error deleting worker type template', { error: err.message, templateId });
      throw err;
    }
  }

  // ==================== ASSIGNMENTS ====================

  /**
   * Auto-assign pay structure template to worker when assigning worker type
   * Resolves template code to latest active version
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} templateCode - Pay structure template code
   * @param {Date} effectiveFrom - Effective from date
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignment
   * @returns {Promise<void>}
   * @private
   */
  async autoAssignPayStructureTemplate(
    employeeRecordId,
    templateCode,
    effectiveFrom,
    organizationId,
    userId
  ) {
    // Import PayStructureRepository to find template by code
    const PayStructureRepository = (await import('../repositories/payStructureRepository')).default;
    const payStructureRepo = new PayStructureRepository();

    // Find latest active version of template by code
    const templates = await payStructureRepo.findTemplates(organizationId, {
      templateCode,
      status: 'active'
    });

    if (templates.length === 0) {
      throw new NotFoundError(
        `No active pay structure template found with code: ${templateCode}`
      );
    }

    // Sort templates by version (descending) to get latest
    const sortedTemplates = templates.sort((a, b) => {
      if (a.version_major !== b.version_major) return b.version_major - a.version_major;
      if (a.version_minor !== b.version_minor) return b.version_minor - a.version_minor;
      return b.version_patch - a.version_patch;
    });

    const latestTemplate = sortedTemplates[0];

    logger.info('Resolved template code to latest version', {
      templateCode,
      latestTemplateId: latestTemplate.id,
      latestVersion: `${latestTemplate.version_major}.${latestTemplate.version_minor}.${latestTemplate.version_patch}`,
      organizationId
    });

    // Import PayStructureService to assign template
    const PayStructureService = (await import('./payStructureService')).default;
    const payStructureService = new PayStructureService(payStructureRepo);

    // Assign template to worker
    await payStructureService.assignTemplateToWorker(
      {
        employeeId: employeeRecordId,
        templateId: latestTemplate.id,
        assignmentType: 'worker_type',
        assignmentReason: `Auto-assigned from worker type template code: ${templateCode}`,
        effectiveFrom,
        effectiveTo: null
      },
      organizationId,
      userId
    );
  }

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

      const dbAssignment = await this.workerTypeRepository.assignWorkerType(
        value,
        organizationId,
        userId
      );

      logger.info('Worker type assigned to employee', {
        assignmentId: dbAssignment.id,
        employeeId: dbAssignment.employee_id,
        workerTypeId: dbAssignment.worker_type_id,
        organizationId
      });

      // Auto-assign pay structure template if worker type has template code
      if (template.pay_structure_template_code) {
        try {
          await this.autoAssignPayStructureTemplate(
            value.employeeRecordId,
            template.pay_structure_template_code,
            value.effectiveFrom,
            organizationId,
            userId
          );
          
          logger.info('Auto-assigned pay structure template from worker type', {
            employeeId: value.employeeRecordId,
            templateCode: template.pay_structure_template_code,
            workerTypeCode: template.code,
            organizationId
          });
        } catch (autoAssignError) {
          // Log but don't fail the worker type assignment if pay structure assignment fails
          logger.warn('Failed to auto-assign pay structure template', {
            employeeId: value.employeeRecordId,
            templateCode: template.pay_structure_template_code,
            error: autoAssignError.message,
            organizationId
          });
        }
      }

      return mapAssignmentDbToApi(dbAssignment);
    } catch (_err) {
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
      const dbAssignment = await this.workerTypeRepository.findCurrentWorkerType(employeeRecordId, organizationId);
      return mapAssignmentDbToApi(dbAssignment);
    } catch (_err) {
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
      const dbHistory = await this.workerTypeRepository.findWorkerTypeHistory(employeeRecordId, organizationId);
      return mapAssignmentsDbToApi(dbHistory);
    } catch (_err) {
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
        } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
      logger.error('Error fetching employee count by worker type', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get employees by worker type with pagination
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} pagination - Pagination options {page, limit}
   * @returns {Promise<Object>} {employees: [], pagination: {page, limit, total, totalPages, hasNext, hasPrev}}
   */
  async getEmployeesByWorkerType(workerTypeId, organizationId, pagination = {}) {
    try {
      // Delegate to repository
      return await this.workerTypeRepository.getEmployeesByWorkerType(
        workerTypeId,
        organizationId,
        pagination
      );
    } catch (_err) {
      logger.error('Error fetching employees by worker type', { 
        error: err.message, 
        workerTypeId, 
        organizationId 
      });
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
      // Get organization's tier using repository
      const tierName = await this.workerTypeRepository.getOrganizationTier(organizationId);

      if (!tierName) {
        throw new NotFoundError('Organization not found');
      }

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

    } catch (_err) {
      if (err.message.includes('Worker type limit reached')) {
        throw err;
      }
      logger.error('Error checking worker type limit', { error: err.message, organizationId });
      // Don't block on limit check errors
    }
  }

  // ==================== PAY STRUCTURE TEMPLATE UPGRADE ====================

  /**
   * Get upgrade status for a worker type template
   * Shows how many workers need template updates
   * @param {string} workerTypeId - Worker type template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Upgrade status with worker details
   */
  async getUpgradeStatus(workerTypeId, organizationId) {
    try {
      // Verify worker type exists
      const workerType = await this.workerTypeRepository.findById(workerTypeId, organizationId);
      if (!workerType) {
        throw new NotFoundError('Worker type not found');
      }

      // Get upgrade status from repository
      const status = await this.workerTypeRepository.getTemplateUpgradeStatus(workerTypeId, organizationId);
      
      if (!status) {
        throw new NotFoundError('Could not retrieve upgrade status');
      }

      // Get detailed list of employees needing upgrade
      const employeesNeedingUpgrade = await this.workerTypeRepository.getEmployeesNeedingTemplateUpgrade(
        workerTypeId, 
        organizationId
      );

      return {
        workerTypeId: status.worker_type_id,
        workerTypeName: status.worker_type_name,
        workerTypeCode: status.worker_type_code,
        targetTemplateCode: status.target_template_code,
        totalWorkers: parseInt(status.total_workers) || 0,
        upToDateCount: parseInt(status.up_to_date_count) || 0,
        outdatedCount: parseInt(status.outdated_count) || 0,
        requiresUpgrade: status.target_template_code && parseInt(status.outdated_count) > 0,
        workers: employeesNeedingUpgrade.map(w => ({
          employeeId: w.employee_id,
          employeeNumber: w.employee_number,
          employeeName: `${w.first_name} ${w.last_name}`,
          email: w.email,
          hireDate: w.hire_date,
          workerPayStructureId: w.worker_pay_structure_id,
          currentTemplateId: w.current_template_id,
          currentTemplateCode: w.current_template_code,
          currentTemplateName: w.current_template_name,
          currentTemplateVersion: w.current_template_version,
          targetTemplateId: w.target_template_id,
          targetTemplateCode: w.target_template_code,
          targetTemplateName: w.target_template_name,
          targetTemplateVersion: w.target_template_version,
          needsUpgrade: true
        }))
      };
    } catch (_err) {
      logger.error('Error getting upgrade status', { 
        error: err.message, 
        workerTypeId, 
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Upgrade workers to new pay structure template
   * Updates all or selected workers to the target template
   * @param {string} workerTypeId - Worker type template UUID
   * @param {Object} upgradeData - Upgrade parameters
   * @param {Array<string>} upgradeData.workerIds - Employee IDs to upgrade (optional - all if not provided)
   * @param {Date} upgradeData.effectiveDate - Effective date for upgrade (optional - now if not provided)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing upgrade
   * @returns {Promise<Object>} Upgrade result
   */
  async upgradeWorkersToTemplate(workerTypeId, upgradeData, organizationId, userId) {
    // Validation schema
    const upgradeSchema = Joi.object({
      workerIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
      effectiveDate: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
      ).optional().allow(null),
      notifyWorkers: Joi.boolean().optional().default(false)
    });

    const { error, value } = upgradeSchema.validate(upgradeData, {
      stripUnknown: true,
      abortEarly: false
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Get worker type with pay structure template reference
      const workerType = await this.workerTypeRepository.findById(workerTypeId, organizationId);
      if (!workerType) {
        throw new NotFoundError('Worker type template not found');
      }

      if (!workerType.pay_structure_template_code) {
        throw new ValidationError('Worker type does not have a pay structure template assigned');
      }

      // Resolve template code to template ID using pay structure repository
      // Note: This requires importing PayStructureRepository
      const PayStructureRepository = (await import('../repositories/payStructureRepository')).default;
      const payStructureRepo = new PayStructureRepository();
      const template = await payStructureRepo.findCurrentTemplateByCode(
        workerType.pay_structure_template_code,
        organizationId
      );

      if (!template) {
        throw new NotFoundError(`Pay structure template '${workerType.pay_structure_template_code}' not found`);
      }

      const templateId = template.id;

      // Get upgrade status to determine which workers need upgrade
      const status = await this.getUpgradeStatus(workerTypeId, organizationId);

      // Determine worker IDs to upgrade
      let targetWorkerIds = value.workerIds;
      
      if (!targetWorkerIds || targetWorkerIds.length === 0) {
        // Upgrade all workers that need it
        targetWorkerIds = status.workers
          .filter(w => w.needsUpgrade)
          .map(w => w.employeeId);
      } else {
        // Validate provided worker IDs belong to this worker type
        const validWorkerIds = new Set(status.workers.map(w => w.employeeId));
        const invalidIds = targetWorkerIds.filter(id => !validWorkerIds.has(id));
        
        if (invalidIds.length > 0) {
          throw new ValidationError(`Invalid worker IDs: ${invalidIds.join(', ')}`);
        }
      }

      if (targetWorkerIds.length === 0) {
        return {
          success: true,
          message: 'No workers need upgrading',
          upgradedCount: 0,
          workerIds: []
        };
      }

      // Perform bulk upgrade within transaction
      const { pool } = await import('../../../config/database');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Use repository method for bulk update
        const upgradedCount = await this.workerTypeRepository.bulkUpdateWorkerTemplates(
          targetWorkerIds,
          templateId,
          organizationId,
          userId,
          value.effectiveDate
        );

        await client.query('COMMIT');

        logger.info('Workers upgraded to pay structure template', {
          workerTypeId,
          templateCode: workerType.pay_structure_template_code,
          upgradedCount,
          organizationId,
          userId
        });

        return {
          success: true,
          message: `Successfully upgraded ${upgradedCount} worker(s)`,
          upgradedCount,
          workerIds: targetWorkerIds,
          templateCode: workerType.pay_structure_template_code,
          effectiveDate: value.effectiveDate
        };

      } catch (_error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (_err) {
      logger.error('Error upgrading workers to template', {
        error: err.message,
        workerTypeId,
        organizationId,
        userId
      });
      throw err;
    }
  }

  /**
   * Preview template upgrade
   * Shows what will change when upgrading workers to new template
   * @param {string} workerTypeId - Worker type template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Preview object with changes
   */
  async previewTemplateUpgrade(workerTypeId, organizationId) {
    try {
      // Get upgrade status first
      const status = await this.getUpgradeStatus(workerTypeId, organizationId);
      
      if (!status.requiresUpgrade) {
        return {
          requiresUpgrade: false,
          message: 'No upgrade needed - all workers are up to date',
          workersToUpgrade: 0,
          changes: []
        };
      }

      // Get the target template details
      const targetTemplate = await this.payStructureRepository.findTemplateByCode(
        status.targetTemplateCode,
        organizationId
      );

      if (!targetTemplate) {
        throw new NotFoundError(`Target template with code '${status.targetTemplateCode}' not found`);
      }

      // Get components for target template
      const targetComponents = await this.payStructureRepository.getTemplateComponents(
        targetTemplate.id,
        organizationId
      );

      // Group workers by their current template
      const workersByTemplate = {};
      for (const worker of status.workers.filter(w => w.needsUpgrade)) {
        const currentTemplateId = worker.currentTemplateId || 'none';
        if (!workersByTemplate[currentTemplateId]) {
          workersByTemplate[currentTemplateId] = {
            currentTemplateId,
            currentTemplateCode: worker.currentTemplateCode,
            currentTemplateName: worker.currentTemplateName,
            workers: [],
            changes: null
          };
        }
        workersByTemplate[currentTemplateId].workers.push(worker);
      }

      // Compare each current template with target template
      const changes = [];
      for (const [currentTemplateId, group] of Object.entries(workersByTemplate)) {
        let comparison;
        
        if (currentTemplateId === 'none') {
          // Workers with no template - all target components are additions
          comparison = {
            added: targetComponents.map(c => ({
              componentCode: c.component_code,
              componentName: c.component_name,
              componentType: c.component_type,
              calculationType: c.calculation_type,
              rate: c.rate,
              amount: c.amount
            })),
            removed: [],
            modified: []
          };
        } else {
          // Workers with existing template - compare
          comparison = await this.compareTemplates(
            currentTemplateId,
            targetTemplate.id,
            organizationId
          );
        }

        changes.push({
          fromTemplateId: currentTemplateId,
          fromTemplateCode: group.currentTemplateCode || null,
          fromTemplateName: group.currentTemplateName || 'No template',
          toTemplateId: targetTemplate.id,
          toTemplateCode: targetTemplate.templateCode,
          toTemplateName: targetTemplate.templateName,
          affectedWorkers: group.workers.length,
          componentsAdded: comparison.added,
          componentsRemoved: comparison.removed,
          componentsModified: comparison.modified
        });
      }

      // Flatten changes into a single list for UI display
      const flatChanges = [];
      let totalAdded = 0;
      let totalRemoved = 0;
      let totalModified = 0;

      for (const change of changes) {
        // Added components
        for (const comp of change.componentsAdded) {
          flatChanges.push({
            changeType: 'added',
            componentCode: comp.componentCode,
            componentName: comp.componentName,
            componentType: comp.componentType,
            description: `New ${comp.componentType} component: ${comp.componentName}`,
            details: {
              calculationType: comp.calculationType,
              rate: comp.rate,
              amount: comp.amount
            }
          });
          totalAdded++;
        }

        // Removed components
        for (const comp of change.componentsRemoved) {
          flatChanges.push({
            changeType: 'removed',
            componentCode: comp.componentCode,
            componentName: comp.componentName,
            componentType: comp.componentType,
            description: `Removed ${comp.componentType} component: ${comp.componentName}`,
            details: {
              calculationType: comp.calculationType,
              rate: comp.rate,
              amount: comp.amount
            }
          });
          totalRemoved++;
        }

        // Modified components
        for (const comp of change.componentsModified) {
          flatChanges.push({
            changeType: 'modified',
            componentCode: comp.componentCode,
            componentName: comp.componentName,
            componentType: comp.componentType,
            description: `Updated ${comp.componentType} component: ${comp.componentName}`,
            oldValue: comp.oldValue,
            newValue: comp.newValue,
            changes: comp.changes
          });
          totalModified++;
        }
      }

      return {
        requiresUpgrade: true,
        workersToUpgrade: status.outdatedCount,
        targetTemplate: {
          id: targetTemplate.id,
          code: targetTemplate.templateCode,
          name: targetTemplate.templateName,
          version: `${targetTemplate.versionMajor}.${targetTemplate.versionMinor}.${targetTemplate.versionPatch}`
        },
        componentsAdded: totalAdded,
        componentsRemoved: totalRemoved,
        componentsModified: totalModified,
        changes: flatChanges,
        detailedChanges: changes // Keep detailed breakdown if needed
      };

    } catch (_err) {
      logger.error('Error previewing template upgrade', {
        error: err.message,
        workerTypeId,
        organizationId
      });
      throw err;
    }
  }

  /**
   * Compare two pay structure templates
   * Shows components added, removed, and modified
   * @param {string} fromTemplateId - Source template UUID
   * @param {string} toTemplateId - Target template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Comparison object
   */
  async compareTemplates(fromTemplateId, toTemplateId, organizationId) {
    try {
      // Get components for both templates
      const [fromComponents, toComponents] = await Promise.all([
        this.payStructureRepository.getTemplateComponents(fromTemplateId, organizationId),
        this.payStructureRepository.getTemplateComponents(toTemplateId, organizationId)
      ]);

      // Create maps for easy lookup
      const fromMap = new Map(fromComponents.map(c => [c.component_code, c]));
      const toMap = new Map(toComponents.map(c => [c.component_code, c]));

      // Find added components (in target but not in source)
      const added = toComponents
        .filter(c => !fromMap.has(c.component_code))
        .map(c => ({
          componentCode: c.component_code,
          componentName: c.component_name,
          componentType: c.component_type,
          calculationType: c.calculation_type,
          rate: c.rate,
          amount: c.amount,
          sequenceOrder: c.sequence_order
        }));

      // Find removed components (in source but not in target)
      const removed = fromComponents
        .filter(c => !toMap.has(c.component_code))
        .map(c => ({
          componentCode: c.component_code,
          componentName: c.component_name,
          componentType: c.component_type,
          calculationType: c.calculation_type,
          rate: c.rate,
          amount: c.amount,
          sequenceOrder: c.sequence_order
        }));

      // Find modified components (in both but with different values)
      const modified = [];
      for (const [code, fromComp] of fromMap.entries()) {
        const toComp = toMap.get(code);
        if (toComp) {
          const changes = [];
          
          if (fromComp.calculation_type !== toComp.calculation_type) {
            changes.push({
              field: 'calculationType',
              from: fromComp.calculation_type,
              to: toComp.calculation_type
            });
          }
          
          if (fromComp.rate !== toComp.rate) {
            changes.push({
              field: 'rate',
              from: fromComp.rate,
              to: toComp.rate
            });
          }
          
          if (fromComp.amount !== toComp.amount) {
            changes.push({
              field: 'amount',
              from: fromComp.amount,
              to: toComp.amount
            });
          }
          
          if (fromComp.sequence_order !== toComp.sequence_order) {
            changes.push({
              field: 'sequenceOrder',
              from: fromComp.sequence_order,
              to: toComp.sequence_order
            });
          }

          if (changes.length > 0) {
            modified.push({
              componentCode: code,
              componentName: fromComp.component_name,
              componentType: fromComp.component_type,
              changes
            });
          }
        }
      }

      return {
        added,
        removed,
        modified
      };

    } catch (_err) {
      logger.error('Error comparing templates', {
        error: err.message,
        fromTemplateId,
        toTemplateId,
        organizationId
      });
      throw err;
    }
  }

  /**
   * Validate pay structure template code exists
   * @param {string} templateCode - Template code to validate
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if exists and active
   * @throws {ValidationError} If template doesn't exist
   */
  async validateTemplateCode(templateCode, organizationId) {
    if (!templateCode) return true; // Optional field
    
    try {
      const template = await this.payStructureRepository.findTemplateByCode(
        templateCode,
        organizationId
      );
      
      if (!template) {
        throw new ValidationError(
          `Pay structure template with code '${templateCode}' not found or is not active`
        );
      }
      
      return true;
    } catch (_err) {
      if (err instanceof ValidationError) throw err;
      
      logger.error('Error validating template code', {
        error: err.message,
        templateCode,
        organizationId
      });
      throw err;
    }
  }
}

// Export class for dependency injection and testing
export default WorkerTypeService;
