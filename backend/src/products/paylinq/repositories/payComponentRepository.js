/**
 * Pay Component Repository
 * 
 * Data access layer for pay components (earnings and deductions),
 * component formulas, and custom pay components assigned to employees.
 * Supports standard components and organization-specific customizations.
 * 
 * @module products/paylinq/repositories/payComponentRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { ValidationError } from '../../../middleware/errorHandler.js';

class PayComponentRepository {
  constructor(database = null) {
    this.query = database?.query || query;
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
    // componentData is already in snake_case from DTO transformation
    const result = await this.query(
      `INSERT INTO payroll.pay_component 
      (organization_id, component_code, component_name, component_type,
       category, calculation_type, default_rate, default_amount,
       is_taxable, is_recurring, is_pre_tax, is_system_component,
       applies_to_gross, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        organizationId,
        componentData.component_code,       // snake_case (from DTO)
        componentData.component_name,       // snake_case (from DTO)
        componentData.component_type,       // snake_case (from DTO)
        componentData.category,
        componentData.calculation_type,     // snake_case (from DTO)
        componentData.default_rate,         // snake_case (from DTO)
        componentData.default_amount,       // snake_case (from DTO)
        componentData.is_taxable !== false, // snake_case (from DTO)
        componentData.is_recurring || false,        // snake_case (from DTO)
        componentData.is_pre_tax || false,         // snake_case (from DTO)
        componentData.is_system_component || false, // snake_case (from DTO)
        componentData.applies_to_gross || false,    // snake_case (from DTO)
        componentData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.pay_component', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find pay components by organization with pagination support
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} { components: Array, total: number }
   */
  async findPayComponents(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.componentType) {
      paramCount++;
      whereClause += ` AND component_type = $${paramCount}`;
      params.push(filters.componentType);
    }
    
    if (filters.category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.isSystemComponent !== undefined) {
      paramCount++;
      whereClause += ` AND is_system_component = $${paramCount}`;
      params.push(filters.isSystemComponent);
    }
    
    // Get total count for pagination
    const countResult = await this.query(
      `SELECT COUNT(*) as total FROM payroll.pay_component ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    // Build pagination
    let limitClause = '';
    if (filters.limit !== undefined) {
      paramCount++;
      limitClause += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    if (filters.offset !== undefined) {
      paramCount++;
      limitClause += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }
    
    const result = await this.query(
      `SELECT * FROM payroll.pay_component
       ${whereClause}
       ORDER BY component_type, component_name ASC
       ${limitClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    return {
      components: result.rows,
      total
    };
  }

  /**
   * Find pay component by ID
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Pay component or null
   */
  async findPayComponentById(componentId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.pay_component
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [componentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find pay component by code
   * @param {string} code - Component code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Pay component or null
   */
  async findPayComponentByCode(code, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.pay_component
       WHERE component_code = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [code, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    return result.rows[0] || null;
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
    const allowedFields = [
      'component_name', 'category', 'calculation_type', 
      'default_rate', 'default_amount', 'is_taxable', 
      'is_recurring', 'is_pre_tax', 'applies_to_gross',
      'description', 'status'
    ];
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      throw new ValidationError('No valid fields to update');
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(componentId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.pay_component 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_component', userId }
    );
    
    return result.rows[0];
  }

  // ==================== COMPONENT FORMULAS ====================
  
  /**
   * Create component formula
   * @param {Object} formulaData - Formula data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the formula
   * @returns {Promise<Object>} Created formula
   */
  async createComponentFormula(formulaData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.component_formula 
      (organization_id, pay_component_id, formula_name, formula_expression,
       formula_type, variables, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        organizationId,
        formulaData.payComponentId,
        formulaData.formulaName,
        formulaData.formulaExpression,
        formulaData.formulaType || 'arithmetic',
        JSON.stringify(formulaData.variables || {}),
        formulaData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.component_formula', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find formulas for pay component
   * @param {string} payComponentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Component formulas
   */
  async findFormulasByComponent(payComponentId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.component_formula
       WHERE pay_component_id = $1 
         AND organization_id = $2 
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [payComponentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.component_formula' }
    );
    
    return result.rows;
  }

  /**
   * Find formula by ID
   * @param {string} formulaId - Formula UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Formula or null
   */
  async findFormulaById(formulaId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.component_formula
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [formulaId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.component_formula' }
    );
    
    return result.rows[0] || null;
  }

  // ==================== GLOBAL COMPONENT LIBRARY (TIER 1) ====================

  /**
   * Find global components (organization_id IS NULL)
   * These are system-managed templates available to ALL organizations
   * 
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Global components
   */
  async findGlobalComponents(filters = {}) {
    let whereClauses = ['organization_id IS NULL', 'deleted_at IS NULL'];
    const values = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      whereClauses.push(`category = $${paramCount}`);
      values.push(filters.category);
    }

    if (filters.componentType) {
      paramCount++;
      whereClauses.push(`component_type = $${paramCount}`);
      values.push(filters.componentType);
    }

    if (filters.benefitType) {
      paramCount++;
      whereClauses.push(`metadata->>'benefit_type' LIKE $${paramCount}`);
      values.push(`%${filters.benefitType}%`);
    }

    if (filters.status) {
      paramCount++;
      whereClauses.push(`status = $${paramCount}`);
      values.push(filters.status);
    }

    const result = await this.query(
      `SELECT * FROM payroll.pay_component
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY component_code`,
      values,
      null, // No organization filter for global components
      { operation: 'SELECT', table: 'pay_component' }
    );

    return result.rows;
  }

  /**
   * Find global component by code
   * 
   * @param {string} componentCode - Component code
   * @returns {Promise<Object|null>} Global component or null
   */
  async findGlobalComponentByCode(componentCode) {
    const result = await this.query(
      `SELECT * FROM payroll.pay_component
       WHERE component_code = $1 
         AND organization_id IS NULL
         AND deleted_at IS NULL`,
      [componentCode],
      null,
      { operation: 'SELECT', table: 'pay_component' }
    );

    return result.rows[0] || null;
  }

  // ==================== EMPLOYEE BENEFIT ASSIGNMENT (TIER 3) ====================

  /**
   * Assign component to employee with optional overrides
   * 
   * @param {Object} assignmentData - Assignment data
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Created assignment
   */
  async assignComponentToEmployee(assignmentData, organizationId) {
    const result = await this.query(
      `INSERT INTO payroll.employee_pay_component_assignment
       (id, employee_id, component_id, component_code, organization_id,
        effective_from, effective_to, configuration, override_amount,
        override_formula, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        assignmentData.id,
        assignmentData.employeeId,
        assignmentData.componentId,
        assignmentData.componentCode,
        organizationId,
        assignmentData.effectiveFrom,
        assignmentData.effectiveTo,
        JSON.stringify(assignmentData.configuration || {}),
        assignmentData.overrideAmount,
        assignmentData.overrideFormula,
        assignmentData.notes,
        assignmentData.createdBy
      ],
      organizationId,
      { operation: 'INSERT', table: 'employee_pay_component_assignment' }
    );

    return result.rows[0];
  }

  /**
   * Find employee component assignment
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} componentId - Component UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Assignment or null
   */
  async findEmployeeComponentAssignment(employeeId, componentId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.employee_pay_component_assignment
       WHERE employee_id = $1
         AND component_id = $2
         AND organization_id = $3
         AND deleted_at IS NULL
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [employeeId, componentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'employee_pay_component_assignment' }
    );

    return result.rows[0] || null;
  }

  /**
   * Find all components assigned to employee
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Employee's component assignments
   */
  async findEmployeeComponents(employeeId, organizationId, filters = {}) {
    let whereClauses = [
      'ea.employee_id = $1',
      'ea.organization_id = $2',
      'ea.deleted_at IS NULL',
      'pc.deleted_at IS NULL'
    ];
    const values = [employeeId, organizationId];
    let paramCount = 2;

    if (filters.effectiveDate) {
      paramCount++;
      whereClauses.push(`ea.effective_from <= $${paramCount}`);
      values.push(filters.effectiveDate);
      
      paramCount++;
      whereClauses.push(`(ea.effective_to IS NULL OR ea.effective_to >= $${paramCount})`);
      values.push(filters.effectiveDate);
    }

    if (filters.componentType) {
      paramCount++;
      whereClauses.push(`pc.component_type = $${paramCount}`);
      values.push(filters.componentType);
    }

    if (filters.category) {
      paramCount++;
      whereClauses.push(`pc.category = $${paramCount}`);
      values.push(filters.category);
    }

    const result = await this.query(
      `SELECT 
         ea.*,
         pc.component_name,
         pc.component_type,
         pc.category,
         pc.calculation_type,
         pc.formula,
         pc.default_amount,
         pc.default_rate,
         pc.is_taxable,
         pc.is_recurring
       FROM payroll.employee_pay_component_assignment ea
       INNER JOIN payroll.pay_component pc ON ea.component_id = pc.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY ea.effective_from DESC`,
      values,
      organizationId,
      { operation: 'SELECT', table: 'employee_pay_component_assignment' }
    );

    return result.rows;
  }

  /**
   * Alias for backwards compatibility: findEmployeeComponentAssignments
   */
  async findEmployeeComponentAssignments(employeeId, organizationId, filters = {}) {
    return this.findEmployeeComponents(employeeId, organizationId, filters);
  }

  /**
   * Find employee component assignment by ID
   * 
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Assignment or null
   */
  async findEmployeeComponentAssignmentById(assignmentId, organizationId) {
    const result = await this.query(
      `SELECT 
         ea.*,
         pc.component_name,
         pc.component_type,
         pc.category,
         pc.calculation_type,
         pc.formula,
         pc.default_amount,
         pc.default_rate,
         pc.is_taxable,
         pc.is_recurring
       FROM payroll.employee_pay_component_assignment ea
       INNER JOIN payroll.pay_component pc ON ea.component_id = pc.id
       WHERE ea.id = $1
         AND ea.organization_id = $2
         AND ea.deleted_at IS NULL`,
      [assignmentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'employee_pay_component_assignment' }
    );

    return result.rows[0] || null;
  }

  /**
   * Update employee component assignment
   * 
   * @param {string} assignmentId - Assignment UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Updated assignment
   */
  async updateEmployeeComponentAssignment(assignmentId, updates, organizationId) {
    const setClauses = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic SET clause
    const allowedFields = [
      'effective_from',
      'effective_to',
      'configuration',
      'override_amount',
      'override_formula',
      'notes',
      'updated_by'
    ];

    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey) && updates[key] !== undefined) {
        paramCount++;
        setClauses.push(`${snakeKey} = $${paramCount}`);
        values.push(
          snakeKey === 'configuration' && typeof updates[key] === 'object'
            ? JSON.stringify(updates[key])
            : updates[key]
        );
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at
    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    // Add WHERE parameters
    paramCount++;
    values.push(assignmentId);
    const idParam = paramCount;

    paramCount++;
    values.push(organizationId);
    const orgParam = paramCount;

    const result = await this.query(
      `UPDATE payroll.employee_pay_component_assignment
       SET ${setClauses.join(', ')}
       WHERE id = $${idParam}
         AND organization_id = $${orgParam}
         AND deleted_at IS NULL
       RETURNING *`,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'employee_pay_component_assignment' }
    );

    return result.rows[0];
  }

  /**
   * Remove employee component assignment (soft delete)
   * 
   * @param {string} assignmentId - Assignment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<void>}
   */
  async removeEmployeeComponentAssignment(assignmentId, organizationId, userId) {
    await this.query(
      `UPDATE payroll.employee_pay_component_assignment
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, assignmentId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'employee_pay_component_assignment' }
    );
  }

  /**
   * Alias for backwards compatibility: updateEmployeeAssignment
   */
  async updateEmployeeAssignment(assignmentId, updates, organizationId, userId) {
    return this.updateEmployeeComponentAssignment(assignmentId, { ...updates, updatedBy: userId }, organizationId);
  }

  /**
   * Alias for backwards compatibility: deleteEmployeeAssignment
   */
  async deleteEmployeeAssignment(assignmentId, organizationId, userId) {
    await this.removeEmployeeComponentAssignment(assignmentId, organizationId, userId);
    return true;
  }

  /**
   * Get component statistics for organization
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Component statistics
   */
  async getComponentStatistics(organizationId, filters = {}) {
    let whereClauses = ['organization_id = $1', 'deleted_at IS NULL'];
    const values = [organizationId];
    let paramCount = 1;

    if (filters.componentType) {
      paramCount++;
      whereClauses.push(`component_type = $${paramCount}`);
      values.push(filters.componentType);
    }

    if (filters.category) {
      paramCount++;
      whereClauses.push(`category = $${paramCount}`);
      values.push(filters.category);
    }

    const result = await this.query(
      `SELECT 
         COUNT(*) as total_components,
         COUNT(*) FILTER (WHERE is_system_component = true) as system_components,
         COUNT(*) FILTER (WHERE is_system_component = false) as custom_components,
         COUNT(*) FILTER (WHERE component_type = 'earning') as earnings,
         COUNT(*) FILTER (WHERE component_type = 'deduction') as deductions,
         COUNT(*) FILTER (WHERE category = 'benefit') as benefits
       FROM payroll.pay_component
       WHERE ${whereClauses.join(' AND ')}`,
      values,
      organizationId,
      { operation: 'SELECT', table: 'pay_component' }
    );

    return result.rows[0];
  }
}

export default PayComponentRepository;


