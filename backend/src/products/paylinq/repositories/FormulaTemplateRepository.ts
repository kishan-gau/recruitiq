/**
 * Formula Template Repository
 * 
 * Handles data access for formula templates in the payroll system.
 * Manages both global templates and organization-specific custom templates.
 * 
 * @module products/paylinq/repositories/FormulaTemplateRepository
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class FormulaTemplateRepository {
  
  query: any;

  constructor(database = null) {
    this.query = database?.query || query;
  }

  /**
   * Find all templates available to an organization (global + org-specific)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (category, complexity_level, is_popular, tags, search)
   * @returns {Promise<Array>} Formula templates
   */
  async findAll(organizationId, filters = {}) {
    const { category, complexity_level, is_popular, tags, search } = filters;
    
    let queryText = `
      SELECT 
        id, organization_id, template_code, template_name, category,
        description, formula_expression, parameters, example_values,
        example_calculation, usage_count, is_popular, is_recommended,
        tags, complexity_level, is_global, created_at
      FROM payroll.formula_template
      WHERE is_active = true
        AND (is_global = true OR organization_id = $1)
    `;
    
    const params = [organizationId];
    let paramIndex = 2;
    
    // Apply filters
    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (complexity_level) {
      queryText += ` AND complexity_level = $${paramIndex}`;
      params.push(complexity_level);
      paramIndex++;
    }
    
    if (is_popular !== undefined) {
      queryText += ` AND is_popular = $${paramIndex}`;
      params.push(is_popular);
      paramIndex++;
    }
    
    if (tags && tags.length > 0) {
      queryText += ` AND tags && $${paramIndex}::text[]`;
      params.push(tags);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND (
        template_name ILIKE $${paramIndex} 
        OR description ILIKE $${paramIndex}
        OR template_code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    queryText += ` ORDER BY is_popular DESC, usage_count DESC, template_name ASC`;
    
    const result = await this.query(queryText, params, organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }

  /**
   * Find template by ID
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Formula template or null
   */
  async findById(templateId, organizationId) {
    const queryText = `
      SELECT *
      FROM payroll.formula_template
      WHERE id = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await this.query(queryText, [templateId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find template by code
   * @param {string} templateCode - Template code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Formula template or null
   */
  async findByCode(templateCode, organizationId) {
    const queryText = `
      SELECT *
      FROM payroll.formula_template
      WHERE template_code = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await this.query(queryText, [templateCode, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if template code exists for organization
   * @param {string} templateCode - Template code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if exists
   */
  async existsByCode(templateCode, organizationId) {
    const result = await this.query(
      `SELECT id FROM payroll.formula_template 
       WHERE template_code = $1 AND organization_id = $2 AND is_active = true`,
      [templateCode, organizationId],
      organizationId,
      {
        operation: 'SELECT',
        table: 'payroll.formula_template'
      }
    );

    return result.rows.length > 0;
  }

  /**
   * Create new template
   * @param {Object} templateData - Template data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Created template
   */
  async create(templateData, organizationId, userId) {
    const {
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      formula_ast,
      parameters,
      example_values,
      example_calculation,
      tags,
      complexity_level
    } = templateData;

    const queryText = `
      INSERT INTO payroll.formula_template (
        organization_id, template_code, template_name, category,
        description, formula_expression, formula_ast, parameters,
        example_values, example_calculation, tags, complexity_level,
        is_global, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, true, $13)
      RETURNING *
    `;

    const result = await this.query(queryText, [
      organizationId,
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      formula_ast,
      parameters,
      example_values,
      example_calculation,
      tags,
      complexity_level,
      userId
    ], organizationId, {
      operation: 'INSERT',
      table: 'payroll.formula_template'
    });

    return result.rows[0];
  }

  /**
   * Update template
   * @param {string} templateId - Template UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Updated template
   */
  async update(templateId, updates, organizationId, userId) {
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    // Build dynamic update query
    const allowedFields = [
      'template_name', 'description', 'formula_expression', 'formula_ast',
      'parameters', 'example_values', 'example_calculation',
      'tags', 'complexity_level'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        params.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return null;
    }

    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramIndex++}`);
    params.push(userId);

    params.push(templateId);
    const queryText = `
      UPDATE payroll.formula_template
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(queryText, params, organizationId, {
      operation: 'UPDATE',
      table: 'payroll.formula_template',
      userId
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Soft delete template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(templateId, organizationId, userId) {
    const queryText = `
      UPDATE payroll.formula_template
      SET is_active = false, deleted_at = NOW(), deleted_by = $1
      WHERE id = $2
      RETURNING id
    `;

    const result = await this.query(queryText, [userId, templateId], organizationId, {
      operation: 'UPDATE',
      table: 'payroll.formula_template',
      userId
    });

    return result.rows.length > 0;
  }

  /**
   * Increment usage count
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async incrementUsageCount(templateId, organizationId) {
    await this.query(
      `UPDATE payroll.formula_template 
       SET usage_count = usage_count + 1 
       WHERE id = $1`,
      [templateId],
      organizationId,
      {
        operation: 'UPDATE',
        table: 'payroll.formula_template'
      }
    );
  }

  /**
   * Find popular templates
   * @param {string} organizationId - Organization UUID
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Popular templates
   */
  async findPopular(organizationId, limit = 10) {
    const queryText = `
      SELECT 
        id, template_code, template_name, category, description,
        usage_count, complexity_level, tags
      FROM payroll.formula_template
      WHERE is_active = true
        AND (is_global = true OR organization_id = $1)
        AND is_popular = true
      ORDER BY usage_count DESC, template_name ASC
      LIMIT $2
    `;
    
    const result = await this.query(queryText, [organizationId, limit], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }

  /**
   * Find recommended templates for a category
   * @param {string} category - Category name
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Recommended templates
   */
  async findRecommendedByCategory(category, organizationId) {
    const queryText = `
      SELECT 
        id, template_code, template_name, category, description,
        formula_expression, parameters, example_calculation,
        complexity_level, tags, is_recommended
      FROM payroll.formula_template
      WHERE is_active = true
        AND category = $1
        AND (is_global = true OR organization_id = $2)
        AND is_recommended = true
      ORDER BY usage_count DESC, template_name ASC
    `;
    
    const result = await this.query(queryText, [category, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }

  /**
   * Search templates by tags
   * @param {Array<string>} tags - Tags to search for
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Templates matching tags
   */
  async findByTags(tags, organizationId) {
    const queryText = `
      SELECT 
        id, template_code, template_name, category, description,
        tags, complexity_level
      FROM payroll.formula_template
      WHERE is_active = true
        AND (is_global = true OR organization_id = $1)
        AND tags && $2::text[]
      ORDER BY 
        CASE WHEN is_popular THEN 0 ELSE 1 END,
        usage_count DESC
    `;
    
    const result = await this.query(queryText, [organizationId, tags], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }
}

export default FormulaTemplateRepository;
