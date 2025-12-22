/**
 * Paylinq Tax Rate Controller
 * Handles HTTP requests for tax calculation and rate management
 */

import taxCalculationService from '../services/taxCalculationService.js';
import { mapApiToDb } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Create a tax rule
 * POST /api/paylinq/tax-rules
 */
async function createTaxRule(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const ruleData = mapApiToDb(req.body);

    const taxRule = await taxCalculationService.createTaxRuleSet(ruleData, organizationId, userId);

    logger.info('Tax rule created', {
      organizationId,
      taxRuleId: taxRule.id,
      taxType: taxRule.taxType,
      userId,
    });

    res.status(201).json({
      success: true,
      taxRule: taxRule,
      message: 'Tax rule created successfully',
    });
  } catch (error) {
    logger.error('Error creating tax rule', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get all tax rules
 * GET /api/paylinq/tax-rules
 */
async function getTaxRules(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { taxType, jurisdiction, includeInactive } = req.query;

    const filters = {
      taxType,
      jurisdiction,
      includeInactive: includeInactive === 'true',
    };

    const taxRules = await taxCalculationService.getTaxRuleSets(organizationId, filters);

    res.status(200).json({
      success: true,
      taxRules: taxRules,
      count: taxRules.length,
    });
  } catch (error) {
    logger.error('Error fetching tax rules', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch tax rules',
    });
  }
}

/**
 * Get a single tax rule by ID
 * GET /api/paylinq/tax-rules/:id
 */
async function getTaxRuleById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const taxRule = await taxCalculationService.getTaxRuleSetById(id, organizationId);

    if (!taxRule) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tax rule not found',
      });
    }

    res.status(200).json({
      success: true,
      taxRule: taxRule,
    });
  } catch (error) {
    logger.error('Error fetching tax rule', {
      error: error.message,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch tax rule',
    });
  }
}

/**
 * Update a tax rule
 * PUT /api/paylinq/tax-rules/:id
 */
async function updateTaxRule(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const taxRule = await taxCalculationService.updateTaxRuleSet(id, organizationId, updateData);

    if (!taxRule) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tax rule not found',
      });
    }

    logger.info('Tax rule updated', {
      organizationId,
      taxRuleId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      taxRule: taxRule,
      message: 'Tax rule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating tax rule', {
      error: error.message,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Delete a tax rule
 * DELETE /api/paylinq/tax-rules/:id
 */
async function deleteTaxRule(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await taxCalculationService.deleteTaxRuleSet(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tax rule not found',
      });
    }

    logger.info('Tax rule deleted', {
      organizationId,
      taxRuleId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Tax rule deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting tax rule', {
      error: error.message,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete tax rule',
    });
  }
}

/**
 * Create a tax bracket
 * POST /api/paylinq/tax-rules/:taxRuleId/brackets
 */
async function createTaxBracket(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { taxRuleId } = req.params;

    const bracketData = {
      ...req.body,
      taxRuleId,
      createdBy: userId,
    };

    const bracket = await taxCalculationService.createTaxBracket(bracketData, organizationId);

    logger.info('Tax bracket created', {
      organizationId,
      taxRuleId,
      bracketId: bracket.id,
      userId,
    });

    res.status(201).json({
      success: true,
      bracket: bracket,
      message: 'Tax bracket created successfully',
    });
  } catch (error) {
    logger.error('Error creating tax bracket', {
      error: error.message,
      taxRuleId: req.params.taxRuleId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get tax brackets for a tax rule
 * GET /api/paylinq/tax-rules/:taxRuleId/brackets
 */
async function getTaxBrackets(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { taxRuleId } = req.params;

    const brackets = await taxCalculationService.getTaxBrackets(taxRuleId, organizationId);

    res.status(200).json({
      success: true,
      brackets: brackets,
      count: brackets.length,
    });
  } catch (error) {
    logger.error('Error fetching tax brackets', {
      error: error.message,
      taxRuleId: req.params.taxRuleId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch tax brackets',
    });
  }
}

/**
 * Update a tax bracket
 * PUT /api/paylinq/tax-brackets/:id
 */
async function updateTaxBracket(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const bracket = await taxCalculationService.updateTaxBracket(id, organizationId, updateData);

    if (!bracket) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tax bracket not found',
      });
    }

    logger.info('Tax bracket updated', {
      organizationId,
      bracketId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      bracket: bracket,
      message: 'Tax bracket updated successfully',
    });
  } catch (error) {
    logger.error('Error updating tax bracket', {
      error: error.message,
      bracketId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Delete a tax bracket
 * DELETE /api/paylinq/tax-brackets/:id
 */
async function deleteTaxBracket(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await taxCalculationService.deleteTaxBracket(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tax bracket not found',
      });
    }

    logger.info('Tax bracket deleted', {
      organizationId,
      bracketId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Tax bracket deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting tax bracket', {
      error: error.message,
      bracketId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete tax bracket',
    });
  }
}

