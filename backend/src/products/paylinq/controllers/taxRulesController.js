/**
 * Tax Rules Controller
 * Handles Surinamese tax rules and social security contributions
 * Connected to actual database via taxCalculationService
 */

import taxCalculationService from '../services/taxCalculationService.js';
import logger from '../../../utils/logger.js';
import { mapTaxRuleSetDbToApi, mapTaxBracketDbToApi } from '../dto/taxRuleDto.js';

/**
 * Get all tax rules with optional filtering
 */
export const getTaxRules = async (req, res) => {
  try {
    const { organization_id: organizationId } = req.user;
    const { taxType, jurisdiction, includeInactive, page = 1, limit = 50 } = req.query;

    logger.info('getTaxRules called', {
      organizationId,
      taxType,
      jurisdiction,
      includeInactive,
      userEmail: req.user?.email,
    });

    const filters = {
      taxType,
      jurisdiction,
      includeInactive: includeInactive === 'true',
    };

    // Get all tax rules from database
    const allRules = await taxCalculationService.getTaxRuleSets(organizationId, filters);
    
    logger.info('Tax rules fetched from database', {
      organizationId,
      count: allRules.length,
    });

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRules = allRules.slice(startIndex, endIndex);

    // Get tax brackets for each rule
    const taxRulesWithBrackets = await Promise.all(
      paginatedRules.map(async (dbRule) => {
        // Map database format to API format
        const rule = mapTaxRuleSetDbToApi(dbRule);
        
        const dbBrackets = await taxCalculationService.getTaxBrackets(rule.id, organizationId);
        
        // Determine active status based on effective dates
        const now = new Date();
        const effectiveFrom = new Date(rule.effectiveFrom);
        const effectiveTo = rule.effectiveTo ? new Date(rule.effectiveTo) : null;
        const isActive = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);
        
        return {
          id: rule.id,
          name: rule.taxName,
          type: mapTaxTypeToFrontend(rule.taxType),
          description: rule.description || `${rule.taxName} tax rule`,
          brackets: dbBrackets.map(dbB => {
            const b = mapTaxBracketDbToApi(dbB);
            return {
              min: parseFloat(b.minIncome),
              max: b.maxIncome ? parseFloat(b.maxIncome) : null,
              rate: parseFloat(b.taxRate),
              deduction: parseFloat(b.standardDeduction || 0),
            };
          }),
          status: isActive ? 'active' : 'inactive',
          effectiveDate: rule.effectiveFrom.toISOString().split('T')[0],
          lastUpdated: rule.updatedAt ? rule.updatedAt.toISOString() : 
                       rule.createdAt ? rule.createdAt.toISOString() : 
                       new Date().toISOString(),
        };
      })
    );

    logger.info('Sending tax rules response', {
      organizationId,
      count: taxRulesWithBrackets.length,
      sampleTypes: taxRulesWithBrackets.slice(0, 3).map(r => ({ name: r.name, type: r.type })),
    });

    res.status(200).json({
      success: true,
      taxRules: taxRulesWithBrackets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allRules.length,
        totalPages: Math.ceil(allRules.length / limitNum),
        hasNext: endIndex < allRules.length,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching tax rules', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax rules',
      errorCode: 'FETCH_TAX_RULES_ERROR',
    });
  }
};

/**
 * Get single tax rule by ID
 */
export const getTaxRule = async (req, res) => {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const dbRule = await taxCalculationService.getTaxRuleSetById(id, organizationId);

    if (!dbRule) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule not found',
        errorCode: 'TAX_RULE_NOT_FOUND',
      });
    }

    // Map database format to API format
    const rule = mapTaxRuleSetDbToApi(dbRule);

    // Get brackets for this rule
    const dbBrackets = await taxCalculationService.getTaxBrackets(rule.id, organizationId);

    // Determine active status based on effective dates
    const now = new Date();
    const effectiveFrom = new Date(rule.effectiveFrom);
    const effectiveTo = rule.effectiveTo ? new Date(rule.effectiveTo) : null;
    const isActive = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);

    const taxRule = {
      id: rule.id,
      name: rule.taxName,
      type: mapTaxTypeToFrontend(rule.taxType),
      description: rule.description || `${rule.taxName} tax rule`,
      brackets: dbBrackets.map(dbB => {
        const b = mapTaxBracketDbToApi(dbB);
        return {
          min: parseFloat(b.minIncome),
          max: b.maxIncome ? parseFloat(b.maxIncome) : null,
          rate: parseFloat(b.taxRate),
          deduction: parseFloat(b.standardDeduction || 0),
        };
      }),
      status: isActive ? 'active' : 'inactive',
      effectiveDate: rule.effectiveFrom.toISOString().split('T')[0],
      lastUpdated: rule.updatedAt ? rule.updatedAt.toISOString() : 
                   rule.createdAt ? rule.createdAt.toISOString() : 
                   new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      taxRule,
    });
  } catch (error) {
    logger.error('Error fetching tax rule', {
      error: error.message,
      stack: error.stack,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax rule',
      errorCode: 'FETCH_TAX_RULE_ERROR',
    });
  }
};

