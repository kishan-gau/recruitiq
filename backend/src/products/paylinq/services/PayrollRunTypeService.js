/**
 * Payroll Run Type Service
 * 
 * Business logic layer for payroll run type management.
 * Handles run type CRUD operations, component resolution, and validation.
 * 
 * CRITICAL: MULTI-TENANT SECURITY
 * - All operations MUST include organization_id
 * - Each tenant has completely isolated run type data
 * 
 * @module products/paylinq/services/PayrollRunTypeService
 */

import Joi from 'joi';
import PayrollRunTypeRepository from '../repositories/PayrollRunTypeRepository.js';
import { mapRunTypeDbToApi, mapRunTypesDbToApi, mapRunTypeApiToDb } from '../dto/payrollRunTypeDto.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../middleware/errorHandler.js';
import PayStructureService from './payStructureService.js';

class PayrollRunTypeService {
  /**
   * @param {PayrollRunTypeRepository} repository - Optional repository instance for testing
   * @param {PayStructureService} payStructureService - Optional service instance for testing
   */
  constructor(repository = null, payStructureService = null) {
    this.repository = repository || new PayrollRunTypeRepository();
    this.payStructureService = payStructureService || new PayStructureService();
  }

  // ==================== VALIDATION SCHEMAS ====================

  /**
   * Joi validation schema for run type creation
   */
  static get createSchema() {
    return Joi.object({
      typeCode: Joi.string()
        .required()
        .trim()
        .uppercase()
        .max(50)
        .pattern(/^[A-Z_]+$/)
        .messages({
          'string.pattern.base': 'Type code must contain only uppercase letters and underscores',
          'string.empty': 'Type code is required'
        }),
      
      typeName: Joi.string()
        .required()
        .trim()
        .min(3)
        .max(100)
        .messages({
          'string.empty': 'Type name is required',
          'string.min': 'Type name must be at least 3 characters',
          'string.max': 'Type name cannot exceed 100 characters'
        }),
      
      description: Joi.string()
        .optional()
        .trim()
        .max(500)
        .allow(null, ''),
      
      // Mode selection
      componentOverrideMode: Joi.string()
        .optional()
        .valid('template', 'explicit', 'hybrid')
        .default('explicit')
        .messages({
          'any.only': 'Component override mode must be one of: template, explicit, hybrid'
        }),
      
      // Template linking (required if mode is 'template' or 'hybrid')
      defaultTemplateId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
      
      // Component arrays (required if mode is 'explicit' or 'hybrid')
      allowedComponents: Joi.array()
        .items(Joi.string().trim().uppercase())
        .optional()
        .allow(null),
      
      excludedComponents: Joi.array()
        .items(Joi.string().trim().uppercase())
        .optional()
        .allow(null),
      
      // Configuration
      isActive: Joi.boolean()
        .optional()
        .default(true),
      
      displayOrder: Joi.number()
        .integer()
        .min(0)
        .max(9999)
        .optional()
        .default(999),
      
      icon: Joi.string()
        .optional()
        .max(50)
        .allow(null),
      
      color: Joi.string()
        .optional()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .allow(null)
        .messages({
          'string.pattern.base': 'Color must be a valid hex color (e.g., #10b981)'
        })
    }).custom((value, helpers) => {
      // Validate mode-specific requirements
      const mode = value.componentOverrideMode;
      
      if (mode === 'template' && !value.defaultTemplateId) {
        return helpers.error('custom.templateRequired');
      }
      
      if (mode === 'explicit' && (!value.allowedComponents || value.allowedComponents.length === 0)) {
        return helpers.error('custom.componentsRequired');
      }
      
      if (mode === 'hybrid' && !value.defaultTemplateId) {
        return helpers.error('custom.templateRequiredForHybrid');
      }
      
      return value;
    }).messages({
      'custom.templateRequired': 'Default template ID is required when mode is "template"',
      'custom.componentsRequired': 'Allowed components are required when mode is "explicit"',
      'custom.templateRequiredForHybrid': 'Default template ID is required when mode is "hybrid"'
    });
  }

  /**
   * Joi validation schema for run type updates
   */
  static get updateSchema() {
    return Joi.object({
      typeName: Joi.string()
        .optional()
        .trim()
        .min(3)
        .max(100),
      
      description: Joi.string()
        .optional()
        .trim()
        .max(500)
        .allow(null, ''),
      
      componentOverrideMode: Joi.string()
        .optional()
        .valid('template', 'explicit', 'hybrid'),
      
      defaultTemplateId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
      
      allowedComponents: Joi.array()
        .items(Joi.string().trim().uppercase())
        .optional()
        .allow(null),
      
      excludedComponents: Joi.array()
        .items(Joi.string().trim().uppercase())
        .optional()
        .allow(null),
      
      isActive: Joi.boolean()
        .optional(),
      
      displayOrder: Joi.number()
        .integer()
        .min(0)
        .max(9999)
        .optional(),
      
      icon: Joi.string()
        .optional()
        .max(50)
        .allow(null),
      
      color: Joi.string()
        .optional()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .allow(null)
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    });
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Create a new run type
   * @param {Object} data - Run type data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Created run type
   */
  async create(data, organizationId, userId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Validate input
    const { error, value } = this.constructor.createSchema.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check for duplicate type code
    const exists = await this.repository.typeCodeExists(
      value.typeCode,
      organizationId
    );

    if (exists) {
      throw new ConflictError(`Run type with code '${value.typeCode}' already exists`);
    }

    // Map to database format
    const dbData = mapRunTypeApiToDb(value);

    // Create run type
    const created = await this.repository.create(
      dbData,
      organizationId,
      userId
    );

    logger.info('Run type created', {
      id: created.id,
      typeCode: created.type_code,
      organizationId,
      userId
    });

    return mapRunTypeDbToApi(created);
  }

  /**
   * Get run type by code
   * @param {string} typeCode - Run type code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Run type
   */
  async getByCode(typeCode, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const runType = await this.repository.findByCode(typeCode, organizationId);
    
    if (!runType) {
      throw new NotFoundError(`Run type '${typeCode}' not found`);
    }
    
    return mapRunTypeDbToApi(runType);
  }

  /**
   * Get run type by ID
   * @param {string} id - Run type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Run type
   */
  async getById(id, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const runType = await this.repository.findById(id, organizationId);
    
    if (!runType) {
      throw new NotFoundError(`Run type not found`);
    }
    
    return mapRunTypeDbToApi(runType);
  }

  /**
   * List all run types for an organization
   * @param {string} organizationId - Organization UUID
   * @param {boolean} includeInactive - Include inactive run types
   * @returns {Promise<Array>} Array of run types
   */
  async list(organizationId, includeInactive = false) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const runTypes = await this.repository.findAll(organizationId, includeInactive);
    
    return mapRunTypesDbToApi(runTypes);
  }

