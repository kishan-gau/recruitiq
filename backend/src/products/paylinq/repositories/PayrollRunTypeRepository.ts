/**
 * Payroll Run Type Repository
 * Data access layer for payroll run type operations
 * 
 * CRITICAL: MULTI-TENANT SECURITY
 * - All queries MUST filter by organization_id
 * - Each tenant has completely isolated run type data
 * - No shared run types between organizations
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class PayrollRunTypeRepository {
  
  query: any;

constructor(database = null) {
    this.query = database?.query || query;
  }

  /**
   * Find run type by code within an organization
   * @param {string} typeCode - Run type code (e.g., 'VAKANTIEGELD', 'BONUS')
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Object|null>} Run type or null
   */
  async findByCode(typeCode, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      prt.id,
      prt.organization_id,
      prt.type_code,
      prt.type_name,
      prt.description,
      prt.default_template_id,
      prt.component_override_mode,
      prt.allowed_components,
      prt.excluded_components,
      prt.is_system_default,
      prt.is_active,
      prt.display_order,
      prt.icon,
      prt.color,
      prt.created_at,
      prt.updated_at,
      prt.deleted_at,
      prt.created_by,
      prt.updated_by,
      pst.template_name,
      pst.template_code
    FROM payroll.payroll_run_type prt
    LEFT JOIN payroll.pay_structure_template pst 
      ON prt.default_template_id = pst.id
    WHERE prt.organization_id = $1
      AND prt.type_code = $2
      AND prt.deleted_at IS NULL
    LIMIT 1
  `;

  const result = await this.query(
    text,
    [organizationId, typeCode],
    organizationId,
    { operation: 'SELECT', table: 'payroll.payroll_run_type', method: 'findByCode' }
  );

  if (result.rows.length === 0) {
    logger.debug('Run type not found', { typeCode, organizationId });
    return null;
  }

    return result.rows[0];
  }

  /**
   * Find run type by ID within an organization
   * @param {string} id - Run type UUID
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @returns {Promise<Object|null>} Run type or null
   */
  async findById(id, organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      prt.id,
      prt.organization_id,
      prt.type_code,
      prt.type_name,
      prt.description,
      prt.default_template_id,
      prt.component_override_mode,
      prt.allowed_components,
      prt.excluded_components,
      prt.is_system_default,
      prt.is_active,
      prt.display_order,
      prt.icon,
      prt.color,
      prt.created_at,
      prt.updated_at,
      prt.deleted_at,
      prt.created_by,
      prt.updated_by,
      pst.template_name,
      pst.template_code
    FROM payroll.payroll_run_type prt
    LEFT JOIN payroll.pay_structure_template pst 
      ON prt.default_template_id = pst.id
    WHERE prt.id = $1
      AND prt.organization_id = $2
      AND prt.deleted_at IS NULL
    LIMIT 1
  `;

  const result = await this.query(
    text,
    [id, organizationId],
    organizationId,
    { operation: 'SELECT', table: 'payroll.payroll_run_type', method: 'findById' }
  );

  if (result.rows.length === 0) {
    logger.debug('Run type not found', { id, organizationId });
    return null;
  }

    return result.rows[0];
  }

  /**
   * List all active run types for an organization
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @param {boolean} includeInactive - Include inactive run types (default: false)
   * @returns {Promise<Array>} Array of run types
   */
  async findAll(organizationId, includeInactive = false) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT 
      prt.id,
      prt.organization_id,
      prt.type_code,
      prt.type_name,
      prt.description,
      prt.default_template_id,
      prt.component_override_mode,
      prt.allowed_components,
      prt.excluded_components,
      prt.is_system_default,
      prt.is_active,
      prt.display_order,
      prt.icon,
      prt.color,
      prt.created_at,
      prt.updated_at,
      prt.created_by,
      prt.updated_by,
      pst.template_name,
      pst.template_code
    FROM payroll.payroll_run_type prt
    LEFT JOIN payroll.pay_structure_template pst 
      ON prt.default_template_id = pst.id
    WHERE prt.organization_id = $1
      AND prt.deleted_at IS NULL
      ${!includeInactive ? 'AND prt.is_active = true' : ''}
    ORDER BY prt.display_order ASC, prt.type_name ASC
  `;

  const result = await this.query(
    text,
    [organizationId],
    organizationId,
    { operation: 'SELECT', table: 'payroll.payroll_run_type', method: 'findAll' }
  );

  logger.debug('Run types retrieved', { 
    count: result.rows.length, 
    organizationId,
    includeInactive 
  });

    return result.rows;
  }

  /**
   * Create a new run type
   * @param {Object} data - Run type data
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @param {string} userId - User UUID creating the run type
   * @returns {Promise<Object>} Created run type
   */
  async create(data, organizationId, userId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    INSERT INTO payroll.payroll_run_type 
      (organization_id, type_code, type_name, description,
       default_template_id, component_override_mode, 
       allowed_components, excluded_components,
       is_system_default, is_active, display_order, icon, color,
       created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING 
      id,
      organization_id,
      type_code,
      type_name,
      description,
      default_template_id,
      component_override_mode,
      allowed_components,
      excluded_components,
      is_system_default,
      is_active,
      display_order,
      icon,
      color,
      created_at,
      created_by
  `;

  const result = await this.query(
    text,
    [
      organizationId,
      data.type_code,
      data.type_name,
      data.description || null,
      data.default_template_id || null,
      data.component_override_mode || 'explicit',
      data.allowed_components ? JSON.stringify(data.allowed_components) : null,
      data.excluded_components ? JSON.stringify(data.excluded_components) : null,
      false, // is_system_default - custom run types are never system defaults
      data.is_active !== undefined ? data.is_active : true,
      data.display_order || 999,
      data.icon || null,
      data.color || null,
      userId
    ],
    organizationId,
    { operation: 'INSERT', table: 'payroll.payroll_run_type', userId, method: 'create' }
  );

  logger.info('Run type created', {
    id: result.rows[0].id,
    typeCode: result.rows[0].type_code,
    organizationId,
    userId
  });

    return result.rows[0];
  }

  /**
   * Update a run type
   * @param {string} id - Run type UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @param {string} userId - User UUID updating the run type
   * @returns {Promise<Object|null>} Updated run type or null
   */
  async update(id, data, organizationId, userId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  // Build dynamic UPDATE query
  const fields = [];
  const values = [];
  let paramCount = 0;

  if (data.type_name !== undefined) {
    paramCount++;
    fields.push(`type_name = $${paramCount}`);
    values.push(data.type_name);
  }

  if (data.description !== undefined) {
    paramCount++;
    fields.push(`description = $${paramCount}`);
    values.push(data.description);
  }

  if (data.default_template_id !== undefined) {
    paramCount++;
    fields.push(`default_template_id = $${paramCount}`);
    values.push(data.default_template_id);
  }

  if (data.component_override_mode !== undefined) {
    paramCount++;
    fields.push(`component_override_mode = $${paramCount}`);
    values.push(data.component_override_mode);
  }

  if (data.allowed_components !== undefined) {
    paramCount++;
    fields.push(`allowed_components = $${paramCount}`);
    values.push(JSON.stringify(data.allowed_components));
  }

  if (data.excluded_components !== undefined) {
    paramCount++;
    fields.push(`excluded_components = $${paramCount}`);
    values.push(JSON.stringify(data.excluded_components));
  }

  if (data.is_active !== undefined) {
    paramCount++;
    fields.push(`is_active = $${paramCount}`);
    values.push(data.is_active);
  }

  if (data.display_order !== undefined) {
    paramCount++;
    fields.push(`display_order = $${paramCount}`);
    values.push(data.display_order);
  }

  if (data.icon !== undefined) {
    paramCount++;
    fields.push(`icon = $${paramCount}`);
    values.push(data.icon);
  }

  if (data.color !== undefined) {
    paramCount++;
    fields.push(`color = $${paramCount}`);
    values.push(data.color);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  // Add updated metadata
  paramCount++;
  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${paramCount}`);
  values.push(userId);

  // Add WHERE clause params
  paramCount++;
  values.push(id);
  const idParam = paramCount;

  paramCount++;
  values.push(organizationId);
  const orgParam = paramCount;

  const text = `
    UPDATE payroll.payroll_run_type
    SET ${fields.join(', ')}
    WHERE id = $${idParam}
      AND organization_id = $${orgParam}
      AND deleted_at IS NULL
    RETURNING 
      id,
      organization_id,
      type_code,
      type_name,
      description,
      default_template_id,
      component_override_mode,
      allowed_components,
      excluded_components,
      is_system_default,
      is_active,
      display_order,
      icon,
      color,
      created_at,
      updated_at,
      created_by,
      updated_by
  `;

  const result = await this.query(
    text,
    values,
    organizationId,
    { operation: 'UPDATE', table: 'payroll.payroll_run_type', userId, method: 'update' }
  );

  if (result.rows.length === 0) {
    logger.warn('Run type not found for update', { id, organizationId });
    return null;
  }

  logger.info('Run type updated', {
    id: result.rows[0].id,
    typeCode: result.rows[0].type_code,
    organizationId,
    userId
  });

    return result.rows[0];
  }

  /**
   * Soft delete a run type
   * @param {string} id - Run type UUID
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @param {string} userId - User UUID deleting the run type
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async softDelete(id, organizationId, userId) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    UPDATE payroll.payroll_run_type
    SET 
      deleted_at = NOW(),
      deleted_by = $1,
      is_active = false
    WHERE id = $2
      AND organization_id = $3
      AND deleted_at IS NULL
      AND is_system_default = false
  `;

  const result = await this.query(
    text,
    [userId, id, organizationId],
    organizationId,
    { operation: 'DELETE', table: 'payroll.payroll_run_type', userId, method: 'softDelete' }
  );

  if (result.rowCount === 0) {
    logger.warn('Run type not found for deletion or is system default', { 
      id, 
      organizationId 
    });
    return false;
  }

  logger.info('Run type soft deleted', {
    id,
    organizationId,
    userId
  });

    return true;
  }

  /**
   * Check if type code already exists for organization
   * @param {string} typeCode - Run type code
   * @param {string} organizationId - Organization UUID (REQUIRED for tenant isolation)
   * @param {string} excludeId - Optional ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async typeCodeExists(typeCode, organizationId, excludeId = null) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant isolation');
  }

  const text = `
    SELECT id
    FROM payroll.payroll_run_type
    WHERE organization_id = $1
      AND type_code = $2
      AND deleted_at IS NULL
      ${excludeId ? 'AND id != $3' : ''}
    LIMIT 1
  `;

  const params = excludeId 
    ? [organizationId, typeCode, excludeId]
    : [organizationId, typeCode];

  const result = await this.query(
    text,
    params,
    organizationId,
    { operation: 'SELECT', table: 'payroll.payroll_run_type', method: 'typeCodeExists' }
  );

  return result.rows.length > 0;
  }
}

export default PayrollRunTypeRepository;

