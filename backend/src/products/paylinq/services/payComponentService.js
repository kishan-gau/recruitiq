/**
 * Pay Component Service
 * 
 * Business logic layer for pay component management, component formulas, and custom employee components.
 * Handles earnings, deductions, and formula-based calculations.
 * 
 * MVP Version: Simple arithmetic formulas (hours * rate)
 * Phase 2: Advanced formula engine with complex expressions, variables, and conditions
 * 
 * @module products/paylinq/services/payComponentService
 */

import Joi from 'joi';
import PayComponentRepository from '../repositories/payComponentRepository.js';
import { mapComponentDbToApi, mapComponentsDbToApi, mapComponentApiToDb } from '../dto/payComponentDto.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import formulaEngine from '../../../services/formula/FormulaEngine.js';

class PayComponentService {
  constructor(repository = null) {
    this.payComponentRepository = repository || new PayComponentRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  payComponentSchema = Joi.object({
    componentCode: Joi.string().min(2).max(50).required(),
    componentName: Joi.string().min(2).max(100).required(),
    componentType: Joi.string().valid('earning', 'deduction', 'benefit', 'tax', 'reimbursement').required(),
    category: Joi.string().valid(
      'regular', 'regular_pay', 'overtime', 'bonus', 'commission', 'allowance',
      'tax', 'benefit', 'garnishment', 'loan', 'other'
    ).allow(null, ''),
    calculationType: Joi.string().valid('fixed', 'fixed_amount', 'percentage', 'hours_based', 'hourly_rate', 'formula', 'unit_based').required(),
    defaultRate: Joi.number().min(0).allow(null),
    defaultAmount: Joi.number().min(0).allow(null),
    formula: Joi.string().max(1000).allow(null, ''), // Formula expression for calculation_type='formula'
    isTaxable: Joi.boolean().default(true),
    isRecurring: Joi.boolean().default(true),
    isPreTax: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
    isSystemComponent: Joi.boolean().default(false),
    appliesToGross: Joi.boolean().default(false),
    appliesToOvertime: Joi.boolean().default(false),
    affectsTaxableIncome: Joi.boolean().default(true),
    description: Joi.string().max(500).allow(null, ''),
    metadata: Joi.object().allow(null), // Allow metadata for additional flexible data
  });

  componentFormulaSchema = Joi.object({
    payComponentId: Joi.string().uuid().required(),
    formulaName: Joi.string().min(2).max(100).required(),
    formulaExpression: Joi.string().required(),
    formulaType: Joi.string().valid('arithmetic', 'conditional', 'aggregate').default('arithmetic'),
    variables: Joi.object().allow(null),
    description: Joi.string().max(500).allow(null, '')
  });

  customComponentSchema = Joi.object({
    employeeRecordId: Joi.string().uuid().required(),
    payComponentId: Joi.string().uuid().required(),
    customRate: Joi.number().min(0).allow(null),
    customAmount: Joi.number().min(0).allow(null),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    isActive: Joi.boolean().default(true),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== BUSINESS RULE VALIDATORS ====================

  /**
   * Validate that category is appropriate for component type
   * Industry Standard: Earnings and deductions have different valid categories
   * @param {string} componentType - Component type (earning, deduction)
   * @param {string} category - Category to validate
   * @throws {ValidationError} If category doesn't match type
   */
  validateCategoryForType(componentType, category) {
    if (!category) return; // Category is optional

    const earningCategories = ['regular', 'regular_pay', 'overtime', 'bonus', 'commission', 'allowance', 'other'];
    const deductionCategories = ['tax', 'benefit', 'garnishment', 'loan', 'other'];

    // Normalize component type (benefit and tax are deduction types)
    const normalizedType = ['benefit', 'tax'].includes(componentType) ? 'deduction' : componentType;
    
    if (normalizedType === 'earning' && !earningCategories.includes(category)) {
      throw new ValidationError(
        `Invalid category '${category}' for earning component. ` +
        `Valid categories: ${earningCategories.join(', ')}`
      );
    }

    if (normalizedType === 'deduction' && !deductionCategories.includes(category)) {
      throw new ValidationError(
        `Invalid category '${category}' for deduction component. ` +
        `Valid categories: ${deductionCategories.join(', ')}`
      );
    }
  }

  // ==================== PAY COMPONENTS ====================

  /**
   * Create pay component
   * @param {Object} componentData - Pay component data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the component
   * @returns {Promise<Object>} Created pay component
   */
  async createPayComponent(componentData, organizationId, userId) {
    const { error, value } = this.payComponentSchema.validate(componentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate component code format (uppercase, alphanumeric, underscores only)
    const codePattern = /^[A-Z0-9_]+$/;
    if (!codePattern.test(value.componentCode)) {
      throw new ValidationError('Component code must be uppercase letters, numbers, and underscores only');
    }

    // Business rule: Validate category matches component type
    this.validateCategoryForType(value.componentType, value.category);

    // Business rule: Validate calculation type has appropriate default
    const calcType = value.calculationType;
    if ((calcType === 'fixed_amount' || calcType === 'fixed') && !value.defaultAmount) {
      // Optional validation - some fixed components may not have defaults
      // throw new ValidationError('Fixed amount components must have a default amount');
    }
    if (calcType === 'percentage' && !value.defaultRate) {
      // Optional validation - some percentage components may not have defaults
      // throw new ValidationError('Percentage components must have a default rate');
    }
    if ((calcType === 'hourly_rate' || calcType === 'hours_based') && !value.defaultRate) {
      // Optional validation - some hourly components may not have defaults
      // throw new ValidationError('Hourly rate components must have a default rate');
    }

    // Business rule: Validate formula if calculation type is 'formula'
    if (calcType === 'formula') {
      if (!value.formula || value.formula.trim() === '') {
        throw new ValidationError('Formula is required when calculation type is "formula"');
      }

      try {
        // Parse and validate formula
        const ast = formulaEngine.parse(value.formula);
        const validationResult = formulaEngine.validate(ast);

        if (!validationResult.valid) {
          const errors = validationResult.errors.map(e => e.message).join('; ');
          throw new ValidationError(`Formula validation failed: ${errors}`);
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          logger.warn('Formula validation warnings', {
            formula: value.formula,
            warnings: validationResult.warnings,
          });
        }

        // Store parsed AST in metadata for future use
        value.metadata = value.metadata || {};
        value.metadata.formulaAST = formulaEngine.astToJSON(ast);
        value.metadata.formulaVariables = formulaEngine.extractVariables(ast);

      } catch (formulaError) {
        throw new ValidationError(`Invalid formula: ${formulaError.message}`);
      }
    }

    try {
      // Business rule: Check for duplicate code
      const existing = await this.payComponentRepository.findPayComponentByCode(
        value.componentCode,
        organizationId
      );

      if (existing) {
        throw new ConflictError(
          `Pay component with code '${value.componentCode}' already exists. ` +
          `Component codes must be unique within your organization.`
        );
      }

      // Transform API data to DB format
      const dbData = mapComponentApiToDb(value);

      const component = await this.payComponentRepository.createPayComponent(
        dbData,
        organizationId,
        userId
      );

      // Transform DB result to API format
      const apiComponent = mapComponentDbToApi(component);

      logger.info('Pay component created', {
        componentId: apiComponent.id,
        componentCode: apiComponent.componentCode,
        componentType: apiComponent.componentType,
        organizationId
      });

      return apiComponent;
    } catch (err) {
      logger.error('Error creating pay component', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get all pay components for an organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} { components: Array, total: number }
   */
  async getPayComponents(organizationId, filters = {}) {
    try {
      const result = await this.payComponentRepository.findPayComponents(organizationId, filters);
      return {
        components: mapComponentsDbToApi(result.components),
        total: result.total
      };
    } catch (err) {
      logger.error('Error fetching pay components', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get pay component by ID
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Pay component
   */
  async getPayComponentById(componentId, organizationId) {
    try {
      const component = await this.payComponentRepository.findPayComponentById(
        componentId,
        organizationId
      );

      if (!component) {
        throw new NotFoundError('Pay component not found');
      }

      return mapComponentDbToApi(component);
    } catch (err) {
      logger.error('Error fetching pay component', { error: err.message, componentId });
      throw err;
    }
  }

  /**
   * Update pay component
   * @param {string} componentId - Pay component UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated pay component
   */
  async updatePayComponent(componentId, updates, organizationId, userId) {
    try {
      // Business rule: Prevent updating system components
      const existing = await this.getPayComponentById(componentId, organizationId);
      if (existing.isSystemDefined) {
        throw new ValidationError('System components cannot be modified');
      }

      // Business rule: If updating category, validate it matches component type
      if (updates.category) {
        const componentType = updates.componentType || existing.componentType;
        this.validateCategoryForType(componentType, updates.category);
      }

      // Business rule: If updating code, validate format and uniqueness
      if (updates.componentCode) {
        const codePattern = /^[A-Z0-9_]+$/;
        if (!codePattern.test(updates.componentCode)) {
          throw new ValidationError('Component code must be uppercase letters, numbers, and underscores only');
        }

        // Check if new code is already in use (by a different component)
        const duplicate = await this.payComponentRepository.findPayComponentByCode(
          updates.componentCode,
          organizationId
        );
        if (duplicate && duplicate.id !== componentId) {
          throw new ConflictError(
            `Pay component with code '${updates.componentCode}' already exists. ` +
            `Component codes must be unique within your organization.`
          );
        }
      }

      // Transform API data to DB format
      const dbUpdates = mapComponentApiToDb(updates);

      const component = await this.payComponentRepository.updatePayComponent(
        componentId,
        dbUpdates,
        organizationId,
        userId
      );

      logger.info('Pay component updated', {
        componentId,
        updatedFields: Object.keys(updates),
        organizationId
      });

      // Transform DB result to API format
      return mapComponentDbToApi(component);
    } catch (err) {
      logger.error('Error updating pay component', { error: err.message, componentId });
      throw err;
    }
  }

  /**
   * Delete pay component
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the component
   * @returns {Promise<boolean>} Success status
   */
  async deletePayComponent(componentId, organizationId, userId) {
    try {
      // Business rule: Prevent deleting system components
      const existing = await this.getPayComponentById(componentId, organizationId);
      if (existing.isSystemDefined) {
        throw new ValidationError(
          'System components cannot be deleted. These are required for payroll processing.'
        );
      }

      // Business rule: Check if component is in use (done in repository layer)
      // This will throw an error if component is assigned to any active employees
      const deleted = await this.payComponentRepository.deletePayComponent(
        componentId,
        organizationId,
        userId
      );

      if (deleted) {
        logger.info('Pay component deleted', { componentId, organizationId });
      }

      return deleted;
    } catch (err) {
      // Enhance error message for "in use" scenario
      if (err.message.includes('assigned to employees')) {
        throw new ConflictError(
          'Cannot delete this pay component because it is currently assigned to one or more employees. ' +
          'Please remove all employee assignments first, or deactivate the component instead.'
        );
      }
      logger.error('Error deleting pay component', { error: err.message, componentId });
      throw err;
    }
  }

  /**
   * Bulk create pay components
   * @param {Array} components - Array of component objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the components
   * @returns {Promise<Array>} Created pay components
   */
  async bulkCreatePayComponents(components, organizationId, userId) {
    try {
      const results = [];

      for (const component of components) {
        try {
          const result = await this.createPayComponent(component, organizationId, userId);
          results.push({ success: true, data: result });
        } catch (err) {
          results.push({
            success: false,
            error: err.message,
            componentCode: component.componentCode
          });
        }
      }

      logger.info('Bulk pay component creation completed', {
        total: components.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error in bulk component creation', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== COMPONENT FORMULAS ====================

  /**
   * Create component formula
   * @param {Object} formulaData - Component formula data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the formula
   * @returns {Promise<Object>} Created component formula
   */
  async createComponentFormula(formulaData, organizationId, userId) {
    const { error, value } = this.componentFormulaSchema.validate(formulaData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Verify component exists
      await this.getPayComponentById(value.payComponentId, organizationId);

      // MVP: Validate formula expression (simple arithmetic only)
      this.validateFormulaExpression(value.formulaExpression);

      const formula = await this.payComponentRepository.createComponentFormula(
        value,
        organizationId,
        userId
      );

      logger.info('Component formula created', {
        formulaId: formula.id,
        componentId: formula.pay_component_id,
        organizationId
      });

      return formula;
    } catch (err) {
      logger.error('Error creating component formula', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get formulas by component
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Component formulas
   */
  async getFormulasByComponent(componentId, organizationId) {
    try {
      return await this.payComponentRepository.findFormulasByComponent(componentId, organizationId);
    } catch (err) {
      logger.error('Error fetching component formulas', { error: err.message, componentId });
      throw err;
    }
  }

  /**
   * Validate formula expression (MVP - simple arithmetic)
   * @param {string} expression - Formula expression
   * @throws {Error} If expression is invalid
   */
  validateFormulaExpression(expression) {
    // MVP: Allow simple arithmetic with variables
    // Allowed: +, -, *, /, (), numbers, variables in {variable} format
    const allowedPattern = /^[\d\s+\-*/().{}\w]+$/;

    if (!allowedPattern.test(expression)) {
      throw new Error('Invalid formula expression. Only arithmetic operators and variables are allowed');
    }

    // Check for balanced parentheses
    let balance = 0;
    for (const char of expression) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        throw new Error('Invalid formula expression. Unbalanced parentheses');
      }
    }

    if (balance !== 0) {
      throw new Error('Invalid formula expression. Unbalanced parentheses');
    }
  }

  // ==================== CUSTOM COMPONENTS ====================

  /**
   * Assign custom component to employee
   * @param {Object} customComponentData - Custom component data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignment
   * @returns {Promise<Object>} Created custom component
   */
  async assignCustomComponent(customComponentData, organizationId, userId) {
    const { error, value } = this.customComponentSchema.validate(customComponentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate effective dates
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }

    // Business rule: Must have either custom rate or custom amount
    if (!value.customRate && !value.customAmount) {
      throw new Error('Custom component must have either custom rate or custom amount');
    }

    try {
      // Verify component exists
      await this.getPayComponentById(value.payComponentId, organizationId);

      const customComponent = await this.payComponentRepository.assignCustomComponent(
        value,
        organizationId,
        userId
      );

      logger.info('Custom component assigned to employee', {
        customComponentId: customComponent.id,
        employeeId: customComponent.employee_id,
        componentId: customComponent.pay_component_id,
        organizationId
      });

      return customComponent;
    } catch (err) {
      logger.error('Error assigning custom component', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get custom components for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Custom components
   */
  async getCustomComponentsByEmployee(employeeRecordId, organizationId, filters = {}) {
    try {
      return await this.payComponentRepository.findCustomComponentsByEmployee(
        employeeRecordId,
        organizationId,
        filters
      );
    } catch (err) {
      logger.error('Error fetching custom components', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Update custom component
   * @param {string} customComponentId - Custom component UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated custom component
   */
  async updateCustomComponent(customComponentId, updates, organizationId, userId) {
    try {
      const customComponent = await this.payComponentRepository.updateCustomComponent(
        customComponentId,
        updates,
        organizationId,
        userId
      );

      logger.info('Custom component updated', {
        customComponentId,
        updatedFields: Object.keys(updates),
        organizationId
      });

      return customComponent;
    } catch (err) {
      logger.error('Error updating custom component', { error: err.message, customComponentId });
      throw err;
    }
  }

  /**
   * Deactivate custom component
   * @param {string} customComponentId - Custom component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deactivating the component
   * @returns {Promise<Object>} Updated custom component
   */
  async deactivateCustomComponent(customComponentId, organizationId, userId) {
    try {
      const customComponent = await this.payComponentRepository.deactivateCustomComponent(
        customComponentId,
        organizationId,
        userId
      );

      logger.info('Custom component deactivated', { customComponentId, organizationId });

      return customComponent;
    } catch (err) {
      logger.error('Error deactivating custom component', { error: err.message, customComponentId });
      throw err;
    }
  }

  /**
   * Get active pay components for payroll processing
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Active pay components
   */
  async getActivePayComponentsForPayroll(organizationId) {
    try {
      const components = await this.payComponentRepository.findActivePayComponentsForPayroll(organizationId);
      return mapComponentsDbToApi(components);
    } catch (err) {
      logger.error('Error fetching active pay components for payroll', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== FORMULA EXECUTION ====================

  /**
   * Execute formula for a pay component
   * @param {string} componentId - Pay component UUID
   * @param {Object} variables - Variables for formula execution {gross_pay: 5000, hours_worked: 160}
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Execution result {value, executionTime, variablesUsed}
   */
  async executeComponentFormula(componentId, variables, organizationId) {
    try {
      const component = await this.getPayComponentById(componentId, organizationId);

      if (component.calculationType !== 'formula') {
        throw new ValidationError('Component is not a formula-based component');
      }

      if (!component.formula) {
        throw new ValidationError('Component does not have a formula defined');
      }

      // Execute formula
      const result = formulaEngine.execute(component.formula, variables);

      // Log execution for audit trail
      logger.info('Formula executed', {
        componentId,
        componentCode: component.componentCode,
        formula: component.formula,
        variables,
        result: result.value,
        executionTime: result.metadata.executionTime,
        organizationId,
      });

      return {
        value: result.value,
        executionTime: result.metadata.executionTime,
        variablesUsed: result.metadata.variablesUsed,
        formula: component.formula,
        componentName: component.componentName,
        componentCode: component.componentCode,
      };
    } catch (err) {
      logger.error('Error executing formula', {
        error: err.message,
        componentId,
        variables,
        organizationId,
      });
      throw err;
    }
  }

  /**
   * Validate formula without saving
   * @param {string} formula - Formula expression
   * @returns {Object} Validation result
   */
  validateFormula(formula) {
    try {
      const ast = formulaEngine.parse(formula);
      const validationResult = formulaEngine.validate(ast);

      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        variables: formulaEngine.extractVariables(ast),
        ast: formulaEngine.astToJSON(ast),
      };
    } catch (err) {
      return {
        valid: false,
        errors: [{ message: err.message, type: 'error' }],
        warnings: [],
      };
    }
  }

  /**
   * Test formula with sample data
   * @param {string} formula - Formula expression
   * @returns {Object} Test results
   */
  testFormula(formula) {
    try {
      return formulaEngine.test(formula);
    } catch (err) {
      logger.error('Error testing formula', { error: err.message, formula });
      throw new ValidationError(`Formula test failed: ${err.message}`);
    }
  }

  // ==================== ALIAS METHODS FOR API COMPATIBILITY ====================

  /**
   * Alias: Get pay components by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Pay components
   */
  async getPayComponentsByOrganization(organizationId, filters = {}) {
    return this.getPayComponents(organizationId, filters);
  }

  /**
   * Alias: Create employee pay component
   * @param {Object} componentData - Custom component data
   * @returns {Promise<Object>} Created custom component
   */
  async createEmployeePayComponent(componentData) {
    const { organizationId, createdBy, employeeId, ...data } = componentData;
    // Map employeeId to employeeRecordId for the underlying method
    if (employeeId) {
      data.employeeRecordId = employeeId;
    }
    return this.assignCustomComponent(data, organizationId, createdBy);
  }

  /**
   * Alias: Get pay components by employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Employee pay components
   */
  async getPayComponentsByEmployee(employeeRecordId, organizationId, filters = {}) {
    return this.getCustomComponentsByEmployee(employeeRecordId, organizationId, filters);
  }

  /**
   * Alias: Update employee pay component
   * @param {string} customComponentId - Custom component UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated custom component
   */
  async updateEmployeePayComponent(customComponentId, organizationId, updates, userId) {
    return this.updateCustomComponent(customComponentId, updates, organizationId, userId);
  }

  /**
   * Alias: Delete employee pay component
   * @param {string} customComponentId - Custom component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the component
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployeePayComponent(customComponentId, organizationId, userId) {
    return this.deactivateCustomComponent(customComponentId, organizationId, userId);
  }
}

export default PayComponentService;