  /**
   * Update a run type
   * @param {string} id - Run type UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Updated run type
   */
  async update(id, data, organizationId, userId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Validate input
    const { error, value } = this.constructor.updateSchema.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if run type exists
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundError('Run type not found');
    }

    // Map to database format
    const dbData = mapRunTypeApiToDb(value);

    // Update run type
    const updated = await this.repository.update(
      id,
      dbData,
      organizationId,
      userId
    );

    if (!updated) {
      throw new NotFoundError('Run type not found');
    }

    logger.info('Run type updated', {
      id: updated.id,
      typeCode: updated.type_code,
      organizationId,
      userId
    });

    return mapRunTypeDbToApi(updated);
  }

  /**
   * Delete a run type
   * @param {string} id - Run type UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   */
  async delete(id, organizationId, userId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const deleted = await this.repository.softDelete(id, organizationId, userId);

    if (!deleted) {
      throw new NotFoundError('Run type not found or is a system default');
    }

    logger.info('Run type deleted', {
      id,
      organizationId,
      userId
    });
  }

  /**
   * Resolve which components to use for a run type
   * This method determines the final list of components based on the run type's mode
   * 
   * @param {string} typeCode - Run type code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of component codes
   */
  async resolveAllowedComponents(typeCode, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const runType = await this.repository.findByCode(typeCode, organizationId);
    
    if (!runType) {
      throw new NotFoundError(`Run type '${typeCode}' not found`);
    }

    let components = [];
    
    switch (runType.component_override_mode) {
      case 'template':
        // Load components from linked template
        if (runType.default_template_id) {
          try {
            const templateComponents = await this.payStructureService.getTemplateComponents(
              runType.default_template_id,
              organizationId
            );
            components = templateComponents.map(c => c.component_code);
            logger.debug('Template components resolved', {
              templateId: runType.default_template_id,
              componentCount: components.length,
              typeCode,
              organizationId
            });
          } catch (error) {
            logger.error('Failed to resolve template components', {
              error: error.message,
              templateId: runType.default_template_id,
              typeCode,
              organizationId
            });
            components = [];
          }
        }
        break;
      
      case 'explicit':
        // Use allowed_components array directly
        components = runType.allowed_components || [];
        break;
      
      case 'hybrid':
        // Start with template components, then apply overrides
        if (runType.default_template_id) {
          try {
            const templateComponents = await this.payStructureService.getTemplateComponents(
              runType.default_template_id,
              organizationId
            );
            components = templateComponents.map(c => c.component_code);
            logger.debug('Template components loaded for hybrid mode', {
              templateId: runType.default_template_id,
              componentCount: components.length,
              typeCode,
              organizationId
            });
          } catch (error) {
            logger.error('Failed to load template components for hybrid mode', {
              error: error.message,
              templateId: runType.default_template_id,
              typeCode,
              organizationId
            });
          }
        }
        
        // Add allowed components
        if (runType.allowed_components && runType.allowed_components.length > 0) {
          components = [...components, ...runType.allowed_components];
        }
        
        // Remove excluded components
        if (runType.excluded_components && runType.excluded_components.length > 0) {
          components = components.filter(
            comp => !runType.excluded_components.includes(comp)
          );
        }
        
        // Remove duplicates
        components = [...new Set(components)];
        break;
      
      default:
        logger.warn('Unknown component override mode', {
          mode: runType.component_override_mode,
          typeCode,
          organizationId
        });
        components = runType.allowed_components || [];
    }

    logger.debug('Components resolved for run type', {
      typeCode,
      mode: runType.component_override_mode,
      components,
      organizationId
    });

    return components;
  }

  /**
   * Validate run type configuration
   * Checks if the run type is properly configured for payroll processing
   * 
   * @param {string} typeCode - Run type code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Validation result { isValid, errors }
   */
  async validateRunType(typeCode, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const errors = [];
    
    try {
      const runType = await this.repository.findByCode(typeCode, organizationId);
      
      if (!runType) {
        errors.push(`Run type '${typeCode}' not found`);
        return { isValid: false, errors };
      }

      if (!runType.is_active) {
        errors.push('Run type is inactive');
      }

      const components = await this.resolveAllowedComponents(typeCode, organizationId);
      
      if (components.length === 0) {
        errors.push('No components configured for this run type');
      }

      if (runType.component_override_mode === 'template' && !runType.default_template_id) {
        errors.push('Template mode requires a default template ID');
      }

    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export class for dependency injection and testing
export default PayrollRunTypeService;
