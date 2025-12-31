/**
 * Forfaitair Benefits Service
 * 
 * Manages forfaitair benefits (benefits in kind) for Suriname payroll system.
 * Provides three-tier flexibility:
 * 
 * Tier 1: Global Component Library - Pre-defined standard components
 * Tier 2: Organization Custom Components - Organization-specific rules
 * Tier 3: Employee-Level Overrides - Individual exceptions
 * 
 * Features:
 * - Company car benefits (2%, 3%, conditional rates)
 * - Housing benefits (7.5%, progressive, fixed)
 * - Meal benefits (hot meals, cold meals, full board)
 * - Medical coverage (health, dental, vision)
 * - Transport benefits (fuel, public transport)
 * - Communication benefits (phone, internet)
 * - Clothing/uniform benefits
 * - Forfaitair deductible costs
 * 
 * Industry Standard: Service layer with dependency injection
 * 
 * @module products/paylinq/services/ForfaitairBenefitsService
 */

import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import PayComponentRepository from '../repositories/payComponentRepository.js';
import FormulaEngineService from './formulaEngineService.js';

class ForfaitairBenefitsService {
  
  formulaEngine: any;

  repository: any;

constructor(repository = null, formulaEngine = null) {
    this.repository = repository || new PayComponentRepository();
    this.formulaEngine = formulaEngine || new FormulaEngineService();
  }

  // ==================== VALIDATION SCHEMAS ====================

  /**
   * Schema for assigning benefit to employee
   */
  static get assignBenefitSchema() {
    return Joi.object({
      employeeId: Joi.string().uuid().required(),
      componentCode: Joi.string().required().max(50),
      effectiveFrom: Joi.date().required(),
      effectiveTo: Joi.date().optional().allow(null),
      configuration: Joi.object().optional(), // Employee-specific config
      overrideAmount: Joi.number().optional().allow(null),
      overrideFormula: Joi.string().optional().allow(null),
      notes: Joi.string().optional().max(500)
    }).options({ stripUnknown: true });
  }

  /**
   * Schema for creating custom benefit component
   */
  static get createCustomBenefitSchema() {
    return Joi.object({
      componentCode: Joi.string().required().max(50).pattern(/^[A-Z0-9_]+$/),
      componentName: Joi.string().required().max(100),
      category: Joi.string().required().valid(
        'benefit',
        'forfaitair_benefit',
        'tax_deduction'
      ),
      calculationType: Joi.string().required().valid(
        'fixed_amount',
        'percentage',
        'formula',
        'tiered'
      ),
      defaultAmount: Joi.number().optional().allow(null),
      defaultRate: Joi.number().optional().allow(null),
      formula: Joi.string().optional().allow(null),
      isTaxable: Joi.boolean().default(true),
      isRecurring: Joi.boolean().default(true),
      description: Joi.string().optional().max(500),
      metadata: Joi.object().optional()
    }).options({ stripUnknown: true });
  }

  // ==================== TENANT COMPONENT LIBRARY ====================

  /**
   * Get all forfaitair benefit components for a specific tenant (organization)
   * All components are tenant-specific - no global components exist
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Tenant-specific benefit components
   */
  async getTenantBenefitLibrary(organizationId, filters = {}) {
    try {
      logger.info('Fetching tenant forfaitair benefit library', { 
        organizationId, 
        filters 
      });

      // Find forfait components for this specific organization
      const components = await this.repository.findAll({
        organizationId,
        category: 'benefit',
        benefitType: filters.benefitType,
        status: 'active',
        codes: ['CAR_FORFAIT_2PCT', 'CAR_FORFAIT_3PCT', 'HOUSING_FORFAIT_7_5PCT', 
                'MEAL_FORFAIT_HOT', 'MEDICAL_FORFAIT_PROGRESSIVE']
      });

      logger.info('Tenant benefit library fetched', { 
        organizationId, 
        count: components.length 
      });

      return components;
    } catch (_error) {
      logger.error('Error fetching tenant benefit library', {
        error: error.message,
        organizationId,
        filters
      });
      throw error;
    }
  }

