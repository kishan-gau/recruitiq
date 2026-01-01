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

import crypto from 'crypto';
import Joi from 'joi';
import PayComponentRepository from '../repositories/payComponentRepository.js';
import { mapComponentDbToApi, mapComponentsDbToApi, mapComponentApiToDb } from '../dto/payComponentDto.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import formulaEngine from '../../../services/formula/FormulaEngine.js';

class PayComponentService {
  
  payComponentRepository: any;

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

  // New schema for employee_pay_component_assignment
  employeeAssignmentSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    componentId: Joi.string().uuid().required(),
    componentCode: Joi.string().required(),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().optional().allow(null),
    configuration: Joi.object().optional().default({}),
    overrideAmount: Joi.number().optional().allow(null),
    overrideFormula: Joi.string().optional().allow(null, ''),
    notes: Joi.string().optional().allow(null, ''),
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
    const { error, value } = this.payComponentSchema.validate(componentData, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    
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
    } catch (error) {
      logger.error('Error creating pay component', { error: error.message, organizationId });
      throw error;
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
    } catch (error) {
      logger.error('Error fetching pay components', { error: error.message, organizationId });
      throw error;
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
    } catch (error) {
      logger.error('Error fetching pay component', { error: error.message, componentId });
      throw error;
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
        throw new ValidationError('system component cannot be modified');
      }

      // Business rule: Prevent updating component code (immutable after creation)
      if (updates.componentCode) {
        throw new ValidationError('Component code cannot be changed after creation');
      }

