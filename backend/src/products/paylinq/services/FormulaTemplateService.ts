/**
 * Formula Template Service
 * 
 * Manages pre-built formula templates for common payroll calculations.
 * Supports global templates (available to all orgs) and org-specific custom templates.
 */

import FormulaTemplateRepository from '../repositories/FormulaTemplateRepository.js';
import formulaEngine from '../../../services/formula/FormulaEngine.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../middleware/errorHandler.js';

class FormulaTemplateService {
  /**
   * Constructor with dependency injection
   * @param {Object} repository - Formula template repository instance for testing
   * @param {Object} formulaEngineInstance - Formula engine instance for testing
   */
  
  repository: any;
  formulaEngine: any;

constructor(repository = null, formulaEngineInstance = null) {
    this.repository = repository || new FormulaTemplateRepository();
    this.formulaEngine = formulaEngineInstance || formulaEngine;
  }

  /**
   * Get all available templates (global + organization-specific)
   */
  async getTemplates(organizationId, filters = {}) {
    return await this.repository.findAll(organizationId, filters);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, organizationId) {
    const template = await this.repository.findById(templateId, organizationId);
    
    if (!template) {
      throw new NotFoundError('Template not found or access denied');
    }
    
    return template;
  }

  /**
   * Get template by code
   */
  async getTemplateByCode(templateCode, organizationId) {
    const template = await this.repository.findByCode(templateCode, organizationId);
    
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    
    return template;
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
    const exists = await this.repository.existsByCode(template_code, organizationId);

    if (exists) {
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

    const result = await this.repository.create({
      template_code,
      template_name,
      category,
      description,
      formula_expression,
      formula_ast: JSON.stringify(parsed),  // Fixed: parsed IS the AST, not parsed.ast
      parameters: JSON.stringify(parameters),
      example_values: JSON.stringify(example_values),
      example_calculation,
      tags,
      complexity_level
    }, organizationId, userId);

    return result;
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
      const existing = await this.repository.findById(templateId, organizationId);

    if (!existing) {
      throw new NotFoundError('Template not found or access denied');
    }

    if (existing.is_global) {
      throw new ForbiddenError('Cannot modify global templates');
    }

    const updates = {};

    // Build dynamic update object
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
          const paramsList = data.parameters || existing.parameters || [];
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
          updates['formula_ast'] = JSON.stringify(parsed);  // Fixed: parsed IS the AST
        }

        // Special handling for different data types
        if (field === 'tags') {
          // tags is a text[] array - pass as-is
          updates[field] = data[field];
        } else {
          updates[field] = typeof data[field] === 'object' 
            ? JSON.stringify(data[field]) 
            : data[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const result = await this.repository.update(templateId, updates, organizationId, userId);
    console.log('✅ FormulaTemplateService.updateTemplate succeeded');
    return result;
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
    const existing = await this.repository.findById(templateId, organizationId);

    if (!existing) {
      throw new NotFoundError('Template not found or access denied');
    }

    if (existing.is_global) {
      throw new ForbiddenError('Cannot delete global templates');
    }

    await this.repository.delete(templateId, organizationId, userId);
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
    await this.repository.incrementUsageCount(templateId, organizationId);

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
    return await this.repository.findPopular(organizationId, limit);
  }

  /**
   * Get recommended templates for a category
   */
  async getRecommendedTemplates(category, organizationId) {
    return await this.repository.findRecommendedByCategory(category, organizationId);
  }

  /**
   * Search templates by tags
   */
  async searchByTags(tags, organizationId) {
    return await this.repository.findByTags(tags, organizationId);
  }
}

export default FormulaTemplateService;