  /**
   * @deprecated Use getTenantBenefitLibrary(organizationId) instead
   * Global components are no longer supported - all components are tenant-specific
   */
  async getGlobalBenefitLibrary(filters = {}) {
    throw new Error('Global benefit components are deprecated. Use getTenantBenefitLibrary(organizationId) instead.');
  }

  /**
   * Get specific global benefit component by code
   * 
   * @param {string} componentCode - Component code
   * @returns {Promise<Object>} Component details
   */
  async getGlobalBenefitByCode(componentCode) {
    try {
      const component = await this.repository.findGlobalComponentByCode(componentCode);

      if (!component) {
        throw new NotFoundError(`Global benefit component '${componentCode}' not found`);
      }

      return component;
    } catch (_error) {
      logger.error('Error fetching global benefit', {
        error: error.message,
        componentCode
      });
      throw error;
    }
  }

  // ==================== ORGANIZATION CUSTOM COMPONENTS (TIER 2) ====================

  /**
   * Create organization-specific custom benefit component
   * Allows organizations to define their own benefit rules
   * 
   * @param {Object} componentData - Custom component data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the component
   * @returns {Promise<Object>} Created custom component
   */
  async createCustomBenefit(componentData, organizationId, userId) {
    try {
      // Validate input
      const validated = await ForfaitairBenefitsService.createCustomBenefitSchema.validateAsync(componentData);

      logger.info('Creating custom benefit component', {
        organizationId,
        componentCode: validated.componentCode
      });

      // Check if component code already exists for this organization
      const existing = await this.repository.findByCode(
        validated.componentCode,
        organizationId
      );

      if (existing) {
        throw new ValidationError(
          `Component code '${validated.componentCode}' already exists for this organization`
        );
      }

      // Validate formula if provided
      if (validated.formula) {
        try {
          await this.formulaEngine.parseFormula(validated.formula);
        } catch (err) {
          throw new ValidationError(`Invalid formula: ${err.message}`);
        }
      }

      // Create custom component
      const component = await this.repository.createPayComponent(
        {
          ...validated,
          componentType: 'earning', // Benefits are earnings
          isSystemComponent: false, // User-created, can be edited/deleted
          gaapCategory: 'benefits',
          defaultCurrency: 'SRD'
        },
        organizationId,
        userId
      );

      logger.info('Custom benefit component created', {
        componentId: component.id,
        organizationId,
        componentCode: validated.componentCode
      });

      return component;
    } catch (_error) {
      logger.error('Error creating custom benefit', {
        error: error.message,
        organizationId,
        componentData
      });
      throw error;
    }
  }

