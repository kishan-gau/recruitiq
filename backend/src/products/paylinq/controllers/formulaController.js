import PayComponentService from '../services/payComponentService.js';
import logger from '../../../utils/logger.js';

const payComponentService = new PayComponentService();

/**
 * Validate a formula expression
 * POST /api/paylinq/formulas/validate
 * Body: { formula: "gross_pay * 0.10" }
 */
export const validateFormula = async (req, res) => {
  try {
    const { formula } = req.body;

    if (!formula || typeof formula !== 'string' || formula.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Formula is required'
      });
    }

    const result = payComponentService.validateFormula(formula);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Formula validation completed'
    });
  } catch (err) {
    logger.error('Error in validateFormula controller', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};

/**
 * Test a formula with sample data
 * POST /api/paylinq/formulas/test
 * Body: { formula: "gross_pay * 0.10" }
 */
export const testFormula = async (req, res) => {
  try {
    const { formula } = req.body;

    if (!formula || typeof formula !== 'string' || formula.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Formula is required'
      });
    }

    const result = payComponentService.testFormula(formula);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Formula test completed'
    });
  } catch (err) {
    logger.error('Error in testFormula controller', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};

/**
 * Execute a formula for a pay component
 * POST /api/paylinq/formulas/execute
 * Body: { componentId: "uuid", variables: { gross_pay: 5000, hours_worked: 160 } }
 */
export const executeFormula = async (req, res) => {
  try {
    const { componentId, variables } = req.body;
    const organizationId = req.user?.organization_id;

    if (!componentId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Component ID is required'
      });
    }

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Variables object is required'
      });
    }

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Organization ID not found in request'
      });
    }

    const result = await payComponentService.executeComponentFormula(
      componentId,
      variables,
      organizationId
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Formula executed successfully'
    });
  } catch (err) {
    logger.error('Error in executeFormula controller', { error: err.message });
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: err.message
    });
  }
};

/**
 * Get formula variables and metadata
 * GET /api/paylinq/formulas/variables
 */
export const getFormulaVariables = async (req, res) => {
  try {
    // Import Variables enum from FormulaTypes
    const variables = {
      base_salary: {
        type: 'number',
        description: 'Employee base salary',
        example: 50000,
      },
      gross_pay: {
        type: 'number',
        description: 'Gross pay for the period',
        example: 5000,
      },
      net_pay: {
        type: 'number',
        description: 'Net pay after deductions',
        example: 4000,
      },
      taxable_income: {
        type: 'number',
        description: 'Taxable income for the period',
        example: 4500,
      },
      hours_worked: {
        type: 'number',
        description: 'Total hours worked',
        example: 160,
      },
      regular_hours: {
        type: 'number',
        description: 'Regular hours worked',
        example: 160,
      },
      overtime_hours: {
        type: 'number',
        description: 'Overtime hours worked',
        example: 10,
      },
      days_worked: {
        type: 'number',
        description: 'Number of days worked',
        example: 22,
      },
      hourly_rate: {
        type: 'number',
        description: 'Hourly rate',
        example: 25,
      },
      overtime_rate: {
        type: 'number',
        description: 'Overtime hourly rate',
        example: 37.5,
      },
      total_earnings: {
        type: 'number',
        description: 'Total earnings before deductions',
        example: 5500,
      },
      total_deductions: {
        type: 'number',
        description: 'Total deductions',
        example: 1000,
      },
    };

    const operators = [
      { symbol: '+', description: 'Addition' },
      { symbol: '-', description: 'Subtraction' },
      { symbol: '*', description: 'Multiplication' },
      { symbol: '/', description: 'Division' },
      { symbol: '%', description: 'Modulo (remainder)' },
      { symbol: '>', description: 'Greater than' },
      { symbol: '<', description: 'Less than' },
      { symbol: '==', description: 'Equal to' },
      { symbol: '!=', description: 'Not equal to' },
      { symbol: '>=', description: 'Greater than or equal to' },
      { symbol: '<=', description: 'Less than or equal to' },
      { symbol: 'AND', description: 'Logical AND' },
      { symbol: 'OR', description: 'Logical OR' },
      { symbol: 'NOT', description: 'Logical NOT' },
    ];

    const functions = [
      { name: 'MIN', description: 'Returns the minimum value', example: 'MIN(hours_worked, 160)' },
      { name: 'MAX', description: 'Returns the maximum value', example: 'MAX(hours_worked, 0)' },
      { name: 'ROUND', description: 'Rounds to specified decimals', example: 'ROUND(gross_pay * 0.10, 2)' },
      { name: 'FLOOR', description: 'Rounds down to nearest integer', example: 'FLOOR(hours_worked / 8)' },
      { name: 'CEIL', description: 'Rounds up to nearest integer', example: 'CEIL(days_worked / 7)' },
      { name: 'ABS', description: 'Returns absolute value', example: 'ABS(net_pay - gross_pay)' },
      { name: 'IF', description: 'Conditional function', example: 'IF(hours_worked > 160, overtime_rate, hourly_rate)' },
    ];

    const examples = [
      { name: '10% of Gross Pay', formula: 'gross_pay * 0.10' },
      { name: 'Overtime Pay', formula: 'overtime_hours * overtime_rate' },
      { name: 'Daily Rate', formula: 'base_salary / 260' },
      { name: 'Health Insurance', formula: 'gross_pay > 3000 ? 150 : 100' },
      { name: 'Conditional Bonus', formula: 'IF(hours_worked > 160, (hours_worked - 160) * hourly_rate * 1.5, 0)' },
      { name: 'Taxable Earnings', formula: 'gross_pay - total_deductions' },
    ];

    return res.status(200).json({
      success: true,
      data: { variables, operators, functions, examples },
      message: 'Formula metadata retrieved successfully'
    });
  } catch (err) {
    logger.error('Error in getFormulaVariables controller', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
};

export default {
  validateFormula,
  testFormula,
  executeFormula,
  getFormulaVariables,
};
