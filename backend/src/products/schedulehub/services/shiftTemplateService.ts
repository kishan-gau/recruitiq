/**
 * Shift Template Service
 * Business logic for managing shift templates and their role requirements
 * 
 * @module products/schedulehub/services/shiftTemplateService
 */

import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { ShiftTemplateData, TemplateRoleData, TemplateStationData } from '../../../types/schedulehub.types.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../utils/errors.js';
import ShiftTemplateRepository from '../repositories/ShiftTemplateRepository.js';
import ShiftTemplateStationService from './ShiftTemplateStationService.js';
import {
  mapShiftTemplateDbToApi,
  mapShiftTemplatesDbToApi,
  mapShiftTemplateApiToDb,
  mapTemplateRoleDbToApi,
  mapTemplateRolesDbToApi,
  mapTemplateRoleApiToDb,
  mapTemplatesToSummary
} from '../dto/shiftTemplateDto.js';

/**
 * Service for managing shift templates with station assignments
 */
class ShiftTemplateService {
  repository: ShiftTemplateRepository;
  shiftTemplateStationService: ShiftTemplateStationService;

  /**
   * Constructor with dependency injection
   * @param repository - Shift template repository instance
   * @param shiftTemplateStationService - Station assignment service instance
   */
  constructor(repository: ShiftTemplateRepository | null = null, shiftTemplateStationService: ShiftTemplateStationService | null = null) {
    this.repository = repository || new ShiftTemplateRepository();
    this.shiftTemplateStationService = shiftTemplateStationService || new ShiftTemplateStationService();
  }

  /**
   * Joi validation schema for updating shift templates
   */
  static get updateSchema() {
    return Joi.object({
      templateName: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .optional()
        .messages({
          'string.empty': 'Template name cannot be empty',
          'string.min': 'Template name must be at least 3 characters',
          'string.max': 'Template name cannot exceed 100 characters'
        }),

      templateDescription: Joi.string()
        .trim()
        .allow('')
        .max(500)
        .optional()
        .messages({
          'string.max': 'Description cannot exceed 500 characters'
        }),

      shiftDuration: Joi.number()
        .integer()
        .min(1)
        .max(24)
        .optional()
        .messages({
          'number.min': 'Shift duration must be at least 1 hour',
          'number.max': 'Shift duration cannot exceed 24 hours'
        }),

      breakDuration: Joi.number()
        .integer()
        .min(0)
        .max(480)
        .optional()
        .messages({
          'number.min': 'Break duration cannot be negative',
          'number.max': 'Break duration cannot exceed 8 hours'
        }),

      requiredStaffCount: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .messages({
          'number.min': 'At least 1 staff member is required',
          'number.max': 'Staff count cannot exceed 100'
        }),

      isActive: Joi.boolean().optional(),

      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .unique()
        .optional()
        .allow(null)
        .messages({
          'string.guid': 'Each station ID must be a valid UUID',
          'array.unique': 'Duplicate station IDs are not allowed'
        })
    }).min(1).options({ stripUnknown: true });
  }

