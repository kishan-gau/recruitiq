/**
 * Tax Rules Controller
 * Handles Surinamese tax rules and social security contributions
 */

import { v4 as uuidv4 } from 'uuid';

// In-memory storage for tax rules (replace with database in production)
let taxRules = [
  {
    id: 'tax-rule-wage-2025',
    name: 'Wage Tax 2025',
    type: 'wage-tax',
    description: 'Progressive wage tax rates for 2025',
    brackets: [
      {
        min: 0,
        max: 450000,
        rate: 0,
        deduction: 0,
      },
      {
        min: 450000,
        max: 900000,
        rate: 10,
        deduction: 0,
      },
      {
        min: 900000,
        max: 1350000,
        rate: 20,
        deduction: 90000,
      },
      {
        min: 1350000,
        max: null, // No upper limit
        rate: 30,
        deduction: 225000,
      },
    ],
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tax-rule-aov-2025',
    name: 'AOV (Pension) 2025',
    type: 'aov',
    description: 'General Old Age Pension contributions',
    employeeContribution: 3,
    employerContribution: 4.5,
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tax-rule-aww-2025',
    name: 'AWW (Widows & Orphans) 2025',
    type: 'aww',
    description: 'General Widows and Orphans Pension contributions',
    employeeContribution: 0.5,
    employerContribution: 0.75,
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2025-01-01T00:00:00Z',
  },
];

/**
 * Get all tax rules with optional filtering
 */
export const getTaxRules = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;

    let filtered = [...taxRules];

    // Apply filters
    if (status) {
      filtered = filtered.filter(rule => rule.status === status);
    }

    if (type) {
      filtered = filtered.filter(rule => rule.type === type);
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginated = filtered.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching tax rules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TAX_RULES_ERROR',
        message: 'Failed to fetch tax rules',
        details: error.message,
      },
    });
  }
};

/**
 * Get single tax rule by ID
 */
export const getTaxRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = taxRules.find(r => r.id === id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TAX_RULE_NOT_FOUND',
          message: 'Tax rule not found',
        },
      });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error fetching tax rule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TAX_RULE_ERROR',
        message: 'Failed to fetch tax rule',
        details: error.message,
      },
    });
  }
};

/**
 * Create new tax rule
 */
export const createTaxRule = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      brackets,
      rate,
      employeeContribution,
      employerContribution,
      effectiveDate,
    } = req.body;

    // Validation
    if (!name || !type || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, type, and description are required',
        },
      });
    }

    const validTypes = ['wage-tax', 'aov', 'aww'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Type must be one of: ${validTypes.join(', ')}`,
        },
      });
    }

    const newRule = {
      id: `tax-rule-${uuidv4()}`,
      name,
      type,
      description,
      ...(brackets && { brackets }),
      ...(rate !== undefined && { rate }),
      ...(employeeContribution !== undefined && { employeeContribution }),
      ...(employerContribution !== undefined && { employerContribution }),
      status: 'active',
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
    };

    taxRules.push(newRule);

    res.status(201).json({
      success: true,
      data: newRule,
      message: 'Tax rule created successfully',
    });
  } catch (error) {
    console.error('Error creating tax rule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_TAX_RULE_ERROR',
        message: 'Failed to create tax rule',
        details: error.message,
      },
    });
  }
};

/**
 * Update existing tax rule
 */
export const updateTaxRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const index = taxRules.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TAX_RULE_NOT_FOUND',
          message: 'Tax rule not found',
        },
      });
    }

    // Update the rule
    taxRules[index] = {
      ...taxRules[index],
      ...updates,
      id, // Prevent ID from being changed
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: taxRules[index],
      message: 'Tax rule updated successfully',
    });
  } catch (error) {
    console.error('Error updating tax rule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TAX_RULE_ERROR',
        message: 'Failed to update tax rule',
        details: error.message,
      },
    });
  }
};

/**
 * Delete tax rule
 */
export const deleteTaxRule = async (req, res) => {
  try {
    const { id } = req.params;

    const index = taxRules.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TAX_RULE_NOT_FOUND',
          message: 'Tax rule not found',
        },
      });
    }

    // Remove the rule
    const deletedRule = taxRules.splice(index, 1)[0];

    res.json({
      success: true,
      data: deletedRule,
      message: 'Tax rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tax rule:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_TAX_RULE_ERROR',
        message: 'Failed to delete tax rule',
        details: error.message,
      },
    });
  }
};
