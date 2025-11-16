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
        componentData.componentCode,
        componentData.componentName,
        componentData.componentType, // 'earning' or 'deduction'
        componentData.category,
        componentData.calculationType, // 'fixed_amount', 'percentage', 'hourly_rate', 'formula'
        componentData.defaultRate,
        componentData.defaultAmount,
        componentData.isTaxable !== false,
        componentData.isRecurring || false,
        componentData.isPreTax || false,
        componentData.isSystemComponent || false,
        componentData.appliesToGross || false,
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
      throw new Error('No valid fields to update');
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

  // ==================== CUSTOM PAY COMPONENTS ====================
  
  /**
   * Assign custom pay component to employee
   * @param {Object} assignmentData - Assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignment
   * @returns {Promise<Object>} Created custom pay component
   */
  async assignCustomComponent(assignmentData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.custom_pay_component 
      (organization_id, employee_id, pay_component_id, 
       custom_rate, custom_amount, effective_from, effective_to,
       is_active, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId,
        assignmentData.employeeId,
        assignmentData.payComponentId,
        assignmentData.customRate,
        assignmentData.customAmount,
        assignmentData.effectiveFrom,
        assignmentData.effectiveTo,
        assignmentData.isActive !== false,
        assignmentData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.custom_pay_component', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find custom pay components for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Custom pay components
   */
  async findCustomComponentsByEmployee(employeeId, organizationId, filters = {}) {
    let whereClause = `WHERE cpc.employee_id = $1 
                       AND cpc.organization_id = $2 
                       AND cpc.deleted_at IS NULL`;
    const params = [employeeId, organizationId];
    let paramCount = 2;
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND cpc.is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    if (filters.effectiveDate) {
      paramCount++;
      whereClause += ` AND cpc.effective_from <= $${paramCount}`;
      params.push(filters.effectiveDate);
      paramCount++;
      whereClause += ` AND (cpc.effective_to IS NULL OR cpc.effective_to >= $${paramCount})`;
      params.push(filters.effectiveDate);
    }
    
    const result = await this.query(
      `SELECT cpc.*, 
              pc.component_code,
              pc.component_name,
              pc.component_type,
              pc.calculation_type,
              pc.is_taxable,
              pc.is_recurring
       FROM payroll.custom_pay_component cpc
       INNER JOIN payroll.pay_component pc ON pc.id = cpc.pay_component_id
       ${whereClause}
       ORDER BY pc.component_type, pc.component_name`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.custom_pay_component' }
    );
    
    return result.rows;
  }

  /**
   * Update custom pay component
   * @param {string} customComponentId - Custom pay component UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated custom pay component
   */
  async updateCustomComponent(customComponentId, updates, organizationId, userId) {
    // Map camelCase (service layer) to snake_case (database)
    // Also support aliases for backwards compatibility with tests
    const fieldMapping = {
      'customRate': 'custom_rate',
      'customAmount': 'custom_amount',
      'defaultRate': 'custom_rate',      // Alias for customRate
      'defaultAmount': 'custom_amount',  // Alias for customAmount
      'effectiveFrom': 'effective_from',
      'effectiveTo': 'effective_to',
      'isActive': 'is_active',
      'notes': 'notes',
      'description': 'notes'             // Alias for notes
    };
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      const dbField = fieldMapping[key];
      if (dbField) {
        paramCount++;
        setClause.push(`${dbField} = $${paramCount}`);
        params.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(customComponentId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.custom_pay_component 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.custom_pay_component', userId }
    );
    
    if (!result.rows[0]) {
      throw new Error('Custom pay component not found');
    }
    
    return result.rows[0];
  }

  /**
   * Deactivate custom pay component
   * @param {string} customComponentId - Custom pay component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated custom pay component
   */
  async deactivateCustomComponent(customComponentId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.custom_pay_component 
       SET is_active = false,
           effective_to = NOW(),
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, customComponentId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.custom_pay_component', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find all active pay components for payroll run
   * Includes both standard components and custom employee-specific components
   * @param {string} organizationId - Organization UUID
   * @param {Date} effectiveDate - Date to check for active components
   * @returns {Promise<Array>} All applicable pay components
   */
  async findActivePayComponentsForPayroll(organizationId, effectiveDate) {
    const result = await this.query(
      `SELECT DISTINCT
        pc.id,
        pc.component_code,
        pc.component_name,
        pc.component_type,
        pc.category,
        pc.calculation_type,
        pc.default_rate,
        pc.default_amount,
        pc.is_taxable,
        pc.is_recurring,
        pc.is_pre_tax,
        pc.applies_to_gross
       FROM payroll.pay_component pc
       WHERE pc.organization_id = $1
         AND pc.status = 'active'
         AND pc.deleted_at IS NULL
       ORDER BY pc.component_type, pc.component_name`,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    return result.rows;
  }

  /**
   * Bulk create standard pay components (for organization setup)
   * @param {Array} components - Array of component objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the components
   * @returns {Promise<Array>} Created pay components
   */
  async bulkCreatePayComponents(components, organizationId, userId) {
    const results = [];
    
    for (const component of components) {
      const result = await this.createPayComponent(component, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Delete pay component (soft delete)
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deletePayComponent(componentId, organizationId, userId) {
    // Business rule: Check if component is assigned to active employees
    const employeeUsageCheck = await this.query(
      `SELECT COUNT(*) as usage_count
       FROM payroll.custom_pay_component
       WHERE pay_component_id = $1 
         AND organization_id = $2 
         AND is_active = true
         AND deleted_at IS NULL`,
      [componentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.custom_pay_component' }
    );
    
    if (parseInt(employeeUsageCheck.rows[0].usage_count) > 0) {
      throw new Error(
        'Cannot delete pay component. It is currently assigned to employees. ' +
        'Please remove employee assignments or deactivate the component instead.'
      );
    }

    // Business rule: Check if component was used in any payroll runs
    // This provides audit trail preservation - don't delete if used historically
    const payrollUsageCheck = await this.query(
      `SELECT COUNT(*) as usage_count
       FROM payroll.paycheck_earning
       WHERE pay_component_id = $1 
         AND organization_id = $2
       UNION ALL
       SELECT COUNT(*) as usage_count
       FROM payroll.paycheck_deduction
       WHERE pay_component_id = $1 
         AND organization_id = $2`,
      [componentId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck_earning' }
    );
    
    const totalUsage = payrollUsageCheck.rows.reduce(
      (sum, row) => sum + parseInt(row.usage_count), 
      0
    );
    
    if (totalUsage > 0) {
      throw new Error(
        'Cannot delete pay component. It has been used in payroll processing. ' +
        'Deleting it would compromise payroll history and audit trails. ' +
        'Consider deactivating it instead.'
      );
    }
    
    // Soft delete the component
    const result = await this.query(
      `UPDATE payroll.pay_component 
       SET deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, componentId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.pay_component', userId }
    );
    
    return result.rowCount > 0;
  }

  /**
   * Deactivate pay component (safer alternative to deletion)
   * Industry Standard: Deactivate instead of delete to preserve audit trail
   * @param {string} componentId - Pay component UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deactivation
   * @returns {Promise<Object>} Updated pay component
   */
  async deactivatePayComponent(componentId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.pay_component 
       SET status = 'inactive',
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, componentId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_component', userId }
    );
    
    if (!result.rows[0]) {
      throw new Error('Pay component not found');
    }
    
    return result.rows[0];
  }
}

export default PayComponentRepository;