  /**
   * Joi validation schema for creating shift templates
   */
  static get createSchema() {
    return Joi.object({
      templateName: Joi.string()
        .required()
        .trim()
        .min(3)
        .max(100)
        .messages({
          'string.empty': 'Template name is required',
          'string.min': 'Template name must be at least 3 characters',
          'string.max': 'Template name cannot exceed 100 characters'
        }),
      
      description: Joi.string()
        .optional()
        .allow(null, '')
        .max(500)
        .messages({
          'string.max': 'Description cannot exceed 500 characters'
        }),
      
      startTime: Joi.string()
        .required()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
          'string.pattern.base': 'Start time must be in HH:MM format'
        }),
      
      endTime: Joi.string()
        .required()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
          'string.pattern.base': 'End time must be in HH:MM format'
        }),
      
      breakDuration: Joi.number()
        .integer()
        .min(0)
        .max(480)
        .default(0)
        .messages({
          'number.max': 'Break duration cannot exceed 480 minutes (8 hours)'
        }),
      
      durationMinutes: Joi.number()
        .integer()
        .positive()
        .max(1440)  // 24 hours in minutes
        .optional()
        .messages({
          'number.max': 'Duration cannot exceed 1440 minutes (24 hours)'
        }),
      
      breakPaid: Joi.boolean()
        .default(true)
        .messages({
          'boolean.base': 'Break paid must be true or false'
        }),
      
      templateType: Joi.string()
        .valid('regular', 'overtime', 'on_call', 'training')
        .default('regular')
        .messages({
          'any.only': 'Template type must be regular, overtime, on_call, or training'
        }),
      
      colorCode: Joi.string()
        .optional()
        .allow(null, '')
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .messages({
          'string.pattern.base': 'Color code must be a valid hex color (e.g., #FF5733)'
        }),
      
      isActive: Joi.boolean().default(true),
      
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .max(50)
        .optional()
        .unique()
        .messages({
          'array.min': 'At least one station is required when specifying stations',
          'array.max': 'Cannot exceed 50 stations per template',
          'array.unique': 'Station IDs must be unique',
          'string.guid': 'Each station ID must be a valid UUID'
        }),
      
      roleRequirements: Joi.array()
        .items(Joi.object({
          roleId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).max(50).required(),
          minimumProficiency: Joi.number().integer().min(1).max(5).default(1),
          preferredProficiency: Joi.number().integer().min(1).max(5).default(3),
          isPrimaryRole: Joi.boolean().default(false),
          priority: Joi.number().integer().min(1).max(10).default(1),
          isFlexible: Joi.boolean().default(false)
        }))
        .min(1)
        .max(20)
        .required()
        .messages({
          'array.min': 'At least one role requirement is required',
          'array.max': 'Cannot exceed 20 role requirements'
        })
    }).options({ 
      stripUnknown: true,
      abortEarly: false
    });
  }

  /**
   * Joi validation schema for updating shift templates
   */
  static get updateSchema() {
    return Joi.object({
      templateName: Joi.string()
        .optional()
        .trim()
        .min(3)
        .max(100),
      
      description: Joi.string()
        .optional()
        .allow(null, '')
        .max(500),
      
      startTime: Joi.string()
        .required()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
          'any.required': 'Start time is required',
          'string.pattern.base': 'Start time must be in HH:MM format'
        }),
      
      endTime: Joi.string()
        .required()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
          'any.required': 'End time is required',
          'string.pattern.base': 'End time must be in HH:MM format'
        }),
      
      breakDuration: Joi.number()
        .integer()
        .min(0)
        .max(480)
        .optional(),
      
      totalHours: Joi.number()
        .positive()
        .max(24)
        .optional()
        .allow(null),
      
      isFlexible: Joi.boolean().optional(),
      flexibilityMinutes: Joi.number().integer().min(0).max(120).optional(),
      isRecurring: Joi.boolean().optional(),
      
      recurrencePattern: Joi.string()
        .optional()
        .allow(null, '')
        .valid('daily', 'weekly', 'monthly', 'custom'),
      
      validityStartDate: Joi.date().optional().allow(null).iso(),
      validityEndDate: Joi.date().optional().allow(null).iso(),
      
      priority: Joi.number().integer().min(1).max(10).optional(),
      isActive: Joi.boolean().optional(),
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .min(0)
        .max(50)
        .optional()
        .unique()
        .messages({
          'array.max': 'Cannot exceed 50 stations per template',
          'array.unique': 'Station IDs must be unique',
          'string.guid': 'Each station ID must be a valid UUID'
        }),
      
      roleRequirements: Joi.array()
        .items(Joi.object({
          roleId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).max(50).required(),
          minimumProficiency: Joi.number().integer().min(1).max(5).default(1),
          preferredProficiency: Joi.number().integer().min(1).max(5).default(3),
          isPrimaryRole: Joi.boolean().default(false),
          priority: Joi.number().integer().min(1).max(10).default(1),
          isFlexible: Joi.boolean().default(false)
        }))
        .min(1)
        .max(20)
        .optional()
    }).min(1).options({ 
      stripUnknown: true,
      abortEarly: false
    });
  }

  /**
   * Creates a new shift template with role requirements
   */
  async create(data, organizationId, userId) {
    try {
      console.log('🚀 START CREATE - Raw input data:', JSON.stringify(data, null, 2));
      
      // Validate input
      const { error, value } = ShiftTemplateService.createSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message, error.details);
      }

      // Check for duplicate template name
      await this._checkDuplicateName(value.templateName, organizationId);

      // Validate role requirements exist
      await this._validateRoleRequirements(value.roleRequirements, organizationId);

      // Calculate total hours if not provided
      if (!value.totalHours) {
        value.totalHours = this._calculateTotalHours(value.startTime, value.endTime, value.breakDuration);
      }

      // Validate stations exist if provided
      if (value.stationIds && value.stationIds.length > 0) {
        await this._validateStationsExist(value.stationIds, organizationId);
      }

      const templateId = uuidv4();
      const now = new Date();

      // Transform API data to database format
      const dtoMapped = mapShiftTemplateApiToDb(value);

      // Prepare template data
      const templateData = {
        id: templateId,
        organization_id: organizationId,
        ...dtoMapped,
        created_by: userId,
        updated_by: userId,
        created_at: now,
        updated_at: now
      };

      // Use transaction for template + role requirements
      const client = await query.getClient();
      
      try {
        await client.query('BEGIN');

        // Insert shift template
        const templateResult = await client.query(`
          INSERT INTO shift_templates (
            id, organization_id, template_name, description, start_time, end_time,
            duration_minutes, break_duration_minutes, break_paid, template_type,
            is_active, color_code, created_by, updated_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `, [
          templateData.id, templateData.organization_id, templateData.template_name,
          templateData.description, templateData.start_time, templateData.end_time,
          templateData.duration_minutes, templateData.break_duration_minutes, templateData.break_paid,
          templateData.template_type, templateData.is_active, templateData.color_code,
          templateData.created_by, templateData.updated_by, templateData.created_at, templateData.updated_at
        ]);

        const template = templateResult.rows[0];

        // Insert role requirements
        const roleRequirements = [];
        for (const roleReq of value.roleRequirements) {
          console.log('📋 Role Requirement Before DTO:', roleReq);
          const roleData = mapTemplateRoleApiToDb(roleReq);
          console.log('✅ Role Data After DTO:', roleData);
          
          const sqlParams = [
            uuidv4(), templateId, roleData.role_id, roleData.required_count,
            roleData.min_proficiency, roleData.is_supervisor, roleData.priority, organizationId, now
          ];
          console.log('🗄️ SQL Parameters being inserted:', sqlParams);
          console.log('🔍 min_proficiency value type and value:', typeof sqlParams[4], sqlParams[4]);
          
          const roleResult = await client.query(`
            INSERT INTO shift_template_roles (
              id, template_id, role_id, required_count, min_proficiency,
              is_supervisor, priority, organization_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `, sqlParams);

          roleRequirements.push(roleResult.rows[0]);
        }

        // Assign stations if provided
        const assignedStations = [];
        if (value.stationIds && value.stationIds.length > 0) {
          const stationAssignments = await this.shiftTemplateStationService.bulkAssignStations(
            {
              templateId: templateId,
              stationIds: value.stationIds
            },
            organizationId,
            userId,
            client  // Pass transaction client
          );
          assignedStations.push(...stationAssignments);
        }

        await client.query('COMMIT');

        // Return complete template with roles and stations
        const completeTemplate = {
          ...template,
          roleRequirements: mapTemplateRolesDbToApi(roleRequirements),
          stations: assignedStations
        };

        logger.info('Shift template created successfully', {
          templateId: template.id,
          templateName: template.template_name,
          roleCount: roleRequirements.length,
          stationCount: assignedStations.length,
          organizationId,
          userId
        });

        return mapShiftTemplateDbToApi(completeTemplate);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error creating shift template', {
        error: error.message,
        data: { templateName: data?.templateName },
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Retrieves all shift templates with optional filtering
   */
  async getAll(organizationId, filters = {}) {
    try {
      let whereConditions = ['st.organization_id = $1', 'st.deleted_at IS NULL'];
      let queryParams = [organizationId];
      let paramCount = 1;

      // Apply filters
      if (filters.isActive !== undefined) {
        paramCount++;
        whereConditions.push(`st.is_active = $${paramCount}`);
        queryParams.push(filters.isActive);
      }

      if (filters.stationId) {
        paramCount++;
        whereConditions.push(`EXISTS (
          SELECT 1 FROM scheduling.shift_template_stations sts
          WHERE sts.template_id = st.id 
            AND sts.station_id = $${paramCount}
            AND sts.organization_id = $1
        )`);
        queryParams.push(filters.stationId);
      }

      if (filters.search) {
        paramCount++;
        whereConditions.push(`(st.template_name ILIKE $${paramCount} OR st.description ILIKE $${paramCount})`);
        queryParams.push(`%${filters.search}%`);
      }

      if (filters.priority) {
        paramCount++;
        whereConditions.push(`st.priority = $${paramCount}`);
        queryParams.push(filters.priority);
      }

      // Build query with role count and usage statistics
      const queryText = `
        SELECT 
          st.*,
          COUNT(DISTINCT str.id) as role_count,
          COALESCE(SUM(str.required_count), 0) as total_workers
        FROM scheduling.shift_templates st
        LEFT JOIN scheduling.shift_template_roles str ON st.id = str.template_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY st.id
        ORDER BY st.priority ASC, st.template_name ASC
      `;

      const result = await query(queryText, queryParams, organizationId, {
        operation: 'SELECT',
        table: 'shift_templates'
      });

      // Add stations to each template
      const templatesWithStations = await Promise.all(
        result.rows.map(async (template) => {
          const stations = await this.shiftTemplateStationService.getStationsByTemplate(template.id, organizationId);
          return {
            ...template,
            stations
          };
        })
      );

      return mapShiftTemplatesDbToApi(templatesWithStations);

    } catch (error) {
      logger.error('Error retrieving shift templates', {
        error: error.message,
        filters,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Retrieves a single shift template by ID with role requirements
   */
  async getById(id, organizationId, userId) {
    console.log('🚨 [SERVICE] getById CALLED with:', { id, organizationId, userId });
    try {
      // Get template with station info
      const templateResult = await query(`
        SELECT st.*
        FROM scheduling.shift_templates st
        WHERE st.id = $1 
          AND st.organization_id = $2 
          AND st.deleted_at IS NULL
      `, [id, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'shift_templates'
      });

      if (templateResult.rows.length === 0) {
        throw new NotFoundError('Shift template not found');
      }

      const template = templateResult.rows[0];

      // Get role requirements with role details
      // First, let's check if template roles exist at all
      const templateRolesCheck = await query(`
        SELECT COUNT(*) as count
        FROM scheduling.shift_template_roles
        WHERE template_id = $1 AND organization_id = $2
      `, [id, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.shift_template_roles'
      });
      
      logger.info('Template roles count check', {
        templateId: id,
        organizationId,
        count: templateRolesCheck.rows[0].count,
        queryParams: [id, organizationId]
      });
      
      console.log('🔍 [SERVICE] Template roles count:', templateRolesCheck.rows[0]?.count || 0);
      console.log('🔍 [SERVICE] Query params:', { id, organizationId });
      
      // Also check if the template itself exists in shift_template_roles
      const debugCheck = await query(`
        SELECT template_id, organization_id, role_id, required_count
        FROM scheduling.shift_template_roles
        WHERE template_id = $1
        LIMIT 3
      `, [id], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.shift_template_roles'
      });
      
      logger.info('Debug: Raw shift_template_roles records', {
        templateId: id,
        debugRecords: debugCheck.rows
      });
      
      console.log('🔍 [SERVICE] Debug raw records:', debugCheck.rows);
      
      // Check if ANY records exist in the table
      const anyRecords = await query(`
        SELECT COUNT(*) as total
        FROM scheduling.shift_template_roles
      `, [], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.shift_template_roles'
      });
      console.log('🔍 [SERVICE] Total records in shift_template_roles table:', anyRecords.rows[0]?.total || 0);

      const rolesResult = await query(`
        SELECT 
          str.*,
          r.role_name,
          r.role_code,
          r.description as role_description,
          r.color as role_color,
          r.requires_certification,
          r.certification_types,
          r.skill_level,
          r.hourly_rate
        FROM scheduling.shift_template_roles str
        JOIN scheduling.roles r ON str.role_id = r.id
        WHERE str.template_id = $1
          AND str.organization_id = $2
          AND r.organization_id = $2
        ORDER BY str.priority ASC, str.is_supervisor DESC, r.role_name ASC
      `, [id, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.shift_template_roles'
      });

      // Combine template with roles
      logger.info('ShiftTemplateService.getById - Raw roles from DB', {
        templateId: id,
        organizationId,
        rolesCount: rolesResult.rows.length,
        rawRoles: rolesResult.rows
      });
      
      const mappedRoles = mapTemplateRolesDbToApi(rolesResult.rows);
      
      logger.info('ShiftTemplateService.getById - Mapped roles', {
        templateId: id,
        mappedRolesCount: mappedRoles.length,
        mappedRoles
      });
      
      console.log('🔍 [SERVICE] Main roles query returned:', rolesResult.rows.length, 'rows');
      console.log('🔍 [SERVICE] Raw roles data (first 2):', rolesResult.rows.slice(0, 2));
      console.log('🔍 [SERVICE] Mapped roles count:', mappedRoles.length);
      console.log('🔍 [SERVICE] Mapped roles:', mappedRoles);
      
      // Get assigned stations for template
      const templateStations = await this.shiftTemplateStationService.getStationsByTemplate(id, organizationId);
      
      const completeTemplate = {
        ...template,
        roleRequirements: mappedRoles,
        stations: templateStations
      };
      
      console.log('🔍 [SERVICE] completeTemplate keys:', Object.keys(completeTemplate));
      console.log('🔍 [SERVICE] completeTemplate.roleRequirements:', completeTemplate.roleRequirements);
      
      logger.info('ShiftTemplateService.getById - Complete template before DTO', {
        templateId: id,
        templateKeys: Object.keys(completeTemplate),
        roleRequirementsCount: completeTemplate.roleRequirements?.length || 0,
        templateData: {
          id: template.id,
          templateName: template.template_name,
          originalRoleCount: rolesResult.rows.length,
          mappedRoleCount: mappedRoles.length,
          roleRequirements: completeTemplate.roleRequirements
        }
      });

      const finalResult = mapShiftTemplateDbToApi(completeTemplate);
      
      logger.info('ShiftTemplateService.getById - Final result after DTO', {
        templateId: id,
        resultKeys: Object.keys(finalResult),
        roleRequirementsCount: finalResult.roleRequirements?.length || 0,
        roleRequirements: finalResult.roleRequirements
      });
      
      return finalResult;

    } catch (error) {
      logger.error('Error retrieving shift template', {
        error: error.message,
        templateId: id,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Updates an existing shift template
   */
  async update(id, data, organizationId, userId) {
    try {
      // Validate input
      const { error, value } = ShiftTemplateService.updateSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message, error.details);
      }

      // Verify template exists
      const existingTemplate = await this.getById(id, organizationId);
      if (!existingTemplate) {
        throw new NotFoundError('Shift template not found');
      }

      // Check for duplicate name if changing
      if (value.templateName && value.templateName !== existingTemplate.templateName) {
        await this._checkDuplicateName(value.templateName, organizationId, id);
      }

      // Validate role requirements if provided
      if (value.roleRequirements) {
        await this._validateRoleRequirements(value.roleRequirements, organizationId);
      }

      // Validate stations if changing
      if (value.stationIds && value.stationIds.length > 0) {
        await this._validateStationsExist(value.stationIds, organizationId);
      }

      // Calculate total hours if times changed
      if ((value.startTime || value.endTime || value.breakDuration !== undefined) && !value.totalHours) {
        const startTime = value.startTime || existingTemplate.startTime;
        const endTime = value.endTime || existingTemplate.endTime;
        const breakDuration = value.breakDuration !== undefined ? value.breakDuration : existingTemplate.breakDuration;
        value.totalHours = this._calculateTotalHours(startTime, endTime, breakDuration);
      }

      const client = await query.getClient();
      
      try {
        await client.query('BEGIN');

        // Update template
        const templateData = mapShiftTemplateApiToDb(value);
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        Object.keys(templateData).forEach(key => {
          if (templateData[key] !== undefined) {
            paramCount++;
            updateFields.push(`${key} = $${paramCount}`);
            updateValues.push(templateData[key]);
          }
        });

        if (updateFields.length > 0) {
          paramCount++;
          updateFields.push(`updated_by = $${paramCount}`);
          updateValues.push(userId);
          
          paramCount++;
          updateFields.push(`updated_at = $${paramCount}`);
          updateValues.push(new Date());

          updateValues.push(id, organizationId);

          const templateResult = await client.query(`
            UPDATE shift_templates
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} AND deleted_at IS NULL
            RETURNING *
          `, updateValues);

          if (templateResult.rows.length === 0) {
            throw new NotFoundError('Shift template not found');
          }
        }

        // Update role requirements if provided
        if (value.roleRequirements) {
          // Delete existing role requirements
          await client.query(`
            DELETE FROM shift_template_roles WHERE template_id = $1
          `, [id]);

          // Insert new role requirements
          const now = new Date();
          for (const roleReq of value.roleRequirements) {
            const roleData = mapTemplateRoleApiToDb(roleReq);
            await client.query(`
              INSERT INTO shift_template_roles (
                id, template_id, role_id, required_count, min_proficiency,
                is_supervisor, priority, organization_id, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              uuidv4(), id, roleData.role_id, roleData.required_count,
              roleData.min_proficiency, roleData.is_supervisor, roleData.priority, organizationId, now
            ]);
          }
        }

        // Update station assignments if provided
        if (value.stationIds !== undefined) {
          await this.shiftTemplateStationService.updateTemplateStations(
            {
              templateId: id,
              stationIds: value.stationIds
            },
            organizationId,
            userId,
            client  // Pass transaction client
          );
          logger.info('Updated station assignments for template', {
            templateId: id,
            stationCount: value.stationIds.length,
            stationIds: value.stationIds,
            organizationId,
            userId
          });
        }

        await client.query('COMMIT');

        logger.info('Shift template updated successfully', {
          templateId: id,
          updatedFields: Object.keys(value),
          organizationId,
          userId
        });

        // Return updated template
        return await this.getById(id, organizationId);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error updating shift template', {
        error: error.message,
        templateId: id,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Soft deletes a shift template
   */
  async delete(id, organizationId, userId) {
    try {
      // Check if template exists
      const existingTemplate = await this.getById(id, organizationId);
      if (!existingTemplate) {
        throw new NotFoundError('Shift template not found');
      }

      // Check if template is in use
      const usageResult = await query(`
        SELECT COUNT(*) as usage_count
        FROM scheduling.shift_assignments
        WHERE template_id = $1
      `, [id], organizationId, {
        operation: 'SELECT',
        table: 'shift_assignments'
      });

      const usageCount = parseInt(usageResult.rows[0].usage_count);
      if (usageCount > 0) {
        throw new ConflictError(`Cannot delete template. It is currently used in ${usageCount} shift assignment(s).`);
      }

      // Soft delete
      await query(`
        UPDATE shift_templates
        SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW(), updated_by = $1
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      `, [userId, id, organizationId], organizationId, {
        operation: 'UPDATE',
        table: 'shift_templates'
      });

      logger.info('Shift template deleted successfully', {
        templateId: id,
        templateName: existingTemplate.templateName,
        organizationId,
        userId
      });

    } catch (error) {
      logger.error('Error deleting shift template', {
        error: error.message,
        templateId: id,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Gets template summaries for dropdowns/selections
   */
  async getSummaries(organizationId, filters = {}) {
    try {
      let whereConditions = ['st.organization_id = $1', 'st.deleted_at IS NULL', 'st.is_active = true'];
      let queryParams = [organizationId];
      let paramCount = 1;

      if (filters.stationId) {
        paramCount++;
        whereConditions.push(`st.station_id = $${paramCount}`);
        queryParams.push(filters.stationId);
      }

      const result = await query(`
        SELECT 
          st.id, st.template_name, st.description, st.start_time, st.end_time,
          st.total_hours, st.is_active, st.priority,
          COUNT(DISTINCT str.id) as role_count,
          COALESCE(SUM(str.quantity), 0) as total_workers
        FROM shift_templates st
        LEFT JOIN shift_template_roles str ON st.id = str.template_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY st.id
        ORDER BY st.priority ASC, st.template_name ASC
      `, queryParams, organizationId, {
        operation: 'SELECT',
        table: 'shift_templates'
      });

      return mapTemplatesToSummary(result.rows);

    } catch (error) {
      logger.error('Error retrieving template summaries', {
        error: error.message,
        filters,
        organizationId
      });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Checks for duplicate template name
   */
  async _checkDuplicateName(templateName, organizationId, excludeId = null) {
    let whereConditions = ['organization_id = $1', 'LOWER(template_name) = $2', 'deleted_at IS NULL'];
    let queryParams = [organizationId, templateName.toLowerCase()];
    let paramCount = 2;

    if (excludeId) {
      paramCount++;
      whereConditions.push(`id != $${paramCount}`);
      queryParams.push(excludeId);
    }

    const result = await query(`
      SELECT id FROM shift_templates
      WHERE ${whereConditions.join(' AND ')}
      LIMIT 1
    `, queryParams, organizationId, {
      operation: 'SELECT',
      table: 'shift_templates'
    });

    if (result.rows.length > 0) {
      throw new ConflictError('A shift template with this name already exists');
    }
  }

  /**
   * Validates that all role requirements reference existing roles
   */
  async _validateRoleRequirements(roleRequirements, organizationId) {
    const roleIds = roleRequirements.map(req => req.roleId);
    
    const result = await query(`
      SELECT id FROM scheduling.roles
      WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
    `, [roleIds, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'roles'
    });

    const foundRoleIds = result.rows.map(row => row.id);
    const missingRoleIds = roleIds.filter(id => !foundRoleIds.includes(id));

    if (missingRoleIds.length > 0) {
      throw new ValidationError(`Invalid role IDs: ${missingRoleIds.join(', ')}`);
    }
  }

  /**
   * Validates that station exists and belongs to organization
   */
  async _validateStationExists(stationId, organizationId) {
    const result = await query(`
      SELECT id FROM scheduling.stations
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [stationId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'stations'
    });

    if (result.rows.length === 0) {
      throw new ValidationError('Invalid station ID');
    }
  }

  /**
   * Calculates total hours between start and end time minus break
   */
  _calculateTotalHours(startTime, endTime, breakDuration = 0) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    const totalMinutes = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60) - startMinutes + endMinutes;
    
    return Math.round(((totalMinutes - breakDuration) / 60) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Find a station by ID
   * @private
   */
  async findStationById(stationId, organizationId) {
    const result = await query(`
      SELECT id, station_code, station_name, description
      FROM scheduling.stations
      WHERE id = $1 
        AND organization_id = $2 
        AND deleted_at IS NULL
    `, [stationId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'stations'
    });

    return result.rows[0] || null;
  }

  /**
   * Assign a station to a shift template
   * @private
   */
  async assignStationToTemplate(templateId, stationId, organizationId, userId) {
    await query(`
      INSERT INTO shift_template_stations (
        id, shift_template_id, station_id, organization_id,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      uuidv4(),
      templateId,
      stationId,
      organizationId,
      userId
    ], organizationId, {
      operation: 'INSERT',
      table: 'shift_template_stations'
    });
  }

  /**
   * Clear all station assignments for a shift template
   * @private
   */
  async clearStationAssignments(templateId, organizationId) {
    await query(`
      DELETE FROM shift_template_stations
      WHERE shift_template_id = $1 
        AND organization_id = $2
    `, [templateId, organizationId], organizationId, {
      operation: 'DELETE',
      table: 'shift_template_stations'
    });
  }

  /**
   * Find all stations assigned to a shift template
   * @private
   */
  async findStationsByTemplateId(templateId, organizationId) {
    const result = await query(`
      SELECT s.id, s.station_code, s.station_name, s.description
      FROM scheduling.stations s
      INNER JOIN shift_template_stations sts ON s.id = sts.station_id
      WHERE sts.shift_template_id = $1 
        AND sts.organization_id = $2
        AND s.deleted_at IS NULL
      ORDER BY s.station_name
    `, [templateId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'stations'
    });

    return result.rows;
  }

  /**
   * Remove specific station assignments from a shift template
   * @private
   */
  async removeStationAssignments(templateId, stationIds, organizationId) {
    if (stationIds.length === 0) return;

    const placeholders = stationIds.map((_, index) => `$${index + 3}`).join(',');
    
    await query(`
      DELETE FROM shift_template_stations
      WHERE shift_template_id = $1 
        AND organization_id = $2
        AND station_id IN (${placeholders})
    `, [templateId, organizationId, ...stationIds], organizationId, {
      operation: 'DELETE',
      table: 'shift_template_stations'
    });
  }

  /**
   * Assign stations to a shift template
   * @param {string} templateId - Template UUID
   * @param {Array<string>} stationIds - Array of station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the operation
   * @returns {Promise<Array>} Array of assigned station records
   */
  async assignStations(templateId, stationIds, organizationId, userId) {
    try {
      // Validate template exists
      const template = await this.repository.findById(templateId, organizationId);
      if (!template) {
        throw new NotFoundError('Shift template not found');
      }

      // Validate all stations exist and belong to organization
      for (const stationId of stationIds) {
        const station = await this.repository.findStationById(stationId, organizationId);
        if (!station) {
          throw new NotFoundError(`Station not found: ${stationId}`);
        }
      }

      // Clear existing station assignments
      await this.repository.clearStationAssignments(templateId, organizationId);

      // Assign new stations
      const assignments = [];
      for (const stationId of stationIds) {
        await this.repository.assignStationToTemplate(templateId, stationId, organizationId, userId);
        
        // Get the station details for the response
        const station = await this.repository.findStationById(stationId, organizationId);
        assignments.push({
          id: uuidv4(), // Junction table record would have its own ID
          stationId: station.id,
          stationName: station.station_name,
          stationCode: station.station_code
        });
      }

      logger.info('Stations assigned to shift template', {
        templateId,
        stationIds,
        count: assignments.length,
        organizationId,
        userId
      });

      return assignments;

    } catch (error) {
      logger.error('Error assigning stations to shift template', {
        error: error.message,
        templateId,
        stationIds,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get stations assigned to a shift template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station records
   */
  async getStations(templateId, organizationId) {
    try {
      const stations = await this.repository.findStationsByTemplateId(templateId, organizationId);
      
      return stations.map(station => ({
        id: station.id,
        stationId: station.station_id,
        stationName: station.station_name,
        stationCode: station.station_code || null,
        assignmentId: station.assignment_id,
        assignedAt: station.created_at
      }));

    } catch (error) {
      logger.error('Error getting stations for shift template', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Remove station assignments from a shift template
   * @param {string} templateId - Template UUID
   * @param {Array<string>} stationIds - Array of station UUIDs to remove
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the operation
   * @returns {Promise<void>}
   */
  async removeStations(templateId, stationIds, organizationId, userId) {
    try {
      // Validate template exists
      const template = await this.repository.findById(templateId, organizationId);
      if (!template) {
        throw new NotFoundError('Shift template not found');
      }

      await this.repository.removeStationAssignments(templateId, stationIds, organizationId);

      logger.info('Stations removed from shift template', {
        templateId,
        stationIds,
        organizationId,
        userId
      });

    } catch (error) {
      logger.error('Error removing stations from shift template', {
        error: error.message,
        templateId,
        stationIds,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Validates that all provided stations exist and belong to the organization
   * @private
   */
  async _validateStationsExist(stationIds, organizationId) {
    if (!stationIds || stationIds.length === 0) {
      return;
    }

    try {
      // Check if all stations exist and belong to organization
      const stationResult = await query(`
        SELECT id
        FROM scheduling.stations
        WHERE id = ANY($1::uuid[])
          AND organization_id = $2
          AND deleted_at IS NULL
      `, [stationIds, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'stations'
      });

      const foundStationIds = stationResult.rows.map(row => row.id);
      const missingStationIds = stationIds.filter(id => !foundStationIds.includes(id));

      if (missingStationIds.length > 0) {
        throw new ValidationError(
          `Invalid station(s): ${missingStationIds.join(', ')}. Stations not found or do not belong to organization.`
        );
      }

      logger.debug('Station validation successful', {
        stationIds,
        organizationId,
        foundCount: foundStationIds.length
      });

    } catch (error) {
      logger.error('Error validating stations', {
        error: error.message,
        stationIds,
        organizationId
      });
      throw error;
    }
  }
}

export default ShiftTemplateService;