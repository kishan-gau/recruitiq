/**
 * Formula Template Controller
 * 
 * HTTP handlers for formula template management
 */

import formulaTemplateService from '../services/FormulaTemplateService.ts';
import { ValidationError } from '../../../middleware/errorHandler.ts';

/**
 * Get all templates with optional filtering
 * GET /api/paylinq/formula-templates?category=earnings&complexity=simple&search=bonus
 */
export const getTemplates = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const filters = {
      category: req.query.category,
      complexity_level: req.query.complexity,
      is_popular: req.query.popular === 'true' ? true : undefined,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      search: req.query.search
    };

    const templates = await formulaTemplateService.getTemplates(organizationId, filters);

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by ID
 * GET /api/paylinq/formula-templates/:id
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const template = await formulaTemplateService.getTemplateById(id, organizationId);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by code
 * GET /api/paylinq/formula-templates/code/:code
 */
export const getTemplateByCode = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { code } = req.params;

    const template = await formulaTemplateService.getTemplateByCode(code, organizationId);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create custom template
 * POST /api/paylinq/formula-templates
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user;
    const template = await formulaTemplateService.createTemplate(
      req.body,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update custom template
 * PUT /api/paylinq/formula-templates/:id
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;

    const template = await formulaTemplateService.updateTemplate(
      id,
      req.body,
      organizationId,
      userId
    );

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete custom template
 * DELETE /api/paylinq/formula-templates/:id
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;

    const result = await formulaTemplateService.deleteTemplate(id, organizationId, userId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply template with parameters
 * POST /api/paylinq/formula-templates/:id/apply
 */
export const applyTemplate = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { parameters } = req.body;

    if (!parameters || typeof parameters !== 'object') {
      throw new ValidationError('Parameters object is required');
    }

    const result = await formulaTemplateService.applyTemplate(id, parameters, organizationId);

    res.json({
      success: true,
      message: 'Template applied successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get popular templates
 * GET /api/paylinq/formula-templates/popular
 */
export const getPopularTemplates = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const limit = parseInt(req.query.limit) || 10;

    const templates = await formulaTemplateService.getPopularTemplates(organizationId, limit);

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommended templates by category
 * GET /api/paylinq/formula-templates/recommended/:category
 */
export const getRecommendedTemplates = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { category } = req.params;

    const templates = await formulaTemplateService.getRecommendedTemplates(category, organizationId);

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search templates by tags
 * POST /api/paylinq/formula-templates/search/tags
 */
export const searchByTags = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError('Tags array is required');
    }

    const templates = await formulaTemplateService.searchByTags(tags, organizationId);

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getTemplates,
  getTemplateById,
  getTemplateByCode,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  getPopularTemplates,
  getRecommendedTemplates,
  searchByTags
};