/**
 * Create new tax rule
 */
export const createTaxRule = async (req, res) => {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const {
      name,
      type,
      description,
      brackets,
      rate,
      employeeContribution,
      employerContribution,
      effectiveDate,
      status = 'active',
    } = req.body;

    // Validation
    if (!name || !type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and description are required',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const validTypes = ['wage-tax', 'aov', 'aww'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Type must be one of: ${validTypes.join(', ')}`,
        errorCode: 'INVALID_TYPE',
      });
    }

    // Map frontend type to backend type
    const backendType = mapTaxTypeToBackend(type);

    // Create tax rule set
    const ruleSetData = {
      taxType: backendType,
      taxName: name,
      country: 'SR', // Suriname
      state: null,
      locality: null,
      effectiveFrom: effectiveDate ? new Date(effectiveDate) : new Date(),
      effectiveTo: status === 'inactive' ? new Date() : null, // Set effectiveTo to now if inactive
      annualCap: null,
      calculationMethod: 'bracket',
      description,
    };

    const createdRule = await taxCalculationService.createTaxRuleSet(
      ruleSetData,
      organizationId,
      userId
    );

    // Create brackets if provided
    if (brackets && Array.isArray(brackets) && brackets.length > 0) {
      for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        const bracketData = {
          taxRuleSetId: createdRule.id,
          bracketOrder: i + 1,
          minIncome: bracket.min,
          maxIncome: bracket.max,
          taxRate: bracket.rate,
          standardDeduction: bracket.deduction || 0,
          additionalDeduction: 0,
        };
        await taxCalculationService.createTaxBracket(bracketData, organizationId, userId);
      }
    }

    // Fetch the created rule with brackets
    const dbRuleWithBrackets = await taxCalculationService.getTaxRuleSetById(
      createdRule.id,
      organizationId
    );
    const ruleWithBrackets = mapTaxRuleSetDbToApi(dbRuleWithBrackets);
    
    const dbFinalBrackets = await taxCalculationService.getTaxBrackets(
      createdRule.id,
      organizationId
    );

    const taxRule = {
      id: ruleWithBrackets.id,
      name: ruleWithBrackets.taxName,
      type: mapTaxTypeToFrontend(ruleWithBrackets.taxType),
      description: ruleWithBrackets.description,
      brackets: dbFinalBrackets.map(dbB => {
        const b = mapTaxBracketDbToApi(dbB);
        return {
          min: parseFloat(b.minIncome),
          max: b.maxIncome ? parseFloat(b.maxIncome) : null,
          rate: parseFloat(b.taxRate),
          deduction: parseFloat(b.standardDeduction || 0),
        };
      }),
      status: status || 'active',
      effectiveDate: ruleWithBrackets.effectiveFrom.toISOString().split('T')[0],
      lastUpdated: ruleWithBrackets.updatedAt ? ruleWithBrackets.updatedAt.toISOString() : 
                   ruleWithBrackets.createdAt ? ruleWithBrackets.createdAt.toISOString() : 
                   new Date().toISOString(),
    };

    logger.info('Tax rule created', {
      organizationId,
      taxRuleId: taxRule.id,
      userId,
    });

    res.status(201).json({
      success: true,
      taxRule,
      message: 'Tax rule created successfully',
    });
  } catch (error) {
    logger.error('Error creating tax rule', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create tax rule',
      errorCode: 'CREATE_TAX_RULE_ERROR',
    });
  }
};

/**
 * Update existing tax rule
 */
