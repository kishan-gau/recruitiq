/**
 * Formula Template Service
 * 
 * Manages pre-built formula templates for common payroll calculations.
 * Supports global templates (available to all orgs) and org-specific custom templates.
 */

import pool from '../../../config/database.js';
import formulaEngine from '../../../services/formula/FormulaEngine.js';
import { ValidationError } from '../../../middleware/errorHandler.js';

class FormulaTemplateService {
  /**
   * Get all available templates (global + organization-specific)
   */
  async getTemplates(organizationId, filters = {}) {
    const { category, complexity_level, is_popular, tags, search } = filters;
    
    let query = `
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
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (complexity_level) {
      query += ` AND complexity_level = $${paramIndex}`;
      params.push(complexity_level);
      paramIndex++;
    }
    
    if (is_popular !== undefined) {
      query += ` AND is_popular = $${paramIndex}`;
      params.push(is_popular);
      paramIndex++;
    }
    
    if (tags && tags.length > 0) {
      query += ` AND tags && $${paramIndex}::text[]`;
      params.push(tags);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (
        template_name ILIKE $${paramIndex} 
        OR description ILIKE $${paramIndex}
        OR template_code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY is_popular DESC, usage_count DESC, template_name ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, organizationId) {
    const query = `
      SELECT *
      FROM payroll.formula_template
      WHERE id = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await pool.query(query, [templateId, organizationId]);
    
    if (result.rows.length === 0) {
      throw new ValidationError('Template not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Get template by code
   */
  async getTemplateByCode(templateCode, organizationId) {
    const query = `
      SELECT *
      FROM payroll.formula_template
      WHERE template_code = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await pool.query(query, [templateCode, organizationId]);
    
    if (result.rows.length === 0) {
      throw new ValidationError('Template not found');
    }
    
    return result.rows[0];
  }

  /**
   * Create custom template for organization
   */
  async createTemplate(data, organizationId, userId) {
    const {
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      parameters = [],
      example_values = {},
      example_calculation,
      tags = [],
      complexity_level = 'simple'
    } = data;

    // Validate required fields
    if (!template_code || !template_name || !category || !formula_expression) {
      throw new ValidationError('Missing required fields');
    }

    // Validate formula expression
    const validation = await formulaEngine.validate(formula_expression);
    if (!validation.isValid) {
      throw new ValidationError(
        `Invalid formula: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Check for duplicate template code
    const existing = await pool.query(
      `SELECT id FROM payroll.formula_template 
       WHERE template_code = $1 AND organization_id = $2 AND is_active = true`,
      [template_code, organizationId]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Template code already exists for this organization');
    }

    // Parse formula to get AST
    const parsed = await formulaEngine.parse(formula_expression);

    const query = `
      INSERT INTO payroll.formula_template (
        organization_id, template_code, template_name, category,
        description, formula_expression, formula_ast, parameters,
        example_values, example_calculation, tags, complexity_level,
        is_global, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, true, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      organizationId,
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      JSON.stringify(parsed.ast),
      JSON.stringify(parameters),
      JSON.stringify(example_values),
      example_calculation,
      tags,
      complexity_level,
      userId
    ]);

    return result.rows[0];
  }

  /**
   * Update custom template (only org-specific, not global)
   */
  async updateTemplate(templateId, data, organizationId, userId) {
    // Verify template exists and belongs to org (not global)
    const existing = await pool.query(
      `SELECT id, is_global 
       FROM payroll.formula_template 
       WHERE id = $1 AND organization_id = $2 AND is_active = true`,
      [templateId, organizationId]
    );

    if (existing.rows.length === 0) {
      throw new ValidationError('Template not found or access denied');
    }

    if (existing.rows[0].is_global) {
      throw new ValidationError('Cannot modify global templates');
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    // Build dynamic update query
    const allowedFields = [
      'template_name', 'description', 'formula_expression', 
      'parameters', 'example_values', 'example_calculation',
      'tags', 'complexity_level'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'formula_expression') {
          // Validate new formula
          const validation = await formulaEngine.validate(data[field]);
          if (!validation.isValid) {
            throw new ValidationError(`Invalid formula: ${validation.errors.map(e => e.message).join(', ')}`);
          }
          
          // Parse and store AST
          const parsed = await formulaEngine.parse(data[field]);
          updates.push(`formula_ast = $${paramIndex++}`);
          params.push(JSON.stringify(parsed.ast));
        }

        updates.push(`${field} = $${paramIndex++}`);
        params.push(
          typeof data[field] === 'object' 
            ? JSON.stringify(data[field]) 
            : data[field]
        );
      }
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);

    params.push(templateId);
    const query = `
      UPDATE payroll.formula_template
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete custom template (soft delete)
   */
  async deleteTemplate(templateId, organizationId, userId) {
    // Verify template exists and belongs to org (not global)
    const existing = await pool.query(
      `SELECT id, is_global 
       FROM payroll.formula_template 
       WHERE id = $1 AND organization_id = $2 AND is_active = true`,
      [templateId, organizationId]
    );

    if (existing.rows.length === 0) {
      throw new ValidationError('Template not found or access denied');
    }

    if (existing.rows[0].is_global) {
      throw new ValidationError('Cannot delete global templates');
    }

    const query = `
      UPDATE payroll.formula_template
      SET is_active = false, deleted_at = NOW(), deleted_by = $1
      WHERE id = $2
      RETURNING id
    `;

    await pool.query(query, [userId, templateId]);
    return { success: true, id: templateId };
  }

  /**
   * Apply template to create formula with parameter substitution
   */
  async applyTemplate(templateId, parameterValues, organizationId) {
    const template = await this.getTemplateById(templateId, organizationId);
    
    // Increment usage count
    await pool.query(
      `UPDATE payroll.formula_template 
       SET usage_count = usage_count + 1 
       WHERE id = $1`,
      [templateId]
    );

    // Substitute parameters in formula expression
    let formula = template.formula_expression;
    const parameters = template.parameters || [];

    // Validate all required parameters provided
    for (const param of parameters) {
      if (parameterValues[param.name] === undefined) {
        throw new ValidationError(`Missing required parameter: ${param.name}`);
      }

      // Validate parameter value
      const value = parameterValues[param.name];
      if (param.type === 'percentage') {
        if (value < (param.min || 0) || value > (param.max || 100)) {
          throw new ValidationError(
            `Parameter ${param.name} must be between ${param.min || 0} and ${param.max || 100}`
          );
        }
      } else if (param.type === 'fixed' && param.min !== undefined) {
        if (value < param.min) {
          throw new ValidationError(
            `Parameter ${param.name} must be at least ${param.min}`
          );
        }
      }

      // Replace placeholder with actual value
      formula = formula.replace(
        new RegExp(`\\{${param.name}\\}`, 'g'),
        value.toString()
      );
    }

    // Validate resulting formula
    const validation = await formulaEngine.validate(formula);
    if (!validation.isValid) {
      throw new ValidationError(
        `Generated formula is invalid: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    return {
      formula,
      template_code: template.template_code,
      template_name: template.template_name,
      parameters: parameterValues
    };
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(organizationId, limit = 10) {
    const query = `
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
    
    const result = await pool.query(query, [organizationId, limit]);
    return result.rows;
  }

  /**
   * Get recommended templates for a category
   */
  async getRecommendedTemplates(category, organizationId) {
    const query = `
      SELECT 
        id, template_code, template_name, description,
        formula_expression, parameters, example_calculation,
        complexity_level, tags
      FROM payroll.formula_template
      WHERE is_active = true
        AND category = $1
        AND (is_global = true OR organization_id = $2)
        AND is_recommended = true
      ORDER BY usage_count DESC, template_name ASC
    `;
    
    const result = await pool.query(query, [category, organizationId]);
    return result.rows;
  }

  /**
   * Search templates by tags
   */
  async searchByTags(tags, organizationId) {
    const query = `
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
    
    const result = await pool.query(query, [organizationId, tags]);
    return result.rows;
  }
}

export default new FormulaTemplateService();
