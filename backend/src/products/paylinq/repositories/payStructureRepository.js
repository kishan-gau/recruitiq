/**
 * Pay Structure Repository
 * 
 * Data access layer for pay structure template management, versioning,
 * worker assignments, and component overrides.
 * 
 * @module products/paylinq/repositories/payStructureRepository
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import dtoMapper from '../utils/dtoMapper.js';
import { mapPayStructureTemplateDbToApi, mapWorkerPayStructureDbToApi } from '../utils/dtoMapper.js';

class PayStructureRepository {
  constructor(database = null) {
    this.query = database?.query || query;
  }

  
  // ==================== PAY STRUCTURE TEMPLATES ====================
  
  /**
   * Create a new pay structure template
   */
  async createTemplate(templateData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.pay_structure_template 
      (organization_id, template_code, template_name, description,
       version_major, version_minor, version_patch, status,
       applicable_to_worker_types, applicable_to_jurisdictions,
       pay_frequency, currency, is_organization_default,
       effective_from, effective_to, tags, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *, version_string`,
      [
        organizationId,
        templateData.templateCode,
        templateData.templateName,
        templateData.description,
        templateData.versionMajor || 1,
        templateData.versionMinor || 0,
        templateData.versionPatch || 0,
        templateData.status || 'draft',
        templateData.applicableToWorkerTypes || null,
        templateData.applicableToJurisdictions || null,
        templateData.payFrequency,
        templateData.currency || 'SRD',
        templateData.isOrganizationDefault || false,
        templateData.effectiveFrom,
        templateData.effectiveTo,
        templateData.tags || null,
        templateData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.pay_structure_template', userId }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Find template by ID
   */
  async findTemplateById(templateId, organizationId) {
    const result = await this.query(
      `SELECT pst.*,
              (SELECT COUNT(*) FROM payroll.pay_structure_component psc 
               WHERE psc.template_id = pst.id 
               AND psc.deleted_at IS NULL) as component_count,
              (SELECT COUNT(*) FROM payroll.worker_pay_structure wps 
               WHERE wps.template_version_id = pst.id 
               AND wps.is_current = true 
               AND wps.deleted_at IS NULL) as assigned_worker_count,
              COALESCE(e.first_name || ' ' || e.last_name, u.email) as created_by_name
       FROM payroll.pay_structure_template pst
       LEFT JOIN hris.user_account u ON u.id = pst.created_by
       LEFT JOIN hris.employee e ON e.user_account_id = u.id
       WHERE pst.id = $1 AND pst.organization_id = $2 AND pst.deleted_at IS NULL`,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template' }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Find templates by organization with filters
   */
  async findTemplates(organizationId, filters = {}) {
    let whereClause = 'WHERE pst.organization_id = $1 AND pst.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND pst.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.templateCode) {
      paramCount++;
      whereClause += ` AND pst.template_code = $${paramCount}`;
      params.push(filters.templateCode);
    }
    
    if (filters.isOrganizationDefault !== undefined) {
      paramCount++;
      whereClause += ` AND pst.is_organization_default = $${paramCount}`;
      params.push(filters.isOrganizationDefault);
    }
    
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (pst.template_name ILIKE $${paramCount} OR pst.template_code ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }
    
    const sortField = filters.sortField || 'created_at';
    const sortOrder = filters.sortOrder || 'DESC';
    
    const result = await this.query(
      `SELECT pst.*,
              (SELECT COUNT(*) FROM payroll.pay_structure_component psc 
               WHERE psc.template_id = pst.id 
               AND psc.deleted_at IS NULL) as component_count,
              (SELECT COUNT(*) FROM payroll.worker_pay_structure wps 
               WHERE wps.template_version_id = pst.id 
               AND wps.is_current = true 
               AND wps.deleted_at IS NULL) as assigned_worker_count
       FROM payroll.pay_structure_template pst
       ${whereClause}
       ORDER BY pst.${sortField} ${sortOrder}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template' }
    );
    
    return result.rows.map(row => mapPayStructureTemplateDbToApi(row));
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates, organizationId, userId) {
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const allowedFields = [
      'templateName', 'description', 'status', 'applicableToWorkerTypes',
      'applicableToJurisdictions', 'payFrequency', 'currency',
      'isOrganizationDefault', 'effectiveFrom', 'effectiveTo', 'tags', 'notes'
    ];
    
    const fieldMap = {
      templateName: 'template_name',
      applicableToWorkerTypes: 'applicable_to_worker_types',
      applicableToJurisdictions: 'applicable_to_jurisdictions',
      payFrequency: 'pay_frequency',
      isOrganizationDefault: 'is_organization_default',
      effectiveFrom: 'effective_from',
      effectiveTo: 'effective_to'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        const dbField = fieldMap[key] || key.toLowerCase();
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    values.push(userId);
    fields.push(`updated_by = $${paramCount}`);
    fields.push(`updated_at = NOW()`);
    
    paramCount++;
    values.push(templateId);
    paramCount++;
    values.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.pay_structure_template
       SET ${fields.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *, version_string`,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Publish template (make it active)
   */
  async publishTemplate(templateId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.pay_structure_template
       SET status = 'active',
           published_at = NOW(),
           published_by = $3,
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *, version_string`,
      [templateId, organizationId, userId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Deprecate template
   */
  async deprecateTemplate(templateId, reason, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.pay_structure_template
       SET status = 'deprecated',
           deprecated_at = NOW(),
           deprecated_by = $4,
           deprecation_reason = $3,
           updated_at = NOW(),
           updated_by = $4
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *, version_string`,
      [templateId, organizationId, reason, userId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Delete pay structure template (draft versions only - soft delete)
   */
  async deleteTemplate(templateId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.pay_structure_template
       SET deleted_at = NOW(),
           deleted_by = $3,
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $1 AND organization_id = $2 AND status = 'draft' AND deleted_at IS NULL
       RETURNING *, version_string`,
      [templateId, organizationId, userId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId }
    );
    
    if (result.rows.length === 0) {
      throw new Error('Template not found or not eligible for deletion');
    }
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  /**
   * Get organization default template
   */
  async getOrganizationDefault(organizationId, asOfDate = null) {
    const dateParam = asOfDate || new Date().toISOString().split('T')[0];
    
    const result = await this.query(
      `SELECT * FROM payroll.get_organization_default_template($1, $2)`,
      [organizationId, dateParam],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template' }
    );
    
    return mapPayStructureTemplateDbToApi(result.rows[0]);
  }

  // ==================== PAY STRUCTURE COMPONENTS ====================
  
  /**
   * Add component to template
   */
  async addComponent(componentData, templateId, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.pay_structure_component
      (template_id, pay_component_id, component_code, component_name, component_category,
       calculation_type, default_amount, default_currency, percentage_of, percentage_rate,
       formula_expression, formula_variables, formula_ast, rate_multiplier, applies_to_hours_type,
       tier_configuration, tier_basis, sequence_order, depends_on_components, is_mandatory,
       is_taxable, affects_gross_pay, affects_net_pay, tax_category, accounting_code,
       min_amount, max_amount, min_percentage, max_percentage, max_annual, max_per_period,
       allow_worker_override, override_allowed_fields, requires_approval,
       display_on_payslip, display_name, display_order, display_category,
       conditions, is_conditional, description, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
              $39, $40, $41, $42, $43)
      RETURNING *`,
      [
        templateId,
        componentData.payComponentId || null,
        componentData.componentCode,
        componentData.componentName,
        componentData.componentCategory,
        componentData.calculationType,
        componentData.fixedAmount || componentData.defaultAmount,
        componentData.defaultCurrency,
        componentData.percentageBase || componentData.percentageOf,
        componentData.percentageValue || componentData.percentageRate,
        componentData.formula || componentData.formulaExpression,
        componentData.formulaVariables && componentData.formulaVariables.length > 0 ? (Array.isArray(componentData.formulaVariables) ? componentData.formulaVariables : componentData.formulaVariables) : null,
        componentData.formulaAst ? (typeof componentData.formulaAst === 'string' ? componentData.formulaAst : JSON.stringify(componentData.formulaAst)) : null,
        componentData.hourlyRate || componentData.rateMultiplier,
        componentData.appliesToHoursType,
        componentData.tieredRates ? (typeof componentData.tieredRates === 'string' ? componentData.tieredRates : JSON.stringify(componentData.tieredRates)) : (componentData.tierConfiguration ? (typeof componentData.tierConfiguration === 'string' ? componentData.tierConfiguration : JSON.stringify(componentData.tierConfiguration)) : null),
        componentData.tierBasis,
        componentData.sequenceOrder,
        componentData.dependsOnComponents && componentData.dependsOnComponents.length > 0 ? (Array.isArray(componentData.dependsOnComponents) ? componentData.dependsOnComponents : componentData.dependsOnComponents) : null,
        componentData.isMandatory || false,
        componentData.isTaxable !== undefined ? componentData.isTaxable : true,
        componentData.affectsGrossPay !== undefined ? componentData.affectsGrossPay : true,
        componentData.affectsNetPay !== undefined ? componentData.affectsNetPay : true,
        componentData.taxCategory,
        componentData.accountingCode,
        componentData.minAmount,
        componentData.maxAmount,
        componentData.minPercentage,
        componentData.maxPercentage,
        componentData.maxAnnual,
        componentData.maxPerPeriod,
        componentData.allowWorkerOverride || false,
        componentData.overrideAllowedFields && componentData.overrideAllowedFields.length > 0 ? (Array.isArray(componentData.overrideAllowedFields) ? componentData.overrideAllowedFields : componentData.overrideAllowedFields) : null,
        componentData.requiresApproval || false,
        componentData.isVisible !== undefined ? componentData.isVisible : (componentData.displayOnPayslip !== undefined ? componentData.displayOnPayslip : true),
        componentData.displayName,
        componentData.displayOrder,
        componentData.displayCategory,
        componentData.conditions ? (typeof componentData.conditions === 'string' ? componentData.conditions : JSON.stringify(componentData.conditions)) : null,
        componentData.isConditional || false,
        componentData.description,
        componentData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.pay_structure_component', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get components for a template
   */
  async getTemplateComponents(templateId, organizationId) {
    const result = await this.query(
      `SELECT psc.*,
              pc.component_name as pay_component_name,
              pc.component_type as pay_component_type
       FROM payroll.pay_structure_component psc
       INNER JOIN payroll.pay_structure_template pst ON pst.id = psc.template_id
       LEFT JOIN payroll.pay_component pc ON pc.id = psc.pay_component_id
       WHERE psc.template_id = $1 
       AND pst.organization_id = $2
       AND psc.deleted_at IS NULL
       ORDER BY psc.sequence_order ASC`,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_component' }
    );
    
    return result.rows;
  }

  /**
   * Update component
   */
  async updateComponent(componentId, updates, organizationId, userId) {
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    // Map camelCase to snake_case
    const fieldMap = {
      componentCode: 'component_code',
      componentName: 'component_name',
      componentCategory: 'component_category',
      calculationType: 'calculation_type',
      defaultAmount: 'default_amount',
      defaultCurrency: 'default_currency',
      percentageOf: 'percentage_of',
      percentageRate: 'percentage_rate',
      formulaExpression: 'formula_expression',
      formulaVariables: 'formula_variables',
      formulaAst: 'formula_ast',
      rateMultiplier: 'rate_multiplier',
      appliesToHoursType: 'applies_to_hours_type',
      tierConfiguration: 'tier_configuration',
      tierBasis: 'tier_basis',
      sequenceOrder: 'sequence_order',
      dependsOnComponents: 'depends_on_components',
      isMandatory: 'is_mandatory',
      isTaxable: 'is_taxable',
      affectsGrossPay: 'affects_gross_pay',
      affectsNetPay: 'affects_net_pay',
      taxCategory: 'tax_category',
      accountingCode: 'accounting_code',
      minAmount: 'min_amount',
      maxAmount: 'max_amount',
      minPercentage: 'min_percentage',
      maxPercentage: 'max_percentage',
      maxAnnual: 'max_annual',
      maxPerPeriod: 'max_per_period',
      allowWorkerOverride: 'allow_worker_override',
      overrideAllowedFields: 'override_allowed_fields',
      requiresApproval: 'requires_approval',
      displayOnPayslip: 'display_on_payslip',
      displayName: 'display_name',
      displayOrder: 'display_order',
      displayCategory: 'display_category',
      isConditional: 'is_conditional',
      conditions: 'conditions',
      description: 'description',
      notes: 'notes',
      metadata: 'metadata'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key] || key;
      paramCount++;
      
      // Handle JSON fields
      if (['formulaVariables', 'formulaAst', 'tierConfiguration', 'conditions', 'metadata'].includes(key)) {
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value ? JSON.stringify(value) : null);
      } else {
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    values.push(userId);
    fields.push(`updated_by = $${paramCount}`);
    fields.push(`updated_at = NOW()`);
    
    paramCount++;
    values.push(componentId);
    
    const result = await this.query(
      `UPDATE payroll.pay_structure_component
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.pay_structure_component', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete component
   */
  async deleteComponent(componentId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.pay_structure_component
       SET deleted_at = NOW(), deleted_by = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [componentId, userId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.pay_structure_component', userId }
    );
    
    return result.rows[0];
  }

  // ==================== WORKER PAY STRUCTURE ASSIGNMENTS ====================
  
  /**
   * Assign template to worker
   */
  async assignTemplateToWorker(assignmentData, organizationId, userId) {
    // Log the assignment data for debugging
    const logger = (await import('../../../utils/logger.js')).default;
    logger.info('INSERT worker_pay_structure values', {
      employeeId: assignmentData.employeeId,
      templateVersionId: assignmentData.templateVersionId,
      effectiveFrom: assignmentData.effectiveFrom,
      effectiveTo: assignmentData.effectiveTo,
      isCurrent: assignmentData.isCurrent
    });
    
    const result = await this.query(
      `INSERT INTO payroll.worker_pay_structure
      (organization_id, employee_id, template_version_id, base_salary,
       assignment_type, assignment_source, assigned_by, assignment_reason,
       effective_from, effective_to, is_current,
       pay_frequency, currency, approval_status, tags, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        organizationId,
        assignmentData.employeeId,
        assignmentData.templateVersionId,
        assignmentData.baseSalary || null,
        assignmentData.assignmentType || 'custom',
        assignmentData.assignmentSource,
        userId,
        assignmentData.assignmentReason,
        assignmentData.effectiveFrom,
        assignmentData.effectiveTo,
        assignmentData.isCurrent !== undefined ? assignmentData.isCurrent : true,
        assignmentData.payFrequency,
        assignmentData.currency,
        assignmentData.approvalStatus || 'approved',
        assignmentData.tags || null,
        assignmentData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_pay_structure', userId }
    );
    
    return dtoMapper.mapWorkerPayStructureDbToApi(result.rows[0]);
  }

  /**
   * Get overlapping worker pay structures for a date range
   * Used to find conflicts before assigning a new structure
   */
  async getOverlappingWorkerStructures(employeeId, organizationId, effectiveFrom, effectiveTo = null) {
    const logger = (await import('../../../utils/logger.js')).default;
    
    // Build the date range condition to check for overlaps
    // Two ranges overlap if: start1 <= end2 AND start2 <= end1
    // For open-ended ranges (effectiveTo IS NULL), treat as '9999-12-31'
    const effectiveToValue = effectiveTo || '9999-12-31';
    
    const result = await this.query(
      `SELECT wps.*
       FROM payroll.worker_pay_structure wps
       WHERE wps.employee_id = $1 
         AND wps.organization_id = $2
         AND wps.deleted_at IS NULL
         AND (
           -- Check if date ranges overlap
           wps.effective_from <= $4::DATE 
           AND COALESCE(wps.effective_to, '9999-12-31'::DATE) >= $3::DATE
         )`,
      [employeeId, organizationId, effectiveFrom, effectiveToValue],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_pay_structure' }
    );
    
    logger.info('Found overlapping structures', {
      employeeId,
      count: result.rows.length,
      effectiveFrom,
      effectiveTo: effectiveToValue
    });
    
    return result.rows.map(row => dtoMapper.mapWorkerPayStructureDbToApi(row));
  }

  /**
   * Get current worker pay structure
   * Returns the most recent structure for the worker with full template details via JOIN
   * ARCHITECTURE: Reference-based - template is resolved at runtime, not from snapshot
   */
  async getCurrentWorkerStructure(employeeId, organizationId, asOfDate = null) {
    const dateCondition = asOfDate 
      ? `AND wps.effective_from <= $3 AND (wps.effective_to IS NULL OR wps.effective_to > $3)`
      : '';
    
    const params = asOfDate 
      ? [employeeId, organizationId, asOfDate]
      : [employeeId, organizationId];
    
    const result = await this.query(
      `SELECT wps.*,
              pst.template_name,
              pst.template_code,
              pst.description,
              pst.status as template_status,
              pst.version_major,
              pst.version_minor,
              pst.version_patch,
              pst.version_string,
              pst.pay_frequency as template_pay_frequency,
              pst.currency as template_currency,
              jsonb_build_object(
                'id', pst.id,
                'templateName', pst.template_name,
                'templateCode', pst.template_code,
                'description', pst.description,
                'status', pst.status,
                'version', pst.version_string,
                'payFrequency', pst.pay_frequency,
                'currency', pst.currency
              ) as template,
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', psc.id,
                  'componentCode', psc.component_code,
                  'componentName', psc.component_name,
                  'componentCategory', psc.component_category,
                  'calculationType', psc.calculation_type,
                  'sequenceOrder', psc.sequence_order,
                  'allowWorkerOverride', psc.allow_worker_override,
                  'overrideAllowedFields', psc.override_allowed_fields,
                  'isMandatory', psc.is_mandatory,
                  'isTaxable', psc.is_taxable,
                  'configuration', jsonb_build_object(
                    'defaultAmount', psc.default_amount,
                    'percentageRate', psc.percentage_rate,
                    'percentageOf', psc.percentage_of,
                    'rateMultiplier', psc.rate_multiplier,
                    'formulaExpression', psc.formula_expression,
                    'formulaVariables', psc.formula_variables
                  )
                ) ORDER BY psc.sequence_order
              )
              FROM payroll.pay_structure_component psc
              WHERE psc.template_id = pst.id AND psc.deleted_at IS NULL
              ) as components
       FROM payroll.worker_pay_structure wps
       JOIN payroll.pay_structure_template pst ON pst.id = wps.template_version_id
       WHERE wps.employee_id = $1 
         AND wps.organization_id = $2
         AND wps.deleted_at IS NULL
         ${dateCondition}
       ORDER BY wps.effective_from DESC, wps.created_at DESC
       LIMIT 1`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_pay_structure' }
    );
    
    if (!result.rows[0]) {
      return null;
    }
    
    logger.debug('Raw DB result before DTO mapping:', { data: result.rows[0] });
    const mapped = mapWorkerPayStructureDbToApi(result.rows[0]);
    logger.debug('After DTO mapping:', { mapped });
    
    return mapped;
  }

  /**
   * Get worker pay structure history
   */
  async getWorkerStructureHistory(employeeId, organizationId) {
    const result = await this.query(
      `SELECT wps.*,
              pst.template_name,
              COUNT(DISTINCT wpco.id) as override_count
       FROM payroll.worker_pay_structure wps
       INNER JOIN payroll.pay_structure_template pst ON pst.id = wps.template_version_id
       LEFT JOIN payroll.worker_pay_structure_component_override wpco 
         ON wpco.worker_structure_id = wps.id AND wpco.deleted_at IS NULL
       WHERE wps.employee_id = $1 AND wps.organization_id = $2 AND wps.deleted_at IS NULL
       GROUP BY wps.id, pst.template_name
       ORDER BY wps.effective_from DESC`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_pay_structure' }
    );
    
    return result.rows;
  }

  /**
   * Update worker pay structure
   */
  async updateWorkerStructure(structureId, updates, organizationId, userId) {
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const fieldMap = {
      effectiveTo: 'effective_to',
      isCurrent: 'is_current',
      baseSalary: 'base_salary',
      hourlyRate: 'hourly_rate',
      payFrequency: 'pay_frequency',
      approvalStatus: 'approval_status',
      approvedBy: 'approved_by',
      approvedAt: 'approved_at'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key] || key;
      paramCount++;
      fields.push(`${dbField} = $${paramCount}`);
      values.push(value);
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    values.push(userId);
    fields.push(`updated_by = $${paramCount}`);
    fields.push(`updated_at = NOW()`);
    
    paramCount++;
    values.push(structureId);
    paramCount++;
    values.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.worker_pay_structure
       SET ${fields.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_pay_structure', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete worker pay structure (soft delete)
   */
  async deleteWorkerStructure(structureId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.worker_pay_structure
       SET deleted_at = NOW(), deleted_by = $2
       WHERE id = $1 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [structureId, userId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_pay_structure', userId }
    );
    
    return result.rows[0];
  }

  // ==================== WORKER COMPONENT OVERRIDES ====================
  
  /**
   * Add component override for worker
   */
  async addComponentOverride(overrideData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.worker_pay_structure_component_override
      (worker_structure_id, component_code, override_type,
       override_amount, override_percentage, override_formula, override_formula_variables,
       override_rate, is_disabled, custom_component_definition, override_conditions,
       override_min_amount, override_max_amount, override_max_annual,
       override_reason, business_justification, requires_approval, approval_status,
       effective_from, effective_to, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        overrideData.workerStructureId,
        overrideData.componentCode,
        overrideData.overrideType,
        overrideData.overrideAmount,
        overrideData.overridePercentage,
        overrideData.overrideFormula,
        overrideData.overrideFormulaVariables ? JSON.stringify(overrideData.overrideFormulaVariables) : null,
        overrideData.overrideRate,
        overrideData.isDisabled || false,
        overrideData.customComponentDefinition ? JSON.stringify(overrideData.customComponentDefinition) : null,
        overrideData.overrideConditions ? JSON.stringify(overrideData.overrideConditions) : null,
        overrideData.overrideMinAmount,
        overrideData.overrideMaxAmount,
        overrideData.overrideMaxAnnual,
        overrideData.overrideReason,
        overrideData.businessJustification,
        overrideData.requiresApproval || false,
        overrideData.approvalStatus || 'approved',
        overrideData.effectiveFrom,
        overrideData.effectiveTo,
        overrideData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_pay_structure_component_override', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get worker component overrides
   */
  async getWorkerOverrides(workerStructureId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.worker_pay_structure_component_override
       WHERE worker_structure_id = $1 AND deleted_at IS NULL
       ORDER BY component_code`,
      [workerStructureId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_pay_structure_component_override' }
    );
    
    // Map snake_case to camelCase
    return result.rows.map(row => ({
      id: row.id,
      workerStructureId: row.worker_structure_id,
      componentCode: row.component_code,
      overrideType: row.override_type,
      overrideAmount: row.override_amount ? parseFloat(row.override_amount) : null,
      overridePercentage: row.override_percentage ? parseFloat(row.override_percentage) : null,
      overrideRate: row.override_rate ? parseFloat(row.override_rate) : null,
      overrideFormula: row.override_formula,
      overrideFormulaVariables: row.override_formula_variables,
      overrideMinAmount: row.override_min_amount ? parseFloat(row.override_min_amount) : null,
      overrideMaxAmount: row.override_max_amount ? parseFloat(row.override_max_amount) : null,
      overrideMaxAnnual: row.override_max_annual ? parseFloat(row.override_max_annual) : null,
      overrideConditions: row.override_conditions,
      customComponentDefinition: row.custom_component_definition,
      isDisabled: row.is_disabled,
      overrideReason: row.override_reason,
      businessJustification: row.business_justification,
      requiresApproval: row.requires_approval,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      notes: row.notes,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by
    }));
  }

  /**
   * Update component override
   */
  async updateComponentOverride(overrideId, updates, organizationId, userId) {
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const fieldMap = {
      overrideAmount: 'override_amount',
      overridePercentage: 'override_percentage',
      overrideFormula: 'override_formula',
      overrideFormulaVariables: 'override_formula_variables',
      overrideRate: 'override_rate',
      isDisabled: 'is_disabled',
      overrideReason: 'override_reason',
      businessJustification: 'business_justification',
      approvalStatus: 'approval_status',
      approvedBy: 'approved_by',
      approvedAt: 'approved_at',
      effectiveFrom: 'effective_from',
      effectiveTo: 'effective_to'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key] || key;
      paramCount++;
      
      if (['overrideFormulaVariables', 'customComponentDefinition', 'overrideConditions'].includes(key)) {
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value ? JSON.stringify(value) : null);
      } else {
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    values.push(userId);
    fields.push(`updated_by = $${paramCount}`);
    fields.push(`updated_at = NOW()`);
    
    paramCount++;
    values.push(overrideId);
    
    const result = await this.query(
      `UPDATE payroll.worker_pay_structure_component_override
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_pay_structure_component_override', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete component override
   */
  async deleteComponentOverride(overrideId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.worker_pay_structure_component_override
       SET deleted_at = NOW(), deleted_by = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [overrideId, userId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.worker_pay_structure_component_override', userId }
    );
    
    return result.rows[0];
  }

  // ==================== TEMPLATE CHANGELOG ====================
  
  /**
   * Add changelog entry
   */
  async addChangelogEntry(changelogData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.pay_structure_template_changelog
      (template_id, from_version, to_version, change_type, change_summary,
       changes_detail, breaking_changes, breaking_changes_description,
       affected_worker_count, requires_worker_migration, migration_instructions,
       auto_migrate, changelog_entries, changed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        changelogData.templateId,
        changelogData.fromVersion,
        changelogData.toVersion,
        changelogData.changeType,
        changelogData.changeSummary,
        changelogData.changesDetail ? JSON.stringify(changelogData.changesDetail) : null,
        changelogData.breakingChanges || false,
        changelogData.breakingChangesDescription,
        changelogData.affectedWorkerCount || 0,
        changelogData.requiresWorkerMigration || false,
        changelogData.migrationInstructions,
        changelogData.autoMigrate || false,
        changelogData.changelogEntries ? JSON.stringify(changelogData.changelogEntries) : null,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.pay_structure_template_changelog', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get template changelog
   */
  async getTemplateChangelog(templateId, organizationId) {
    const result = await this.query(
      `SELECT ptc.*, u.first_name, u.last_name
       FROM payroll.pay_structure_template_changelog ptc
       LEFT JOIN users u ON u.id = ptc.changed_by
       WHERE ptc.template_id = $1
       ORDER BY ptc.changed_at DESC`,
      [templateId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template_changelog' }
    );
    
    return result.rows;
  }

  // ==================== VERSIONING ====================

  /**
   * Get all versions of a template by code
   */
  async getTemplateVersions(templateCode, organizationId) {
    const result = await this.query(
      `SELECT pst.*,
              (SELECT COUNT(*) FROM payroll.pay_structure_component psc 
               WHERE psc.template_id = pst.id 
               AND psc.deleted_at IS NULL) as component_count,
              (SELECT COUNT(*) FROM payroll.worker_pay_structure wps 
               WHERE wps.template_version_id = pst.id 
               AND wps.deleted_at IS NULL
               AND wps.effective_to IS NULL) as assigned_worker_count,
              COALESCE(e.first_name || ' ' || e.last_name, u.email) as created_by_name
       FROM payroll.pay_structure_template pst
       LEFT JOIN hris.user_account u ON u.id = pst.created_by
       LEFT JOIN hris.employee e ON e.user_account_id = u.id
       WHERE pst.template_code = $1
       AND pst.organization_id = $2
       AND pst.deleted_at IS NULL
       ORDER BY pst.version_major DESC, pst.version_minor DESC, pst.version_patch DESC`,
      [templateCode, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template' }
    );
    
    return result.rows.map(row => mapPayStructureTemplateDbToApi(row));
  }

  /**
   * Update worker pay structure end date (for version upgrades)
   */
  async updateWorkerPayStructureEndDate(workerStructureId, endDate, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.worker_pay_structure
       SET effective_to = $1, updated_at = NOW(), updated_by = $2
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [endDate, userId, workerStructureId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_pay_structure', userId }
    );
    
    return result.rows[0];
  }
}

export default PayStructureRepository;
