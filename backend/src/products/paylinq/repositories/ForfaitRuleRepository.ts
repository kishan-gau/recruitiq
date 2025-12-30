/**
 * Forfait Rule Repository
 * Handles data access for forfait rules
 */

import { query } from '../../../config/database.ts';

class ForfaitRuleRepository {
  /**
   * Find all forfait rules for an organization
   */
  async findAll(organizationId, filters = {}) {
    let sql = `
      SELECT 
        fr.*,
        sc.component_name as source_component_name,
        sc.component_code as source_component_code,
        fc.component_name as forfait_component_name,
        fc.component_code as forfait_component_code
      FROM forfait_rules fr
      LEFT JOIN pay_components sc ON fr.source_component_id = sc.id
      LEFT JOIN pay_components fc ON fr.forfait_component_id = fc.id
      WHERE fr.organization_id = $1
        AND fr.deleted_at IS NULL
    `;
    
    const params = [organizationId];
    let paramCount = 1;

    // Filter by active status
    if (filters.isActive !== undefined) {
      paramCount++;
      sql += ` AND fr.is_active = $${paramCount}`;
      params.push(filters.isActive);
    }

    // Filter by source component
    if (filters.sourceComponentId) {
      paramCount++;
      sql += ` AND fr.source_component_id = $${paramCount}`;
      params.push(filters.sourceComponentId);
    }

    // Filter by forfait component
    if (filters.forfaitComponentId) {
      paramCount++;
      sql += ` AND fr.forfait_component_id = $${paramCount}`;
      params.push(filters.forfaitComponentId);
    }

    // Filter by effective date
    if (filters.effectiveDate) {
      paramCount++;
      sql += ` AND fr.effective_from <= $${paramCount}`;
      params.push(filters.effectiveDate);
      
      paramCount++;
      sql += ` AND (fr.effective_to IS NULL OR fr.effective_to >= $${paramCount})`;
      params.push(filters.effectiveDate);
    }

    sql += ` ORDER BY fr.created_at DESC`;

    const result = await query(sql, params, organizationId, {
      operation: 'SELECT',
      table: 'forfait_rules'
    });

    return result.rows;
  }

  /**
   * Find forfait rule by ID
   */
  async findById(id, organizationId) {
    const sql = `
      SELECT 
        fr.*,
        sc.component_name as source_component_name,
        sc.component_code as source_component_code,
        fc.component_name as forfait_component_name,
        fc.component_code as forfait_component_code
      FROM forfait_rules fr
      LEFT JOIN pay_components sc ON fr.source_component_id = sc.id
      LEFT JOIN pay_components fc ON fr.forfait_component_id = fc.id
      WHERE fr.id = $1
        AND fr.organization_id = $2
        AND fr.deleted_at IS NULL
    `;

    const result = await query(sql, [id, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'forfait_rules'
    });

    return result.rows[0] || null;
  }

  /**
   * Find active forfait rules for a source component on a specific date
   */
  async findActiveRulesBySourceComponent(sourceComponentId, effectiveDate, organizationId) {
    const sql = `
      SELECT 
        fr.*,
        fc.component_name as forfait_component_name,
        fc.component_code as forfait_component_code,
        fc.component_type as forfait_component_type
      FROM forfait_rules fr
      LEFT JOIN pay_components fc ON fr.forfait_component_id = fc.id
      WHERE fr.source_component_id = $1
        AND fr.organization_id = $2
        AND fr.is_active = true
        AND fr.effective_from <= $3
        AND (fr.effective_to IS NULL OR fr.effective_to >= $3)
        AND fr.deleted_at IS NULL
      ORDER BY fr.effective_from DESC
    `;

    const result = await query(
      sql, 
      [sourceComponentId, organizationId, effectiveDate], 
      organizationId,
      { operation: 'SELECT', table: 'forfait_rules' }
    );

    return result.rows;
  }

  /**
   * Create a new forfait rule
   */
  async create(ruleData, organizationId, userId) {
    const sql = `
      INSERT INTO forfait_rules (
        organization_id, rule_name, description,
        source_component_id, forfait_component_id,
        percentage_rate, apply_on_gross,
        min_amount, max_amount, catalog_value,
        effective_from, effective_to, is_active,
        metadata, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      RETURNING *
    `;

    const params = [
      organizationId,
      ruleData.rule_name,
      ruleData.description,
      ruleData.source_component_id,
      ruleData.forfait_component_id,
      ruleData.percentage_rate,
      ruleData.apply_on_gross,
      ruleData.min_amount,
      ruleData.max_amount,
      ruleData.catalog_value,
      ruleData.effective_from,
      ruleData.effective_to,
      ruleData.is_active,
      ruleData.metadata,
      userId
    ];

    const result = await query(sql, params, organizationId, {
      operation: 'INSERT',
      table: 'forfait_rules'
    });

    return result.rows[0];
  }

  /**
   * Update a forfait rule
   */
  async update(id, updates, organizationId, userId) {
    const fields = [];
    const values = [id, organizationId];
    let paramCount = 2;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update updated_by and updated_at
    paramCount++;
    fields.push(`updated_by = $${paramCount}`);
    values.push(userId);
    
    fields.push(`updated_at = NOW()`);

    const sql = `
      UPDATE forfait_rules
      SET ${fields.join(', ')}
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(sql, values, organizationId, {
      operation: 'UPDATE',
      table: 'forfait_rules'
    });

    return result.rows[0];
  }

  /**
   * Soft delete a forfait rule
   */
  async softDelete(id, organizationId, userId) {
    const sql = `
      UPDATE forfait_rules
      SET 
        deleted_at = NOW(),
        deleted_by = $1,
        is_active = false
      WHERE id = $2
        AND organization_id = $3
        AND deleted_at IS NULL
    `;

    await query(sql, [userId, id, organizationId], organizationId, {
      operation: 'DELETE',
      table: 'forfait_rules'
    });
  }

  /**
   * Check if a forfait rule exists
   */
  async exists(sourceComponentId, forfaitComponentId, effectiveFrom, organizationId) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM forfait_rules
        WHERE source_component_id = $1
          AND forfait_component_id = $2
          AND effective_from = $3
          AND organization_id = $4
          AND deleted_at IS NULL
      ) as exists
    `;

    const result = await query(
      sql,
      [sourceComponentId, forfaitComponentId, effectiveFrom, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'forfait_rules' }
    );

    return result.rows[0].exists;
  }
}

export default ForfaitRuleRepository;
