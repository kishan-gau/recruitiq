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
import { ValidationError, NotFoundError, ConflictError, ForbiddenError  } from '../../../middleware/errorHandler.js';
import { query  } from '../../../config/database.js';
import { 
  mapTemplateDbToApi, 
  mapTemplatesDbToApi, 
  mapTemplateApiToDb,
  mapAssignmentDbToApi,
  mapAssignmentsDbToApi,
  mapAssignmentApiToDb
} from '../dto/workerTypeDto.js';

class WorkerTypeService {
  constructor(repository = null) {
    this.workerTypeRepository = repository || new WorkerTypeRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  workerTypeTemplateSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).optional().allow(null, ''),
    defaultPayFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
    defaultPaymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').required(),
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
        organizationId
      });

      return mapTemplateDbToApi(dbTemplate);
    } catch (err) {
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
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = sort.sortBy || 'name';
      const sortOrder = sort.sortOrder || 'asc';

      // Build WHERE clause
      const conditions = ['organization_id = $1', 'deleted_at IS NULL'];
      const params = [organizationId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status === 'active') {
        conditions.push('status = \'active\'');
      } else if (filters.status === 'inactive') {
        conditions.push('status = \'inactive\'');
      }

      if (filters.benefitsEligible !== undefined) {
        params.push(filters.benefitsEligible);
        conditions.push(`benefits_eligible = $${paramIndex++}`);
      }

      if (filters.overtimeEligible !== undefined) {
        params.push(filters.overtimeEligible);
        conditions.push(`overtime_eligible = $${paramIndex++}`);
      }

      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(code) LIKE LOWER($${paramIndex}))`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Validate and map sort field
      const sortFieldMap = {
        name: 'name',
        code: 'code',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        payType: 'pay_type',
      };
      const sortField = sortFieldMap[sortBy] || 'name';
      const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM payroll.worker_type_template WHERE ${whereClause}`,
        params,
        organizationId
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await query(
        `SELECT 
          id, code, name, description,
          default_pay_frequency as "defaultPayFrequency",
          default_payment_method as "defaultPaymentMethod",
          benefits_eligible as "benefitsEligible",
          overtime_eligible as "overtimeEligible",
          pto_eligible as "ptoEligible",
          sick_leave_eligible as "sickLeaveEligible",
          vacation_accrual_rate as "vacationAccrualRate",
          status,
          organization_id as "organizationId",
          created_at as "createdAt", created_by as "createdBy",
          updated_at as "updatedAt", updated_by as "updatedBy"
        FROM payroll.worker_type_template
        WHERE ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset],
        organizationId
      );

      return {
        workerTypes: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
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
      const dbTemplates = await this.workerTypeRepository.findTemplatesByOrganization(organizationId, filters);
      return mapTemplatesDbToApi(dbTemplates);
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
      // Check if template exists at all (without org filter)
      const dbTemplate = await this.workerTypeRepository.findTemplateByIdAnyOrg(templateId);
      if (!dbTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      // Check organization ownership
      if (dbTemplate.organization_id !== organizationId) {
        throw new ForbiddenError('Access denied to resource from another organization');
      }
      
      return mapTemplateDbToApi(dbTemplate);
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
      // Check if template exists at all (without org filter)
      const existingTemplate = await this.workerTypeRepository.findTemplateByIdAnyOrg(templateId);
      if (!existingTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      // Check organization ownership
      if (existingTemplate.organization_id !== organizationId) {
        throw new ForbiddenError('Access denied to resource from another organization');
      }
      
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

      // Convert API format (camelCase) to DB format (snake_case)
      const dbUpdates = mapTemplateApiToDb(filteredUpdates);

      const dbTemplate = await this.workerTypeRepository.updateTemplate(
        templateId,
        dbUpdates,
        organizationId,
        userId
      );

      logger.info('Worker type template updated', {
        templateId,
        updatedFields: Object.keys(filteredUpdates),
        organizationId
      });

      return mapTemplateDbToApi(dbTemplate);
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
  /**
   * Delete worker type template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the template
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkerTypeTemplate(templateId, organizationId, userId) {
    try {
      // Check if template exists at all (without org filter)
      const existingTemplate = await this.workerTypeRepository.findTemplateByIdAnyOrg(templateId);
      if (!existingTemplate) {
        throw new NotFoundError('Worker type template not found');
      }
      
      // Check organization ownership
      if (existingTemplate.organization_id !== organizationId) {
        throw new ForbiddenError('Access denied to resource from another organization');
      }
      
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

      const dbAssignment = await this.workerTypeRepository.assignWorkerType(
        value,
        organizationId,
        userId
      );

      logger.info('Worker type assigned to employee', {
        assignmentId: dbAssignment.id,
        employeeId: dbAssignment.employee_id,
        templateId: dbAssignment.worker_type_template_id,
        organizationId
      });

      return mapAssignmentDbToApi(dbAssignment);
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
      const dbAssignment = await this.workerTypeRepository.findCurrentWorkerType(employeeRecordId, organizationId);
      return mapAssignmentDbToApi(dbAssignment);
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
      const dbHistory = await this.workerTypeRepository.findWorkerTypeHistory(employeeRecordId, organizationId);
      return mapAssignmentsDbToApi(dbHistory);
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

  /**
   * Get employees by worker type with pagination
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} pagination - Pagination options {page, limit}
   * @returns {Promise<Object>} {employees: [], pagination: {page, limit, total, totalPages, hasNext, hasPrev}}
   */
  async getEmployeesByWorkerType(workerTypeId, organizationId, pagination = {}) {
    try {
      const page = pagination.page || 1;
      const limit = Math.min(pagination.limit || 20, 100); // Max 100 per API standards
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total 
         FROM payroll.worker_type_assignment wta
         WHERE wta.worker_type_id = $1 
         AND wta.organization_id = $2 
         AND wta.deleted_at IS NULL`,
        [workerTypeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'worker_type_assignment' }
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get paginated employees
      const result = await query(
        `SELECT 
           wta.id,
           wta.employee_record_id as "employeeRecordId",
           wta.worker_type_id as "workerTypeId",
           wta.effective_date as "effectiveDate",
           wta.end_date as "endDate",
           wta.created_at as "createdAt",
           wta.updated_at as "updatedAt",
           e.first_name as "firstName",
           e.last_name as "lastName",
           e.email,
           e.employee_number as "employeeNumber"
         FROM payroll.worker_type_assignment wta
         LEFT JOIN public.employees e ON wta.employee_record_id = e.id
         WHERE wta.worker_type_id = $1 
         AND wta.organization_id = $2 
         AND wta.deleted_at IS NULL
         ORDER BY wta.created_at DESC
         LIMIT $3 OFFSET $4`,
        [workerTypeId, organizationId, limit, offset],
        organizationId,
        { operation: 'SELECT', table: 'worker_type_assignment' }
      );

      return {
        employees: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (err) {
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

// Export class for dependency injection and testing
export default WorkerTypeService;