export const updateTaxRule = async (req, res) => {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const {
      name,
      type,
      description,
      brackets,
      status,
      effectiveDate,
    } = req.body;

    // Check if rule exists
    const existingRule = await taxCalculationService.getTaxRuleSetById(id, organizationId);

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule not found',
        errorCode: 'TAX_RULE_NOT_FOUND',
      });
    }

    // Prepare update data
    const updateData = {
      ...(name && { taxName: name }),
      ...(type && { taxType: mapTaxTypeToBackend(type) }),
      ...(description && { description }),
      ...(effectiveDate && { effectiveFrom: new Date(effectiveDate) }),
    };
    
    // Handle status update by setting effectiveTo date
    if (status !== undefined) {
      if (status === 'inactive') {
        updateData.effectiveTo = new Date(); // Set to now to mark as inactive
      } else {
        updateData.effectiveTo = null; // Remove end date to mark as active
      }
    }

    // Update the rule
    const updatedRule = await taxCalculationService.updateTaxRuleSet(
      id,
      organizationId,
      updateData
    );

    // Update brackets if provided
    if (brackets && Array.isArray(brackets)) {
      // Get existing brackets
      const existingBrackets = await taxCalculationService.getTaxBrackets(id, organizationId);
      
      // Delete existing brackets
      for (const bracket of existingBrackets) {
        await taxCalculationService.deleteTaxBracket(bracket.id, organizationId, userId);
      }

      // Create new brackets
      for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        const bracketData = {
          taxRuleSetId: id,
          bracketOrder: i + 1,
          minIncome: bracket.min,
          maxIncome: bracket.max,
          taxRate: bracket.rate,
          standardDeduction: bracket.deduction || 0,
          additionalDeduction: 0,
        };
        await taxCalculationService.createTaxBracket(bracketData, organizationId, userId);
      }
    }

    // Fetch updated rule with brackets
    const dbFinalRule = await taxCalculationService.getTaxRuleSetById(id, organizationId);
    const finalRule = mapTaxRuleSetDbToApi(dbFinalRule);
    
    const dbFinalBrackets = await taxCalculationService.getTaxBrackets(id, organizationId);

    // Determine active status based on effective dates
    const now = new Date();
    const effectiveFrom = new Date(finalRule.effectiveFrom);
    const effectiveTo = finalRule.effectiveTo ? new Date(finalRule.effectiveTo) : null;
    const isActive = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);

    const taxRule = {
      id: finalRule.id,
      name: finalRule.taxName,
      type: mapTaxTypeToFrontend(finalRule.taxType),
      description: finalRule.description,
      brackets: dbFinalBrackets.map(dbB => {
        const b = mapTaxBracketDbToApi(dbB);
        return {
          min: parseFloat(b.minIncome),
          max: b.maxIncome ? parseFloat(b.maxIncome) : null,
          rate: parseFloat(b.taxRate),
          deduction: parseFloat(b.standardDeduction || 0),
        };
      }),
      status: isActive ? 'active' : 'inactive',
      effectiveDate: finalRule.effectiveFrom.toISOString().split('T')[0],
      lastUpdated: finalRule.updatedAt ? finalRule.updatedAt.toISOString() : 
                   finalRule.createdAt ? finalRule.createdAt.toISOString() : 
                   new Date().toISOString(),
    };

    logger.info('Tax rule updated', {
      organizationId,
      taxRuleId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      taxRule,
      message: 'Tax rule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating tax rule', {
      error: error.message,
      stack: error.stack,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update tax rule',
      errorCode: 'UPDATE_TAX_RULE_ERROR',
    });
  }
};

/**
 * Delete tax rule
 */
export const deleteTaxRule = async (req, res) => {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    // Check if rule exists
    const existingRule = await taxCalculationService.getTaxRuleSetById(id, organizationId);

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Tax rule not found',
        errorCode: 'TAX_RULE_NOT_FOUND',
      });
    }

    // Delete all brackets first
    const brackets = await taxCalculationService.getTaxBrackets(id, organizationId);
    for (const bracket of brackets) {
      await taxCalculationService.deleteTaxBracket(bracket.id, organizationId, userId);
    }

    // Delete the rule
    await taxCalculationService.deleteTaxRuleSet(id, organizationId, userId);

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
      stack: error.stack,
      taxRuleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete tax rule',
      errorCode: 'DELETE_TAX_RULE_ERROR',
    });
  }
};

/**
 * Helper function to map frontend tax type to backend tax type
 */
function mapTaxTypeToBackend(frontendType) {
  const typeMap = {
    'wage-tax': 'wage',
    'aov': 'social_security',
    'aww': 'social_security',
  };
  return typeMap[frontendType] || frontendType;
}

/**
 * Helper function to map backend tax type to frontend tax type
 */
function mapTaxTypeToFrontend(backendType) {
  const typeMap = {
    'wage_tax': 'wage-tax',
    'wage_tax_monthly': 'wage-tax',
    'wage': 'wage-tax',
    'income': 'wage-tax',
    'aov': 'aov',
    'aww': 'aww',
    'social_security': 'aov',
    'overtime': 'wage-tax',
    'lump_sum_benefits': 'wage-tax',
  };
  
  return typeMap[backendType] || 'wage-tax';
}