  /**
   * Clone global component and customize for organization
   * Quick way to create org-specific variant of standard benefit
   * 
   * @param {string} globalComponentCode - Global component to clone
   * @param {Object} overrides - Organization-specific overrides
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<Object>} Cloned and customized component
   */
  async cloneAndCustomizeGlobalBenefit(globalComponentCode, overrides, organizationId, userId) {
    try {
      logger.info('Cloning global benefit component', {
        globalComponentCode,
        organizationId
      });

      // Get global component
      const globalComponent = await this.getGlobalBenefitByCode(globalComponentCode);

      // Create organization-specific copy with overrides
      const customComponent = {
        componentCode: overrides.componentCode || `${organizationId.substring(0, 8)}_${globalComponent.componentCode}`,
        componentName: overrides.componentName || `${globalComponent.componentName} (Custom)`,
        category: globalComponent.category,
        calculationType: overrides.calculationType || globalComponent.calculationType,
        defaultAmount: overrides.defaultAmount !== undefined ? overrides.defaultAmount : globalComponent.defaultAmount,
        defaultRate: overrides.defaultRate !== undefined ? overrides.defaultRate : globalComponent.defaultRate,
        formula: overrides.formula || globalComponent.formula,
        isTaxable: overrides.isTaxable !== undefined ? overrides.isTaxable : globalComponent.isTaxable,
        isRecurring: overrides.isRecurring !== undefined ? overrides.isRecurring : globalComponent.isRecurring,
        description: overrides.description || `Customized from ${globalComponent.componentName}`,
        metadata: {
          ...globalComponent.metadata,
          ...overrides.metadata,
          cloned_from: globalComponentCode,
          cloned_at: new Date().toISOString()
        }
      };

      const created = await this.createCustomBenefit(customComponent, organizationId, userId);

      logger.info('Global benefit cloned and customized', {
        originalCode: globalComponentCode,
        newCode: created.componentCode,
        organizationId
      });

      return created;
    } catch (_error) {
      logger.error('Error cloning global benefit', {
        error: error.message,
        globalComponentCode,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get all available benefits for organization (tenant-specific only)
   * Note: No global components exist - all components are tenant-specific
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} { tenantComponents }
   */
  async getAvailableBenefits(organizationId, filters = {}) {
    try {
      logger.info('Fetching available benefits for organization', {
        organizationId,
        filters
      });

      // Get all tenant-specific benefit components (including forfait components)
      const tenantComponents = await this.repository.findAll(organizationId, {
        componentType: ['earning', 'deduction'], // Include both types
        category: 'benefit',
        ...filters
      });

      logger.info('Available benefits fetched', {
        organizationId,
        tenantCount: tenantComponents.length
      });

      return {
        tenantComponents,
        totalAvailable: tenantComponents.length,
        // Legacy fields for backward compatibility (deprecated)
        globalComponents: [], // Always empty - no global components exist
        orgComponents: tenantComponents // Alias to tenant components
      };
    } catch (_error) {
      logger.error('Error fetching available benefits', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  // ==================== EMPLOYEE BENEFIT ASSIGNMENT (TIER 3) ====================

  /**
   * Assign benefit to employee with optional overrides
   * 
   * @param {Object} assignmentData - Benefit assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<Object>} Created assignment
   */
  async assignBenefitToEmployee(assignmentData, organizationId, userId) {
    try {
      // Validate input
      const validated = await ForfaitairBenefitsService.assignBenefitSchema.validateAsync(assignmentData);

      logger.info('Assigning benefit to employee', {
        employeeId: validated.employeeId,
        componentCode: validated.componentCode,
        organizationId
      });

      // Verify component exists (either global or org-specific)
      let component;
      try {
        component = await this.getGlobalBenefitByCode(validated.componentCode);
      } catch (err) {
        // Not global, check org-specific
        component = await this.repository.findByCode(validated.componentCode, organizationId);
        if (!component) {
          throw new NotFoundError(`Component '${validated.componentCode}' not found`);
        }
      }

      // Verify employee exists and belongs to organization
      // TODO: Add employee verification when employee service is available

      // Create employee benefit assignment
      const assignment = await this.repository.assignComponentToEmployee(
        {
          id: uuidv4(),
          employeeId: validated.employeeId,
          componentId: component.id,
          componentCode: validated.componentCode,
          effectiveFrom: validated.effectiveFrom,
          effectiveTo: validated.effectiveTo,
          configuration: validated.configuration || {},
          overrideAmount: validated.overrideAmount,
          overrideFormula: validated.overrideFormula,
          notes: validated.notes,
          createdBy: userId
        },
        organizationId
      );

      logger.info('Benefit assigned to employee', {
        assignmentId: assignment.id,
        employeeId: validated.employeeId,
        componentCode: validated.componentCode
      });

      return assignment;
    } catch (_error) {
      logger.error('Error assigning benefit to employee', {
        error: error.message,
        organizationId,
        assignmentData
      });
      throw error;
    }
  }

  /**
   * Get all benefits assigned to an employee
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Date} effectiveDate - Date to check for active benefits
   * @returns {Promise<Array>} Employee's active benefits
   */
  async getEmployeeBenefits(employeeId, organizationId, effectiveDate = new Date()) {
    try {
      logger.info('Fetching employee benefits', {
        employeeId,
        organizationId,
        effectiveDate
      });

      const benefits = await this.repository.findEmployeeComponents(
        employeeId,
        organizationId,
        {
          componentType: 'earning',
          category: 'benefit',
          effectiveDate
        }
      );

      logger.info('Employee benefits fetched', {
        employeeId,
        count: benefits.length
      });

      return benefits;
    } catch (_error) {
      logger.error('Error fetching employee benefits', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Calculate benefit value for employee
   * Applies formula with employee-specific variables and overrides
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} componentCode - Benefit component code
   * @param {Object} variables - Calculation variables (salary, car_value, etc.)
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Calculated benefit amount
   */
  async calculateEmployeeBenefit(employeeId, componentCode, variables, organizationId) {
    try {
      logger.info('Calculating employee benefit', {
        employeeId,
        componentCode,
        organizationId
      });

      // Get component (global or org-specific)
      let component;
      try {
        component = await this.getGlobalBenefitByCode(componentCode);
      } catch (err) {
        component = await this.repository.findByCode(componentCode, organizationId);
        if (!component) {
          throw new NotFoundError(`Component '${componentCode}' not found`);
        }
      }

      // Check for employee-specific override
      const employeeBenefit = await this.repository.findEmployeeComponentAssignment(
        employeeId,
        component.id,
        organizationId
      );

      let calculatedAmount;

      if (employeeBenefit?.overrideAmount) {
        // Use employee-specific override amount
        calculatedAmount = employeeBenefit.overrideAmount;
        logger.info('Using employee override amount', {
          employeeId,
          componentCode,
          overrideAmount: calculatedAmount
        });
      } else if (employeeBenefit?.overrideFormula) {
        // Use employee-specific override formula
        calculatedAmount = await this.formulaEngine.calculateSafe(
          employeeBenefit.overrideFormula,
          variables,
          `${componentCode} (employee override)`
        );
      } else if (component.formula) {
        // Use component formula
        calculatedAmount = await this.formulaEngine.calculateSafe(
          component.formula,
          variables,
          componentCode
        );
      } else if (component.defaultAmount) {
        // Use fixed amount
        calculatedAmount = component.defaultAmount;
      } else {
        throw new ValidationError('Component has no calculation method defined');
      }

      const result = {
        employeeId,
        componentCode,
        componentName: component.componentName,
        calculatedAmount,
        isTaxable: component.isTaxable,
        calculationMethod: employeeBenefit?.overrideFormula ? 'employee_override_formula'
          : employeeBenefit?.overrideAmount ? 'employee_override_amount'
          : component.formula ? 'component_formula'
          : 'fixed_amount',
        variables: variables,
        calculatedAt: new Date()
      };

      logger.info('Employee benefit calculated', result);

      return result;
    } catch (_error) {
      logger.error('Error calculating employee benefit', {
        error: error.message,
        employeeId,
        componentCode,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Remove benefit assignment from employee
   * 
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<void>}
   */
  async removeBenefitFromEmployee(assignmentId, organizationId, userId) {
    try {
      logger.info('Removing benefit assignment', {
        assignmentId,
        organizationId
      });

      await this.repository.removeEmployeeComponentAssignment(
        assignmentId,
        organizationId,
        userId
      );

      logger.info('Benefit assignment removed', { assignmentId });
    } catch (_error) {
      logger.error('Error removing benefit assignment', {
        error: error.message,
        assignmentId,
        organizationId
      });
      throw error;
    }
  }

  // ==================== TRACKING & REPORTING ====================

  /**
   * Get benefit usage statistics for organization
   * 
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Benefit statistics
   */
  async getBenefitStatistics(organizationId) {
    try {
      logger.info('Fetching benefit statistics', { organizationId });

      const stats = await this.repository.getComponentStatistics(organizationId, {
        componentType: 'earning',
        category: 'benefit'
      });

      logger.info('Benefit statistics fetched', { organizationId, stats });

      return stats;
    } catch (_error) {
      logger.error('Error fetching benefit statistics', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }
}

export default ForfaitairBenefitsService;
