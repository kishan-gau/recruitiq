/**
 * Forfait Rule Service
 * 
 * Manages forfait tax rules for benefits-in-kind in Surinamese payroll.
 * Handles automatic forfait component creation and value propagation.
 * 
 * Per Article 11 Wet Loonbelasting (Suriname):
 * - Company car: 2% of catalog value per year
 * - Housing: 7.5% of rental value per month (or progressive scale)
 * - Meals: Fixed amounts per meal type
 * - Medical coverage: Progressive scale based on package value
 * 
 * Architecture:
 * - User configures which forfait applies to each benefit component
 * - When benefit assigned to employee, forfait is auto-created
 * - Values from benefit (e.g., catalog value) propagate to forfait
 * 
 * @module products/paylinq/services/ForfaitRuleService
 */

import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import PayComponentRepository from '../repositories/payComponentRepository.js';

class ForfaitRuleService {
  constructor(repository = null) {
    this.repository = repository || new PayComponentRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  /**
   * Schema for configuring forfait rule on a component
   */
  static get forfaitRuleSchema() {
    return Joi.object({
      // Is forfait rule enabled?
      enabled: Joi.boolean().required(),
      
      // Which forfait component should be auto-created?
      forfaitComponentCode: Joi.string().when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      
      // Value mapping: How values propagate from benefit to forfait
      valueMapping: Joi.object().when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }).pattern(
        Joi.string(),
        Joi.object({
          sourceField: Joi.string().required(), // Field in benefit configuration
          targetField: Joi.string().required(), // Field in forfait configuration
          required: Joi.boolean().default(true)
        })
      ),
      
      // Optional: Additional rules
      conditions: Joi.object({
        minValue: Joi.number().optional(),
        maxValue: Joi.number().optional(),
        requiresApproval: Joi.boolean().default(false)
      }).optional(),
      
      // Notes for admin/users
      description: Joi.string().max(500).optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Schema for catalog value configuration
   */
  static get catalogValueSchema() {
    return Joi.object({
      catalogValue: Joi.number().min(0).required(),
      makeModel: Joi.string().max(100).optional(),
      licensePlate: Joi.string().max(20).optional(),
      yearOfManufacture: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional(),
      acquisitionDate: Joi.date().optional(),
      notes: Joi.string().max(500).optional()
    });
  }

  /**
   * Schema for housing value configuration
   */
  static get housingValueSchema() {
    return Joi.object({
      rentalValue: Joi.number().min(0).required(),
      address: Joi.string().max(500).optional(),
      propertyType: Joi.string().valid('house', 'apartment', 'furnished', 'unfurnished').optional(),
      startDate: Joi.date().required(),
      endDate: Joi.date().optional(),
      notes: Joi.string().max(500).optional()
    });
  }

  // ==================== FORFAIT RULE CONFIGURATION ====================

  /**
   * Set forfait rule on a component
   * 
   * @param {string} componentCode - Component code
   * @param {Object} forfaitRule - Forfait rule configuration
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing action
   * @returns {Promise<Object>} Updated component
   */
  async setForfaitRule(componentCode, forfaitRule, organizationId, userId) {
    try {
      // Validate forfait rule
      const validated = await ForfaitRuleService.forfaitRuleSchema.validateAsync(forfaitRule);

      logger.info('Setting forfait rule on component', {
        componentCode,
        enabled: validated.enabled,
        forfaitComponentCode: validated.forfaitComponentCode,
        organizationId
      });

      // Get component
      const component = await this.repository.findByCode(componentCode, organizationId);
      if (!component) {
        throw new NotFoundError(`Component '${componentCode}' not found`);
      }

      // If enabled, verify forfait component exists
      if (validated.enabled) {
        const forfaitComponent = await this.repository.findByCode(
          validated.forfaitComponentCode,
          organizationId
        );
        
        if (!forfaitComponent) {
          throw new NotFoundError(
            `Forfait component '${validated.forfaitComponentCode}' not found`
          );
        }

        // Verify forfait component is appropriate type
        if (!['tax', 'deduction', 'benefit'].includes(forfaitComponent.component_type)) {
          throw new ValidationError(
            'Forfait component must be of type: tax, deduction, or benefit'
          );
        }
      }

      // Update component metadata with forfait rule
      const currentMetadata = component.calculation_metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        forfaitRule: validated.enabled ? {
          enabled: true,
          forfaitComponentCode: validated.forfaitComponentCode,
          valueMapping: validated.valueMapping,
          conditions: validated.conditions,
          description: validated.description,
          configuredAt: new Date().toISOString(),
          configuredBy: userId
        } : {
          enabled: false
        }
      };

      // Update component
      await this.repository.update(
        component.id,
        { calculation_metadata: updatedMetadata },
        organizationId,
        userId
      );

      logger.info('Forfait rule set successfully', {
        componentCode,
        enabled: validated.enabled,
        organizationId
      });

      return {
        componentCode,
        forfaitRule: updatedMetadata.forfaitRule
      };

    } catch (error) {
      logger.error('Error setting forfait rule', {
        error: error.message,
        componentCode,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get forfait rule for a component
   * 
   * @param {string} componentCode - Component code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Forfait rule or null
   */
  async getForfaitRule(componentCode, organizationId) {
    try {
      const component = await this.repository.findByCode(componentCode, organizationId);
      
      if (!component) {
        throw new NotFoundError(`Component '${componentCode}' not found`);
      }

      const forfaitRule = component.calculation_metadata?.forfaitRule;
      
      if (!forfaitRule || !forfaitRule.enabled) {
        return null;
      }

      return forfaitRule;

    } catch (error) {
      logger.error('Error getting forfait rule', {
        error: error.message,
        componentCode,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Remove forfait rule from a component
   * 
   * @param {string} componentCode - Component code
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing action
   * @returns {Promise<void>}
   */
  async removeForfaitRule(componentCode, organizationId, userId) {
    try {
      const component = await this.repository.findByCode(componentCode, organizationId);
      
      if (!component) {
        throw new NotFoundError(`Component '${componentCode}' not found`);
      }

      const currentMetadata = component.calculation_metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        forfaitRule: { enabled: false }
      };

      await this.repository.update(
        component.id,
        { calculation_metadata: updatedMetadata },
        organizationId,
        userId
      );

      logger.info('Forfait rule removed', { componentCode, organizationId });

    } catch (error) {
      logger.error('Error removing forfait rule', {
        error: error.message,
        componentCode,
        organizationId
      });
      throw error;
    }
  }

  // ==================== AUTO-CREATE FORFAIT ASSIGNMENTS ====================

  /**
   * Auto-create forfait assignment when benefit is assigned to employee
   * 
   * @param {Object} benefitAssignment - The primary benefit assignment
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing action
   * @returns {Promise<Object|null>} Created forfait assignment or null
   */
  async autoCreateForfaitAssignment(benefitAssignment, organizationId, userId) {
    try {
      // Get forfait rule for this component
      const forfaitRule = await this.getForfaitRule(
        benefitAssignment.componentCode,
        organizationId
      );

      // No forfait rule? Nothing to do
      if (!forfaitRule) {
        logger.debug('No forfait rule for component', {
          componentCode: benefitAssignment.componentCode
        });
        return null;
      }

      logger.info('Auto-creating forfait assignment', {
        benefitAssignmentId: benefitAssignment.id,
        employeeId: benefitAssignment.employeeId,
        forfaitComponentCode: forfaitRule.forfaitComponentCode
      });

      // Get forfait component
      const forfaitComponent = await this.repository.findByCode(
        forfaitRule.forfaitComponentCode,
        organizationId
      );

      if (!forfaitComponent) {
        logger.error('Forfait component not found', {
          forfaitComponentCode: forfaitRule.forfaitComponentCode
        });
        return null;
      }

      // Map values from benefit to forfait configuration
      const forfaitConfiguration = this.mapValues(
        benefitAssignment.configuration,
        forfaitRule.valueMapping
      );

      // Validate mapped values
      this.validateMappedValues(forfaitConfiguration, forfaitRule.valueMapping);

      // Create forfait assignment
      const forfaitAssignment = {
        id: uuidv4(),
        employeeId: benefitAssignment.employeeId,
        componentId: forfaitComponent.id,
        componentCode: forfaitRule.forfaitComponentCode,
        effectiveFrom: benefitAssignment.effectiveFrom,
        effectiveTo: benefitAssignment.effectiveTo,
        configuration: forfaitConfiguration,
        overrideAmount: null,
        overrideFormula: null,
        notes: `Auto-generated from ${benefitAssignment.componentCode} benefit`,
        metadata: {
          autoGenerated: true,
          linkedBenefitAssignmentId: benefitAssignment.id,
          createdBy: 'ForfaitRuleService'
        },
        createdBy: userId
      };

      // Save forfait assignment
      const created = await this.repository.assignComponentToEmployee(
        forfaitAssignment,
        organizationId
      );

      logger.info('Forfait assignment auto-created', {
        forfaitAssignmentId: created.id,
        linkedTo: benefitAssignment.id,
        employeeId: benefitAssignment.employeeId
      });

      return created;

    } catch (error) {
      logger.error('Error auto-creating forfait assignment', {
        error: error.message,
        benefitAssignmentId: benefitAssignment.id,
        organizationId
      });
      
      // Don't throw - log error but allow benefit assignment to succeed
      return null;
    }
  }

  /**
   * Map values from source to target based on mapping rules
   * 
   * @param {Object} sourceConfig - Source configuration
   * @param {Object} valueMapping - Mapping rules
   * @returns {Object} Mapped configuration
   * @private
   */
  mapValues(sourceConfig, valueMapping) {
    const result = {};

    for (const [mappingKey, mapping] of Object.entries(valueMapping)) {
      const sourceValue = this.getNestedValue(sourceConfig, mapping.sourceField);
      
      if (sourceValue !== undefined && sourceValue !== null) {
        this.setNestedValue(result, mapping.targetField, sourceValue);
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   * @private
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Validate that required mapped values are present
   * @private
   */
  validateMappedValues(mappedConfig, valueMapping) {
    const missing = [];

    for (const [mappingKey, mapping] of Object.entries(valueMapping)) {
      if (mapping.required) {
        const value = this.getNestedValue(mappedConfig, mapping.targetField);
        if (value === undefined || value === null) {
          missing.push(mapping.targetField);
        }
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(
        `Required forfait values missing: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Update forfait assignment when benefit configuration changes
   * 
   * @param {string} benefitAssignmentId - Benefit assignment ID
   * @param {Object} updatedConfiguration - New configuration
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing action
   * @returns {Promise<Object|null>} Updated forfait assignment or null
   */
  async updateLinkedForfaitAssignment(
    benefitAssignmentId,
    updatedConfiguration,
    organizationId,
    userId
  ) {
    try {
      // Find forfait assignment linked to this benefit
      const forfaitAssignment = await this.repository.findLinkedForfaitAssignment(
        benefitAssignmentId,
        organizationId
      );

      if (!forfaitAssignment) {
        logger.debug('No linked forfait assignment found', { benefitAssignmentId });
        return null;
      }

      // Get forfait rule
      const benefitAssignment = await this.repository.findAssignmentById(
        benefitAssignmentId,
        organizationId
      );
      
      const forfaitRule = await this.getForfaitRule(
        benefitAssignment.componentCode,
        organizationId
      );

      if (!forfaitRule) {
        return null;
      }

      // Re-map values
      const updatedForfaitConfig = this.mapValues(
        updatedConfiguration,
        forfaitRule.valueMapping
      );

      // Update forfait assignment
      await this.repository.updateAssignment(
        forfaitAssignment.id,
        { configuration: updatedForfaitConfig },
        organizationId,
        userId
      );

      logger.info('Linked forfait assignment updated', {
        forfaitAssignmentId: forfaitAssignment.id,
        benefitAssignmentId
      });

      return forfaitAssignment;

    } catch (error) {
      logger.error('Error updating linked forfait assignment', {
        error: error.message,
        benefitAssignmentId,
        organizationId
      });
      
      // Don't throw - log but continue
      return null;
    }
  }

  /**
   * Delete forfait assignment when benefit is removed
   * 
   * @param {string} benefitAssignmentId - Benefit assignment ID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing action
   * @returns {Promise<void>}
   */
  async deleteLinkedForfaitAssignment(benefitAssignmentId, organizationId, userId) {
    try {
      // Find and delete linked forfait assignment
      const forfaitAssignment = await this.repository.findLinkedForfaitAssignment(
        benefitAssignmentId,
        organizationId
      );

      if (forfaitAssignment) {
        await this.repository.softDeleteAssignment(
          forfaitAssignment.id,
          organizationId,
          userId
        );

        logger.info('Linked forfait assignment deleted', {
          forfaitAssignmentId: forfaitAssignment.id,
          benefitAssignmentId
        });
      }

    } catch (error) {
      logger.error('Error deleting linked forfait assignment', {
        error: error.message,
        benefitAssignmentId,
        organizationId
      });
      
      // Don't throw - log but continue
    }
  }

  // ==================== PREDEFINED FORFAIT RULE TEMPLATES ====================

  /**
   * Get predefined forfait rule templates based on Surinamese tax law
   * 
   * @returns {Array<Object>} Array of forfait rule templates
   */
  getPredefinedForfaitRules() {
    return [
      {
        name: 'Company Car 2% (Article 11)',
        benefitType: 'company_car',
        forfaitComponentCode: 'CAR_FORFAIT_2PCT',
        valueMapping: {
          catalogValue: {
            sourceField: 'catalogValue',
            targetField: 'catalogValue',
            required: true
          }
        },
        description: '2% of catalog value per year (Article 11 Wet Loonbelasting)',
        legalReference: 'Article 11, Wet Loonbelasting (Suriname)'
      },
      {
        name: 'Company Car 3% (Higher Use)',
        benefitType: 'company_car_high_use',
        forfaitComponentCode: 'CAR_FORFAIT_3PCT',
        valueMapping: {
          catalogValue: {
            sourceField: 'catalogValue',
            targetField: 'catalogValue',
            required: true
          }
        },
        description: '3% for high-use or luxury vehicles',
        legalReference: 'Article 11, Wet Loonbelasting (Suriname)'
      },
      {
        name: 'Housing Benefit 7.5%',
        benefitType: 'housing',
        forfaitComponentCode: 'HOUSING_FORFAIT_7_5PCT',
        valueMapping: {
          rentalValue: {
            sourceField: 'rentalValue',
            targetField: 'rentalValue',
            required: true
          }
        },
        description: '7.5% of monthly rental value',
        legalReference: 'Article 11, Wet Loonbelasting (Suriname)'
      },
      {
        name: 'Meal Benefit (Hot Meal)',
        benefitType: 'hot_meal',
        forfaitComponentCode: 'MEAL_FORFAIT_HOT',
        valueMapping: {
          mealsPerMonth: {
            sourceField: 'mealsPerMonth',
            targetField: 'mealsPerMonth',
            required: true
          }
        },
        description: 'Fixed amount per hot meal provided',
        legalReference: 'Ministerial Regulation (Suriname)'
      },
      {
        name: 'Medical Coverage (Progressive)',
        benefitType: 'medical_coverage',
        forfaitComponentCode: 'MEDICAL_FORFAIT_PROGRESSIVE',
        valueMapping: {
          packageValue: {
            sourceField: 'packageValue',
            targetField: 'packageValue',
            required: true
          }
        },
        description: 'Progressive scale based on coverage value',
        legalReference: 'Ministerial Regulation (Suriname)'
      }
    ];
  }
}

export default ForfaitRuleService;
