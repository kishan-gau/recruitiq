/**
 * Forfait Rule Controller
 * 
 * HTTP handlers for forfait rule management endpoints.
 * Allows users to configure forfait rules on benefit components.
 * 
 * @module products/paylinq/controllers/forfaitRuleController
 */

import ForfaitRuleService from '../services/ForfaitRuleService.js';
import logger from '../../../utils/logger.js';

const service = new ForfaitRuleService();

/**
 * Set forfait rule on a component
 * PUT /api/products/paylinq/components/:componentCode/forfait-rule
 */
export async function setForfaitRule(req, res, next) {
  try {
    const { componentCode } = req.params;
    const { organizationId, id: userId } = req.user;
    
    const result = await service.setForfaitRule(
      componentCode,
      req.body,
      organizationId,
      userId
    );
    
    return res.status(200).json({
      success: true,
      forfaitRule: result
    });
  } catch (_error) {
    logger.error('Error setting forfait rule', {
      error: error.message,
      componentCode: req.params.componentCode,
      userId: req.user?.id
    });
    next(error);
  }
}

/**
 * Get forfait rule for a component
 * GET /api/products/paylinq/components/:componentCode/forfait-rule
 */
export async function getForfaitRule(req, res, next) {
  try {
    const { componentCode } = req.params;
    const { organizationId } = req.user;
    
    const forfaitRule = await service.getForfaitRule(componentCode, organizationId);
    
    return res.status(200).json({
      success: true,
      forfaitRule: forfaitRule || { enabled: false }
    });
  } catch (_error) {
    logger.error('Error getting forfait rule', {
      error: error.message,
      componentCode: req.params.componentCode
    });
    next(error);
  }
}

/**
 * Remove forfait rule from a component
 * DELETE /api/products/paylinq/components/:componentCode/forfait-rule
 */
export async function removeForfaitRule(req, res, next) {
  try {
    const { componentCode } = req.params;
    const { organizationId, id: userId } = req.user;
    
    await service.removeForfaitRule(componentCode, organizationId, userId);
    
    return res.status(200).json({
      success: true,
      message: 'Forfait rule removed successfully'
    });
  } catch (_error) {
    logger.error('Error removing forfait rule', {
      error: error.message,
      componentCode: req.params.componentCode
    });
    next(error);
  }
}

/**
 * Get predefined forfait rule templates
 * GET /api/products/paylinq/forfait-rules/templates
 */
export async function getForfaitRuleTemplates(req, res, next) {
  try {
    const templates = service.getPredefinedForfaitRules();
    
    return res.status(200).json({
      success: true,
      templates
    });
  } catch (_error) {
    logger.error('Error getting forfait rule templates', {
      error: error.message
    });
    next(error);
  }
}

/**
 * Preview forfait calculation for given configuration
 * POST /api/products/paylinq/forfait-rules/preview
 */
export async function previewForfaitCalculation(req, res, next) {
  try {
    const { componentCode, configuration } = req.body;
    const { organizationId } = req.user;
    
    // Get forfait rule
    const forfaitRule = await service.getForfaitRule(componentCode, organizationId);
    
    if (!forfaitRule) {
      return res.status(404).json({
        success: false,
        error: 'No forfait rule configured for this component',
        errorCode: 'FORFAIT_RULE_NOT_FOUND'
      });
    }
    
    // Map values
    const mappedValues = service.mapValues(configuration, forfaitRule.valueMapping);
    
    return res.status(200).json({
      success: true,
      preview: {
        forfaitComponentCode: forfaitRule.forfaitComponentCode,
        mappedConfiguration: mappedValues,
        description: forfaitRule.description
      }
    });
  } catch (_error) {
    logger.error('Error previewing forfait calculation', {
      error: error.message,
      body: req.body
    });
    next(error);
  }
}
