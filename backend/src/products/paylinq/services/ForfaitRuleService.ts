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
      const component = await this.repository.findPayComponentByCode(componentCode, organizationId);
      if (!component) {
        throw new NotFoundError(`Component '${componentCode}' not found`);
      }

      // If enabled, verify forfait component exists
      if (validated.enabled) {
        const forfaitComponent = await this.repository.findPayComponentByCode(
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
      await this.repository.updatePayComponent(
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
      const component = await this.repository.findPayComponentByCode(componentCode, organizationId);
      
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
      const component = await this.repository.findPayComponentByCode(componentCode, organizationId);
      
      if (!component) {
        throw new NotFoundError(`Component '${componentCode}' not found`);
      }

      const currentMetadata = component.calculation_metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        forfaitRule: { enabled: false }
      };

      await this.repository.updatePayComponent(
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
      const forfaitComponent = await this.repository.findPayComponentByCode(
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
      const benefitAssignment = await this.repository.findEmployeeComponentAssignmentById(
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
      await this.repository.updateEmployeeComponentAssignment(
        forfaitAssignment.id,
        { configuration: updatedForfaitConfig },
        organizationId
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
        await this.repository.removeEmployeeComponentAssignment(
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

  // ==================== PAYROLL CALCULATION INTEGRATION ====================

  /**
   * Calculate forfait amounts for a payroll run
   * 
   * This method calculates the taxable benefit-in-kind (bijtelling) amounts
   * for all employees in a payroll run. It finds all forfait component 
   * assignments and calculates amounts based on the associated rules.
   * 
   * @param {string} payrollRunId - Payroll run ID
   * @param {Array<string>} employeeIds - Array of employee IDs in the run
   * @param {Date} payPeriodStart - Pay period start date
   * @param {Date} payPeriodEnd - Pay period end date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array<Object>>} Forfait calculation results per employee
   */
  async calculateForfaitForPayroll(
    payrollRunId,
    employeeIds,
    payPeriodStart,
    payPeriodEnd,
    organizationId
  ) {
    try {
      logger.info('Calculating forfait for payroll run', {
        payrollRunId,
        employeeCount: employeeIds.length,
        payPeriodStart,
        payPeriodEnd,
        organizationId
      });

      const results = [];

      for (const employeeId of employeeIds) {
        const employeeForfaits = await this._calculateForfaitForEmployee(
          employeeId,
          payPeriodStart,
          payPeriodEnd,
          organizationId
        );
        
        if (employeeForfaits.length > 0) {
          results.push({
            employeeId,
            forfaitItems: employeeForfaits,
            totalForfaitAmount: employeeForfaits.reduce(
              (sum, item) => sum + (item.amount || 0),
              0
            )
          });
        }
      }

      logger.info('Forfait calculation completed', {
        payrollRunId,
        employeesWithForfait: results.length,
        totalEmployees: employeeIds.length
      });

      return results;

    } catch (error) {
      logger.error('Error calculating forfait for payroll', {
        error: error.message,
        payrollRunId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Calculate forfait amounts for a single employee
   * 
   * @param {string} employeeId - Employee ID
   * @param {Date} payPeriodStart - Pay period start date
   * @param {Date} payPeriodEnd - Pay period end date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array<Object>>} Forfait items for the employee
   * @private
   */
  async _calculateForfaitForEmployee(employeeId, payPeriodStart, payPeriodEnd, organizationId) {
    const forfaitItems = [];

    // Get all active forfait component assignments for this employee
    // Forfait components have 'forfait' in their component_type
    const assignments = await this.repository.findEmployeeComponentAssignments(
      employeeId,
      organizationId,
      { componentType: 'taxable_benefit' }  // Forfait components are taxable benefits
    );

    for (const assignment of assignments) {
      // Check if assignment is active for this pay period
      if (!this._isAssignmentActive(assignment, payPeriodStart, payPeriodEnd)) {
        continue;
      }

      // Get the component to check for forfait rules
      const component = await this.repository.findPayComponentById(
        assignment.component_id,
        organizationId
      );

      if (!component) continue;

      // Check if this is a forfait component (has forfait configuration in metadata)
      const forfaitConfig = component.calculation_metadata?.forfaitCalculation;
      if (!forfaitConfig) continue;

      // Calculate the forfait amount
      const amount = await this._calculateForfaitAmount(
        assignment,
        component,
        forfaitConfig,
        payPeriodStart,
        payPeriodEnd
      );

      if (amount > 0) {
        forfaitItems.push({
          componentId: component.id,
          componentCode: component.component_code,
          componentName: component.component_name,
          assignmentId: assignment.id,
          amount,
          calculation: forfaitConfig.calculationType,
          taxable: true,  // Forfait is always taxable income
          metadata: {
            baseValue: assignment.configuration?.catalogValue || 
                      assignment.configuration?.rentalValue || 
                      assignment.configuration?.packageValue,
            rate: forfaitConfig.rate,
            payPeriod: { start: payPeriodStart, end: payPeriodEnd }
          }
        });
      }
    }

    return forfaitItems;
  }

  /**
   * Check if an assignment is active for a pay period
   * @private
   */
  _isAssignmentActive(assignment, payPeriodStart, payPeriodEnd) {
    const effectiveFrom = new Date(assignment.effective_from);
    const effectiveTo = assignment.effective_to ? new Date(assignment.effective_to) : null;

    // Assignment must have started before pay period ends
    if (effectiveFrom > payPeriodEnd) return false;

    // If assignment has end date, it must end after pay period starts
    if (effectiveTo && effectiveTo < payPeriodStart) return false;

    return true;
  }

  /**
   * Calculate the forfait amount based on configuration
   * @private
   */
  async _calculateForfaitAmount(assignment, component, forfaitConfig, payPeriodStart, payPeriodEnd) {
    const config = assignment.configuration || {};
    
    // If there's an override amount, use it
    if (assignment.override_amount) {
      return parseFloat(assignment.override_amount);
    }

    switch (forfaitConfig.calculationType) {
      case 'percentage_of_catalog_value':
        // Car forfait: percentage of catalog value per year, prorated
        const catalogValue = parseFloat(config.catalogValue || 0);
        const yearlyAmount = catalogValue * (forfaitConfig.rate / 100);
        return this._prorateForPayPeriod(yearlyAmount, 'yearly', payPeriodStart, payPeriodEnd);

      case 'percentage_of_rental_value':
        // Housing forfait: percentage of monthly rental value
        const rentalValue = parseFloat(config.rentalValue || 0);
        return rentalValue * (forfaitConfig.rate / 100);

      case 'fixed_per_meal':
        // Meal forfait: fixed amount per meal
        const mealsPerMonth = parseInt(config.mealsPerMonth || 0);
        return mealsPerMonth * forfaitConfig.fixedAmount;

      case 'progressive_scale':
        // Progressive forfait based on value brackets
        const baseValue = parseFloat(config.packageValue || config.baseValue || 0);
        return this._calculateProgressiveAmount(baseValue, forfaitConfig.brackets);

      case 'fixed_monthly':
        // Fixed monthly amount
        return parseFloat(forfaitConfig.fixedAmount || 0);

      default:
        logger.warn('Unknown forfait calculation type', {
          calculationType: forfaitConfig.calculationType,
          componentCode: component.component_code
        });
        return 0;
    }
  }

  /**
   * Prorate an amount for a pay period
   * @private
   */
  _prorateForPayPeriod(amount, basis, payPeriodStart, payPeriodEnd) {
    const periodDays = Math.ceil(
      (payPeriodEnd - payPeriodStart) / (1000 * 60 * 60 * 24)
    ) + 1;

    switch (basis) {
      case 'yearly':
        // Assume 365 days per year
        return (amount / 365) * periodDays;
      case 'monthly':
        // Assume 30 days per month
        return (amount / 30) * periodDays;
      default:
        return amount;
    }
  }

  /**
   * Calculate progressive amount based on brackets
   * @private
   */
  _calculateProgressiveAmount(value, brackets) {
    if (!brackets || brackets.length === 0) return 0;

    // Sort brackets by minValue
    const sortedBrackets = [...brackets].sort((a, b) => a.minValue - b.minValue);

    let amount = 0;
    let remainingValue = value;

    for (const bracket of sortedBrackets) {
      if (remainingValue <= 0) break;

      const bracketRange = (bracket.maxValue || Infinity) - bracket.minValue;
      const valueInBracket = Math.min(remainingValue, bracketRange);

      if (bracket.rate) {
        amount += valueInBracket * (bracket.rate / 100);
      } else if (bracket.fixedAmount) {
        amount += bracket.fixedAmount;
      }

      remainingValue -= valueInBracket;
    }

    return amount;
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