/**
 * Calculate taxes for an employee
 * POST /api/paylinq/tax-calculations/calculate
 */
async function calculateTaxes(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, grossPay, payPeriodStart, payPeriodEnd } = req.body;

    if (!employeeId || !grossPay || !payPeriodStart || !payPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Missing required fields: employeeId, grossPay, payPeriodStart, payPeriodEnd',
      });
    }

    const taxCalculations = await taxCalculationService.calculateEmployeeTaxes(
      employeeId,
      grossPay,
      payPeriodStart,
      payPeriodEnd,
      organizationId
    );

    res.status(200).json({
      success: true,
      taxCalculations: taxCalculations,
    });
  } catch (error) {
    logger.error('Error calculating taxes', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Setup default Surinamese tax rules
 * POST /api/paylinq/tax-rules/setup-suriname
 */
async function setupSurinameTaxRules(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    const result = await taxCalculationService.setupSurinameseTaxRules(organizationId, userId);

    logger.info('Surinamese tax rules setup', {
      organizationId,
      userId,
    });

    res.status(201).json({
      success: true,
      result: result,
      message: 'Surinamese tax rules setup successfully',
    });
  } catch (error) {
    logger.error('Error setting up Surinamese tax rules', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Create a new version of a tax rule
 * POST /api/products/paylinq/tax-rules/:id/versions
 */
async function createTaxRuleVersion(req, res) {
  try {
    const { id } = req.params;
    const { organization_id: organizationId, id: userId } = req.user;
    const versionData = req.body;

    // Validate required fields
    if (!versionData.versionType || !['major', 'minor', 'patch'].includes(versionData.versionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid version type',
        message: 'Version type must be major, minor, or patch'
      });
    }

    if (!versionData.changeSummary || versionData.changeSummary.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Change summary is required',
        message: 'Please provide a summary of changes for this version'
      });
    }

    // Create the new version
    const newVersion = await taxCalculationService.createNewTaxRuleVersion(
      id,
      versionData,
      organizationId,
      userId
    );

    logger.info('Tax rule version created', {
      originalRuleId: id,
      newVersionId: newVersion.id,
      versionType: versionData.versionType,
      organizationId,
      userId
    });

    return res.status(201).json({
      success: true,
      version: newVersion,
      message: `${versionData.versionType.charAt(0).toUpperCase() + versionData.versionType.slice(1)} version created successfully`
    });
  } catch (error) {
    logger.error('Error creating tax rule version', {
      error: error.message,
      ruleId: req.params.id,
      organizationId: req.user?.organization_id
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule not found',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get version history for a tax rule
 * GET /api/products/paylinq/tax-rules/:ruleSetCode/versions
 */
async function getTaxRuleVersionHistory(req, res) {
  try {
    const { ruleSetCode } = req.params;
    const { organization_id: organizationId } = req.user;
    const { includeArchived = false } = req.query;

    const versionHistory = await taxCalculationService.getTaxRuleVersionHistory(
      ruleSetCode,
      organizationId,
      { includeArchived: includeArchived === 'true' }
    );

    logger.info('Tax rule version history retrieved', {
      ruleSetCode,
      versionCount: versionHistory.length,
      organizationId
    });

    return res.status(200).json({
      success: true,
      versions: versionHistory,
      ruleSetCode
    });
  } catch (error) {
    logger.error('Error retrieving tax rule version history', {
      error: error.message,
      ruleSetCode: req.params.ruleSetCode,
      organizationId: req.user?.organization_id
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule set not found',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Publish a tax rule version
 * PUT /api/products/paylinq/tax-rules/:id/publish
 */
async function publishTaxRuleVersion(req, res) {
  try {
    const { id } = req.params;
    const { organization_id: organizationId, id: userId } = req.user;
    const { effectiveDate } = req.body;

    // Validate effective date format if provided
    if (effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Effective date must be in YYYY-MM-DD format'
      });
    }

    const publishedVersion = await taxCalculationService.publishTaxRuleVersion(
      id,
      organizationId,
      userId,
      effectiveDate
    );

    logger.info('Tax rule version published', {
      versionId: id,
      effectiveDate,
      organizationId,
      userId
    });

    return res.status(200).json({
      success: true,
      version: publishedVersion,
      message: 'Tax rule version published successfully'
    });
  } catch (error) {
    logger.error('Error publishing tax rule version', {
      error: error.message,
      versionId: req.params.id,
      organizationId: req.user?.organization_id
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule version not found',
        message: error.message
      });
    }

    if (error.message.includes('already published')) {
      return res.status(409).json({
        success: false,
        error: 'Version already published',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Archive a tax rule version
 * PUT /api/products/paylinq/tax-rules/:id/archive
 */
async function archiveTaxRuleVersion(req, res) {
  try {
    const { id } = req.params;
    const { organization_id: organizationId, id: userId } = req.user;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Archive reason is required',
        message: 'Please provide a reason for archiving this version'
      });
    }

    const archivedVersion = await taxCalculationService.archiveTaxRuleVersion(
      id,
      reason.trim(),
      organizationId,
      userId
    );

    logger.info('Tax rule version archived', {
      versionId: id,
      reason: reason.trim(),
      organizationId,
      userId
    });

    return res.status(200).json({
      success: true,
      version: archivedVersion,
      message: 'Tax rule version archived successfully'
    });
  } catch (error) {
    logger.error('Error archiving tax rule version', {
      error: error.message,
      versionId: req.params.id,
      organizationId: req.user?.organization_id
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule version not found',
        message: error.message
      });
    }

    if (error.message.includes('already archived')) {
      return res.status(409).json({
        success: false,
        error: 'Version already archived',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Compare two tax rule versions
 * GET /api/products/paylinq/tax-rules/:fromId/compare/:toId
 */
async function compareTaxRuleVersions(req, res) {
  try {
    const { fromId, toId } = req.params;
    const { organization_id: organizationId } = req.user;

    const comparison = await taxCalculationService.compareTaxRuleVersions(
      fromId,
      toId,
      organizationId
    );

    logger.info('Tax rule versions compared', {
      fromId,
      toId,
      organizationId,
      changesCount: comparison.changes?.length || 0
    });

    return res.status(200).json({
      success: true,
      comparison,
      message: 'Version comparison completed successfully'
    });
  } catch (error) {
    logger.error('Error comparing tax rule versions', {
      error: error.message,
      fromId: req.params.fromId,
      toId: req.params.toId,
      organizationId: req.user?.organization_id
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'One or both tax rule versions not found',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

export default {
  createTaxRule,
  getTaxRules,
  getTaxRuleById,
  updateTaxRule,
  deleteTaxRule,
  createTaxBracket,
  getTaxBrackets,
  updateTaxBracket,
  deleteTaxBracket,
  calculateTaxes,
  setupSurinameTaxRules,
  // Versioning methods
  createTaxRuleVersion,
  getTaxRuleVersionHistory,
  publishTaxRuleVersion,
  archiveTaxRuleVersion,
  compareTaxRuleVersions,
};