      // Business rule: If updating category, validate it matches component type
      if (updates.category) {
        const componentType = updates.componentType || existing.componentType;
        this.validateCategoryForType(componentType, updates.category);
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
    } catch (error) {
      logger.error('Error updating pay component', { error: error.message, componentId });
      throw error;
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
          'system component cannot be deleted. These are required for payroll processing.'
        );
      }

      // Business rule: Check if component has active employee assignments
      // Use repository method if available (for testing), otherwise skip
      if (this.payComponentRepository.getEmployeeComponents) {
        const assignments = await this.payComponentRepository.getEmployeeComponents(
          componentId,
          organizationId
        );
        if (assignments && assignments.length > 0) {
          throw new ConflictError(
            'Cannot delete this pay component because it has active employee assignments. ' +
            'Please remove all employee assignments first, or deactivate the component instead.'
          );
        }
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
    } catch (error) {
      // Enhance error message for "in use" scenario
      if (error.message.includes('assigned to employees')) {
        throw new ConflictError(
          'Cannot delete this pay component because it is currently assigned to one or more employees. ' +
          'Please remove all employee assignments first, or deactivate the component instead.'
        );
      }
      logger.error('Error deleting pay component', { error: error.message, componentId });
      throw error;
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
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
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
    } catch (error) {
      logger.error('Error in bulk component creation', { error: error.message, organizationId });
      throw error;
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
    const { error, value } = this.componentFormulaSchema.validate(formulaData, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
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

      // Transform to camelCase for API response
      return {
        id: formula.id,
        payComponentId: formula.pay_component_id,
        formulaName: formula.formula_name,
        formulaExpression: formula.formula_expression,
        formulaType: formula.formula_type,
        description: formula.description,
        createdAt: formula.created_at,
        createdBy: formula.created_by
      };
    } catch (error) {
      logger.error('Error creating component formula', { error: error.message, organizationId });
      throw error;
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
    } catch (error) {
      logger.error('Error fetching component formulas', { error: error.message, componentId });
      throw error;
    }
  }

  /**
   * Alias: Get component formulas (backwards compatibility)
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Component formulas
   */
  async getComponentFormulas(componentId, organizationId) {
    return this.getFormulasByComponent(componentId, organizationId);
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
      throw new ValidationError('Invalid formula expression. Only arithmetic operators and variables are allowed');
    }

    // Check for balanced parentheses
    let balance = 0;
    for (const char of expression) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        throw new ValidationError('Invalid formula expression. Unbalanced parentheses');
      }
    }

    if (balance !== 0) {
      throw new ValidationError('Invalid formula expression. Unbalanced parentheses');
    }
  }

  /**
   * Get employee component assignments
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Component assignments
   */
  async getEmployeeComponentAssignments(employeeId, organizationId, filters = {}) {
    try {
      return await this.payComponentRepository.findEmployeeComponentAssignments(
        employeeId,
        organizationId,
        filters
      );
    } catch (error) {
      logger.error('Error fetching employee component assignments', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Update employee component assignment
   * @param {string} assignmentId - Assignment UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated assignment
   */
  async updateEmployeeAssignment(assignmentId, updates, organizationId, userId) {
    try {
      const assignment = await this.payComponentRepository.updateEmployeeAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      logger.info('Employee assignment updated', {
        assignmentId,
        updatedFields: Object.keys(updates),
        organizationId
      });

      return assignment;
    } catch (error) {
      logger.error('Error updating employee assignment', { error: error.message, assignmentId });
      throw error;
    }
  }

  /**
   * Delete employee component assignment
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the assignment
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployeeAssignment(assignmentId, organizationId, userId) {
    try {
      const result = await this.payComponentRepository.deleteEmployeeAssignment(
        assignmentId,
        organizationId,
        userId
      );

      logger.info('Employee assignment deleted', { assignmentId, organizationId });

      return result;
    } catch (error) {
      logger.error('Error deleting employee assignment', { error: error.message, assignmentId });
      throw error;
    }
  }

  // ==================== EMPLOYEE COMPONENT ASSIGNMENTS (NEW SYSTEM) ====================

  /**
   * Assign component to employee with rich configuration
   * @param {Object} assignmentData - Assignment data with configuration
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating assignment
   * @returns {Promise<Object>} Created assignment
   */
  async assignComponentToEmployee(assignmentData, organizationId, userId) {
    const { error, value } = this.employeeAssignmentSchema.validate(assignmentData, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const { employeeId, componentId, componentCode, effectiveFrom, effectiveTo, 
              configuration, overrideAmount, overrideFormula, notes } = value;

      // Validate component exists
      const component = await this.getPayComponentById(componentId, organizationId);
      if (!component) {
        throw new NotFoundError('Pay component not found');
      }

      // Business rule: Cannot assign inactive components
      if (!component.isActive) {
        throw new ValidationError('Cannot assign inactive component to employee');
      }

      // Validate effective dates
      if (effectiveFrom && effectiveTo) {
        const from = new Date(effectiveFrom);
        const to = new Date(effectiveTo);
        if (to <= from) {
          throw new ValidationError('Effective to date must be after effective from date');
        }
      }

      // Create assignment with generated UUID
      const assignment = {
        id: crypto.randomUUID(),
        employeeId,
        componentId,
        componentCode: componentCode || component.componentCode,
        effectiveFrom,
        effectiveTo,
        configuration: configuration || {},
        overrideAmount,
        overrideFormula,
        notes,
        createdBy: userId
      };

      const created = await this.payComponentRepository.assignComponentToEmployee(assignment, organizationId);

      logger.info('Component assigned to employee', {
        organizationId,
        employeeId,
        componentId,
        assignmentId: created.id,
        userId
      });

      // Transform to camelCase for API response
      return {
        id: created.id,
        employeeId: created.employee_id,
        componentId: created.component_id,
        componentCode: created.component_code,
        effectiveFrom: created.effective_from,
        effectiveTo: created.effective_to,
        configuration: created.configuration,
        overrideAmount: created.override_amount,
        overrideFormula: created.override_formula,
        notes: created.notes,
        createdAt: created.created_at,
        createdBy: created.created_by
      };
    } catch (error) {
      logger.error('Error assigning component to employee', { 
        error: error.message, 
        employeeId: assignmentData.employeeId,
        componentId: assignmentData.componentId 
      });
      throw error;
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
    } catch (error) {
      logger.error('Error fetching active pay components for payroll', { error: error.message, organizationId });
      throw error;
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
    } catch (error) {
      logger.error('Error executing formula', {
        error: error.message,
        componentId,
        variables,
        organizationId,
      });
      throw error;
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
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message, type: 'error' }],
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
    } catch (error) {
      logger.error('Error testing formula', { error: error.message, formula });
      throw new ValidationError(`Formula test failed: ${error.message}`);
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
   * Alias: Create employee pay component (backwards compatibility)
   * @param {Object} componentData - Component data
   * @returns {Promise<Object>} Created assignment
   */
  async createEmployeePayComponent(componentData) {
    const { organizationId, createdBy, employeeId, payComponentId, componentCode, ...data } = componentData;
    return this.assignComponentToEmployee({
      employeeId,
      componentId: payComponentId,
      componentCode,
      ...data
    }, organizationId, createdBy);
  }

  /**
   * Alias: Get pay components by employee (backwards compatibility)
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Employee component assignments
   */
  async getPayComponentsByEmployee(employeeId, organizationId, filters = {}) {
    return this.getEmployeeComponentAssignments(employeeId, organizationId, filters);
  }

  /**
   * Alias: Update employee pay component (backwards compatibility)
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated assignment
   */
  async updateEmployeePayComponent(assignmentId, organizationId, updates, userId) {
    return this.updateEmployeeAssignment(assignmentId, updates, organizationId, userId);
  }

  /**
   * Alias: Delete employee pay component (backwards compatibility)
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the assignment
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployeePayComponent(assignmentId, organizationId, userId) {
    return this.deleteEmployeeAssignment(assignmentId, organizationId, userId);
  }

  /**
   * Get employee component assignments
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Component assignments
   */
  async getEmployeeComponentAssignments(employeeId, organizationId, filters = {}) {
    return this.payComponentRepository.findEmployeeComponents(employeeId, organizationId, filters);
  }

  /**
   * Get single employee component assignment
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Component assignment
   */
  async getEmployeeComponentAssignment(assignmentId, organizationId) {
    const assignment = await this.payComponentRepository.findEmployeeComponentAssignmentById(assignmentId, organizationId);
    if (!assignment) {
      throw new NotFoundError('Component assignment not found');
    }
    return assignment;
  }

  /**
   * Update employee component assignment
   * @param {string} assignmentId - Assignment UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making update
   * @returns {Promise<Object>} Updated assignment
   */
  async updateEmployeeComponentAssignment(assignmentId, updates, organizationId, userId) {
    // Validate assignment exists
    const existing = await this.getEmployeeComponentAssignment(assignmentId, organizationId);
    if (!existing) {
      throw new NotFoundError('Component assignment not found');
    }

    // Update assignment
    const updated = await this.payComponentRepository.updateEmployeeComponentAssignment(
      assignmentId,
      { ...updates, updatedBy: userId },
      organizationId
    );

    logger.info('Component assignment updated', {
      organizationId,
      assignmentId,
      updatedFields: Object.keys(updates),
      userId
    });

    return updated;
  }

  /**
   * Remove employee component assignment
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User removing assignment
   * @returns {Promise<boolean>} Success status
   */
  async removeEmployeeComponentAssignment(assignmentId, organizationId, userId) {
    // Validate assignment exists
    await this.getEmployeeComponentAssignment(assignmentId, organizationId);
    
    await this.payComponentRepository.removeEmployeeComponentAssignment(assignmentId, organizationId, userId);
    
    logger.info('Component assignment removed', {
      organizationId,
      assignmentId,
      userId
    });

    return true;
  }
}

export default PayComponentService;
