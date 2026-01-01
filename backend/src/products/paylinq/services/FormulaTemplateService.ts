/**
 * Formula Template Service
 * 
 * Manages pre-built formula templates for common payroll calculations.
 * Supports global templates (available to all orgs) and org-specific custom templates.
 */

import { query as dbQuery } from '../../../config/database.js';
import formulaEngine from '../../../services/formula/FormulaEngine.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../middleware/errorHandler.js';

class FormulaTemplateService {
  /**
   * Constructor with dependency injection
   * @param {Object} formulaEngineInstance - Formula engine instance for testing
   */
  
  formulaEngine: any;

constructor(formulaEngineInstance = null) {
    this.formulaEngine = formulaEngineInstance || formulaEngine;
  }

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
    
    const result = await dbQuery(query, params, organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, organizationId) {
    const queryText = `
      SELECT *
      FROM payroll.formula_template
      WHERE id = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await dbQuery(queryText, [templateId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Template not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Get template by code
   */
  async getTemplateByCode(templateCode, organizationId) {
    const queryText = `
      SELECT *
      FROM payroll.formula_template
      WHERE template_code = $1 
        AND is_active = true
        AND (is_global = true OR organization_id = $2)
    `;
    
    const result = await dbQuery(queryText, [templateCode, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Template not found');
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
    // Replace parameter placeholders with dummy values for validation
    let formulaToValidate = formula_expression;
    for (const param of parameters) {
      const dummyValue = param.type === 'percentage' ? '50' : '100';
      formulaToValidate = formulaToValidate.replace(
        new RegExp(`\\{${param.name}\\}`, 'g'),
        dummyValue
      );
    }
    
    try {
      const validation = await this.formulaEngine.validate(formulaToValidate);
      if (!validation.valid) {
        throw new ValidationError(
          `Invalid formula: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }
    } catch (_error) {
      // Convert FormulaParseError to ValidationError for proper 400 status
      if (error.name === 'FormulaParseError' || error.message.includes('token') || error.message.includes('parse')) {
        throw new ValidationError(`Invalid formula syntax: ${error.message}`);
      }
      throw error;
    }

    // Check for duplicate template code
    const existing = await dbQuery(
      `SELECT id FROM payroll.formula_template 
       WHERE template_code = $1 AND organization_id = $2 AND is_active = true`,
      [template_code, organizationId],
      organizationId,
      {
        operation: 'SELECT',
        table: 'payroll.formula_template'
      }
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Template code already exists for this organization');
    }

    // Parse formula to get AST (use substituted version for parsing)
    let parsed;
    try {
      parsed = await this.formulaEngine.parse(formulaToValidate);
    } catch (_error) {
      // If validation passed but parsing failed, re-throw as ValidationError
      throw new ValidationError(`Formula parsing failed: ${error.message}`);
    }

    const query = `
      INSERT INTO payroll.formula_template (
        organization_id, template_code, template_name, category,
        description, formula_expression, formula_ast, parameters,
        example_values, example_calculation, tags, complexity_level,
        is_global, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, true, $13)
      RETURNING *
    `;

    const result = await dbQuery(query, [
      organizationId,
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      JSON.stringify(parsed),  // Fixed: parsed IS the AST, not parsed.ast
      JSON.stringify(parameters),
      JSON.stringify(example_values),
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
   * Update custom template (only org-specific, not global)
   */
  async updateTemplate(templateId, data, organizationId, userId) {
    // DEBUG: Log all inputs
    console.log('🔍 FormulaTemplateService.updateTemplate called with:');
    console.log('  templateId:', templateId);
    console.log('  organizationId:', organizationId);
    console.log('  userId:', userId);
    console.log('  data:', JSON.stringify(data, null, 2));

    try {
      // Verify template exists and belongs to org (not global)
      const existing = await dbQuery(
      `SELECT id, is_global, organization_id 
       FROM payroll.formula_template 
       WHERE id = $1 AND (organization_id = $2 OR is_global = true) AND is_active = true`,
      [templateId, organizationId],
      organizationId,
      {
        operation: 'SELECT',
        table: 'payroll.formula_template'
      }
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError('Template not found or access denied');
    }

    if (existing.rows[0].is_global) {
      throw new ForbiddenError('Cannot modify global templates');
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
          // Validate new formula - replace parameters with dummy values
          let formulaToValidate = data[field];
          const paramsList = data.parameters || existing.rows[0].parameters || [];
          for (const param of paramsList) {
            const dummyValue = param.type === 'percentage' ? '50' : '100';
            formulaToValidate = formulaToValidate.replace(
              new RegExp(`\\{${param.name}\\}`, 'g'),
              dummyValue
            );
          }
          
          try {
            const validation = await this.formulaEngine.validate(formulaToValidate);
            if (!validation.valid) {
              throw new ValidationError(`Invalid formula: ${validation.errors.map(e => e.message).join(', ')}`);
            }
          } catch (_error) {
            // Convert FormulaParseError to ValidationError
            if (error.name === 'FormulaParseError' || error.message.includes('token') || error.message.includes('parse')) {
              throw new ValidationError(`Invalid formula syntax: ${error.message}`);
            }
            throw error;
          }
          
          // Parse and store AST (with dummy values for parameters)
          let parsed;
          try {
            parsed = await this.formulaEngine.parse(formulaToValidate);
          } catch (_error) {
            throw new ValidationError(`Formula parsing failed: ${error.message}`);
          }
          updates.push(`formula_ast = $${paramIndex++}`);
          params.push(JSON.stringify(parsed));  // Fixed: parsed IS the AST
        }

        updates.push(`${field} = $${paramIndex++}`);
        
        // Special handling for different data types
        if (field === 'tags') {
          // tags is a text[] array - pass as-is, not JSON.stringify
          params.push(data[field]);
        } else {
          params.push(
            typeof data[field] === 'object' 
              ? JSON.stringify(data[field]) 
              : data[field]
          );
        }
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

    const result = await dbQuery(query, params, organizationId, {
      operation: 'UPDATE',
      table: 'payroll.formula_template',
      userId
    });
    console.log('✅ FormulaTemplateService.updateTemplate succeeded');
    return result.rows[0];
    } catch (_error) {
      console.error('❌ FormulaTemplateService.updateTemplate ERROR:');
      console.error('  Error type:', error.constructor.name);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Delete custom template (soft delete)
   */
  async deleteTemplate(templateId, organizationId, userId) {
    // Verify template exists and belongs to org (not global)
    const existing = await dbQuery(
      `SELECT id, is_global, organization_id 
       FROM payroll.formula_template 
       WHERE id = $1 AND (organization_id = $2 OR is_global = true) AND is_active = true`,
      [templateId, organizationId],
      organizationId,
      {
        operation: 'SELECT',
        table: 'payroll.formula_template'
      }
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError('Template not found or access denied');
    }

    if (existing.rows[0].is_global) {
      throw new ForbiddenError('Cannot delete global templates');
    }

    const query = `
      UPDATE payroll.formula_template
      SET is_active = false, deleted_at = NOW(), deleted_by = $1
      WHERE id = $2
      RETURNING id
    `;

    await dbQuery(query, [userId, templateId], organizationId, {
      operation: 'UPDATE',
      table: 'payroll.formula_template',
      userId
    });
    return { success: true, id: templateId };
  }

  /**
   * Apply template to create formula with parameter substitution
   */
  async applyTemplate(templateId, parameterValues, organizationId) {
    // DEBUG: Log all inputs
    console.log('🔍 FormulaTemplateService.applyTemplate called with:');
    console.log('  templateId:', templateId);
    console.log('  organizationId:', organizationId);
    console.log('  parameterValues:', JSON.stringify(parameterValues, null, 2));

    try {
      const template = await this.getTemplateById(templateId, organizationId);
    
    // Increment usage count
    await dbQuery(
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
    try {
      const validation = await this.formulaEngine.validate(formula);
      if (!validation.valid) {
        throw new ValidationError(
          `Generated formula is invalid: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }
    } catch (_error) {
      // Convert FormulaParseError to ValidationError
      if (error.name === 'FormulaParseError' || error.message.includes('token') || error.message.includes('parse')) {
        throw new ValidationError(`Invalid formula syntax in generated formula: ${error.message}`);
      }
      throw error;
    }

    console.log('✅ FormulaTemplateService.applyTemplate succeeded');
    return {
      formula,
      template_id: templateId,
      template_code: template.template_code,
      template_name: template.template_name,
      parameters: parameterValues
      };
    } catch (_error) {
      throw error;
    }
  }  /**
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
    
    const result = await dbQuery(query, [organizationId, limit], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }

  /**
   * Get recommended templates for a category
   */
  async getRecommendedTemplates(category, organizationId) {
    const query = `
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
    
    const result = await dbQuery(query, [category, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
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
    
    const result = await dbQuery(query, [organizationId, tags], organizationId, {
      operation: 'SELECT',
      table: 'payroll.formula_template'
    });
    return result.rows;
  }
}

export default FormulaTemplateService;
