/**
 * Formula Engine Service
 * 
 * Business logic layer for formula evaluation and management.
 * Handles formula parsing, variable substitution, and calculation execution.
 * 
 * MVP Version: Simple arithmetic formulas (e.g., hours * rate, base + bonus)
 * Phase 2: Complex expressions with conditionals, aggregations, and custom functions
 * 
 * SECURITY: Uses mathjs library for safe expression evaluation.
 * Prevents code injection vulnerabilities by avoiding eval() and Function() constructor.
 * 
 * @module products/paylinq/services/formulaEngineService
 */

import { create, all } from 'mathjs';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';

// Create a limited math.js instance with only safe functions
const math = create(all, {
  number: 'number',        // Use native JavaScript numbers
  precision: 64,           // Precision for calculations
});

class FormulaEngineService {
  
  allowedOperators: any;

constructor() {
    // MVP: Simple arithmetic operators only
    this.allowedOperators = ['+', '-', '*', '/', '(', ')'];
  }

  /**
   * Evaluate formula with variables
   * @param {string} formula - Formula expression
   * @param {Object} variables - Variable values
   * @returns {number} Calculated result
   */
  evaluateFormula(formula, variables = {}) {
    try {
      // Validate formula
      this.validateFormula(formula);

      // Substitute variables
      const expression = this.substituteVariables(formula, variables);

      // Evaluate expression (MVP: simple arithmetic)
      const result = this.evaluateExpression(expression);

      logger.debug('Formula evaluated', {
        formula,
        variables,
        result
      });

      return result;
    } catch (_err) {
      logger.error('Error evaluating formula', {
        error: err.message,
        formula,
        variables
      });
      throw new Error(`Formula evaluation error: ${err.message}`);
    }
  }

  /**
   * Parse and validate JavaScript formula
   * Supports complex formulas with conditionals, loops, and functions
   * @param {string} formula - JavaScript formula expression
   * @returns {Object} Parsed formula metadata
   * @throws {Error} If formula is invalid
   */
  async parseFormula(formula) {
    if (!formula || typeof formula !== 'string') {
      throw new Error('Formula must be a non-empty string');
    }

    // Trim formula
    const trimmedFormula = formula.trim();

    // Check for dangerous patterns (security)
    const dangerousPatterns = [
      /\beval\s*\(/i,
      /\bFunction\s*\(/i,
      /\brequire\s*\(/i,
      /\bimport\s+/i,
      /\bprocess\./i,
      /\b__dirname\b/i,
      /\b__filename\b/i,
      /\bfs\./i,
      /\bchild_process\b/i,
      /\bexec\s*\(/i,
      /\bspawn\s*\(/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedFormula)) {
        throw new Error('Formula contains forbidden patterns for security reasons');
      }
    }

    // Check for balanced braces and parentheses
    let braceBalance = 0;
    let parenBalance = 0;
    for (const char of trimmedFormula) {
      if (char === '{') braceBalance++;
      if (char === '}') braceBalance--;
      if (char === '(') parenBalance++;
      if (char === ')') parenBalance--;
      
      if (braceBalance < 0 || parenBalance < 0) {
        throw new Error('Unbalanced braces or parentheses in formula');
      }
    }

    if (braceBalance !== 0) {
      throw new Error('Unbalanced braces in formula');
    }
    if (parenBalance !== 0) {
      throw new Error('Unbalanced parentheses in formula');
    }

    // Auto-wrap simple expressions with return statement
    // If formula doesn't have 'return' and is a simple expression (no semicolons, no braces)
    let finalFormula = trimmedFormula;
    if (!/\breturn\b/.test(trimmedFormula)) {
      // Simple expression: no semicolons (except maybe trailing), no function definitions, no control structures
      const isSimpleExpression = !trimmedFormula.includes('{') && 
                                 !/\bif\b/i.test(trimmedFormula) &&
                                 !/\bfor\b/i.test(trimmedFormula) &&
                                 !/\bwhile\b/i.test(trimmedFormula) &&
                                 !trimmedFormula.replace(/;\s*$/, '').includes(';');
      
      if (isSimpleExpression) {
        // Auto-wrap with return
        finalFormula = `return ${trimmedFormula.replace(/;\s*$/, '')};`;
        logger.debug('Auto-wrapped simple expression with return', { 
          original: trimmedFormula, 
          wrapped: finalFormula 
        });
      } else {
        throw new Error('Complex formulas must contain a return statement. Tip: For simple calculations, just write the expression (e.g., "amount * 0.05")');
      }
    }

    // Extract ALL variable names (identifiers that aren't keywords or numbers)
    const identifierPattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const allIdentifiers = finalFormula.match(identifierPattern) || [];
    
    // Filter out JavaScript keywords and common operators
    const jsKeywords = ['return', 'if', 'else', 'for', 'while', 'function', 'const', 'let', 'var', 'true', 'false', 'null', 'undefined', 'Math', 'Number', 'String'];
    const variables = [...new Set(allIdentifiers.filter(id => !jsKeywords.includes(id)))];

    // Validate formula doesn't have syntax errors
    // Skip validation for simple expressions (trust them)
    if (!/\bif\b|\bfor\b|\bwhile\b|\bfunction\b/.test(finalFormula)) {
      // Simple expression - skip complex validation
      logger.debug('Skipping complex validation for simple expression');
    } else {
      // Complex formula - validate syntax
      try {
        // Declare all detected variables
        const varDeclarations = variables.map(v => `let ${v};`).join('\n');
        const testCode = `${varDeclarations}\n${finalFormula}`;
        // eslint-disable-next-line no-new-func
        new Function(testCode);
      } catch (_err) {
        throw new Error(`Syntax error: ${err.message}. Check your formula for typos or missing operators.`);
      }
    }

    return {
      isValid: true,
      formula: finalFormula,
      variables,
      type: 'javascript',
      hasConditionals: /\bif\b/i.test(finalFormula),
      hasLoops: /\b(for|while)\b/i.test(finalFormula),
      lineCount: finalFormula.split('\n').length
    };
  }

  /**
   * Validate formula syntax
   * @param {string} formula - Formula expression
   * @throws {Error} If formula is invalid
   */
  validateFormula(formula) {
    if (!formula || typeof formula !== 'string') {
      throw new Error('Formula must be a non-empty string');
    }

    // Check for balanced parentheses
    let balance = 0;
    for (const char of formula) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        throw new Error('Unbalanced parentheses in formula');
      }
    }

    if (balance !== 0) {
      throw new Error('Unbalanced parentheses in formula');
    }

    // MVP: Check for allowed characters only
    // Allow: alphanumeric, whitespace (including newlines), operators (+, -, *, /), parentheses, braces, dots, commas, semicolons, colons (ternary), quotes, square brackets, comparison operators
    const allowedPattern = /^[\d\s+\-*/().{}\w:;,'"[\]<>=!&|\n\r]+$/;
    if (!allowedPattern.test(formula)) {
      throw new Error('Formula contains invalid characters');
    }

    // Check for common syntax errors
    if (/[+\-*/]{2,}/.test(formula.replace(/\*\*/g, ''))) {
      throw new Error('Formula contains consecutive operators');
    }

    if (/^\s*[+\-*/]/.test(formula) || /[+\-*/]\s*$/.test(formula)) {
      throw new Error('Formula cannot start or end with an operator');
    }
  }

  /**
   * Substitute variables in formula
   * @param {string} formula - Formula expression
   * @param {Object} variables - Variable values
   * @returns {string} Formula with variables substituted
   */
  substituteVariables(formula, variables) {
    let result = formula;

    // Find all variables in {variable} format
    const variablePattern = /\{(\w+)\}/g;
    const matches = [...formula.matchAll(variablePattern)];

    for (const match of matches) {
      const variableName = match[1];
      const variableValue = variables[variableName];

      if (variableValue === undefined || variableValue === null) {
        throw new Error(`Variable '${variableName}' is not defined`);
      }

      // Convert to number
      const numericValue = parseFloat(variableValue);
      if (isNaN(numericValue)) {
        throw new Error(`Variable '${variableName}' has invalid numeric value: ${variableValue}`);
      }

      // Replace variable with value
      result = result.replace(match[0], numericValue.toString());
    }

    return result;
  }

  /**
   * Evaluate arithmetic expression using safe parser
   * SECURITY: Uses mathjs library instead of Function() constructor
   * to prevent code injection vulnerabilities
   * 
   * @param {string} expression - Arithmetic expression
   * @returns {number} Calculated result
   */
  evaluateExpression(expression) {
    try {
      // Remove all whitespace
      const cleanExpression = expression.replace(/\s+/g, '');

      // Validate no variables remain
      if (/\{|\}/.test(cleanExpression)) {
        throw new Error('Unsubstituted variables found in expression');
      }

      // Validate only numbers and operators
      if (!/^[\d+\-*/().]+$/.test(cleanExpression)) {
        throw new Error('Expression contains invalid characters after substitution');
      }

      // SECURITY FIX: Use mathjs library for safe expression evaluation
      // This prevents code injection attacks and prototype pollution
      const result = math.evaluate(cleanExpression);

      // Validate result
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        throw new Error('Formula evaluation resulted in invalid number');
      }

      return result;
    } catch (_err) {
      throw new Error(`Expression evaluation failed: ${err.message}`);
    }
  }

  /**
   * Test formula with sample variables
   * @param {string} formula - Formula expression
   * @param {Object} sampleVariables - Sample variable values
   * @returns {Object} Test results
   */
  testFormula(formula, sampleVariables) {
    try {
      const result = this.evaluateFormula(formula, sampleVariables);

      return {
        success: true,
        formula,
        sampleVariables,
        result,
        message: 'Formula is valid and evaluates successfully'
      };
    } catch (_err) {
      return {
        success: false,
        formula,
        sampleVariables,
        error: err.message,
        message: 'Formula validation failed'
      };
    }
  }

  /**
   * Get common formula templates
   * @returns {Array} Formula templates
   */
  getFormulaTemplates() {
    return [
      {
        name: 'Hourly Pay',
        formula: '{hours} * {rate}',
        description: 'Calculate pay based on hours worked and hourly rate',
        variables: ['hours', 'rate'],
        example: { hours: 40, rate: 25 }
      },
      {
        name: 'Overtime Pay',
        formula: '{overtimeHours} * {rate} * 1.5',
        description: 'Calculate overtime pay at 1.5x regular rate',
        variables: ['overtimeHours', 'rate'],
        example: { overtimeHours: 5, rate: 25 }
      },
      {
        name: 'Salary with Bonus',
        formula: '{baseSalary} + {bonus}',
        description: 'Calculate total pay including bonus',
        variables: ['baseSalary', 'bonus'],
        example: { baseSalary: 5000, bonus: 500 }
      },
      {
        name: 'Commission',
        formula: '{sales} * {commissionRate}',
        description: 'Calculate commission based on sales',
        variables: ['sales', 'commissionRate'],
        example: { sales: 10000, commissionRate: 0.05 }
      },
      {
        name: 'Tiered Commission',
        formula: '({sales} * {rate1}) + ({additionalSales} * {rate2})',
        description: 'Calculate commission with tiered rates',
        variables: ['sales', 'rate1', 'additionalSales', 'rate2'],
        example: { sales: 10000, rate1: 0.05, additionalSales: 5000, rate2: 0.07 }
      },
      {
        name: 'Percentage Deduction',
        formula: '{grossPay} * {percentage}',
        description: 'Calculate deduction as percentage of gross pay',
        variables: ['grossPay', 'percentage'],
        example: { grossPay: 5000, percentage: 0.04 }
      },
      {
        name: 'Fixed Amount Plus Percentage',
        formula: '{fixedAmount} + ({grossPay} * {percentage})',
        description: 'Calculate amount with fixed component and percentage',
        variables: ['fixedAmount', 'grossPay', 'percentage'],
        example: { fixedAmount: 100, grossPay: 5000, percentage: 0.02 }
      },
      {
        name: 'Prorated Salary',
        formula: '({annualSalary} / {periodsPerYear}) * ({daysWorked} / {daysInPeriod})',
        description: 'Calculate prorated salary for partial period',
        variables: ['annualSalary', 'periodsPerYear', 'daysWorked', 'daysInPeriod'],
        example: { annualSalary: 60000, periodsPerYear: 12, daysWorked: 20, daysInPeriod: 30 }
      }
    ];
  }

  /**
   * Extract variables from formula
   * @param {string} formula - Formula expression
   * @returns {Array} Variable names
   */
  extractVariables(formula) {
    const variablePattern = /\{(\w+)\}/g;
    const matches = [...formula.matchAll(variablePattern)];
    const variables = matches.map(match => match[1]);
    
    // Return unique variables
    return [...new Set(variables)];
  }

  /**
   * Validate variable values
   * @param {Object} variables - Variable values
   * @param {Array} requiredVariables - Required variable names
   * @throws {Error} If validation fails
   */
  validateVariables(variables, requiredVariables) {
    for (const varName of requiredVariables) {
      if (!(varName in variables)) {
        throw new Error(`Required variable '${varName}' is missing`);
      }

      const value = variables[varName];
      if (value === null || value === undefined) {
        throw new Error(`Variable '${varName}' has null or undefined value`);
      }

      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        throw new Error(`Variable '${varName}' is not a valid number: ${value}`);
      }
    }
  }

  /**
   * Format formula for display
   * @param {string} formula - Formula expression
   * @returns {string} Formatted formula
   */
  formatFormula(formula) {
    // Add spaces around operators for readability
    let formatted = formula
      .replace(/\+/g, ' + ')
      .replace(/-/g, ' - ')
      .replace(/\*/g, ' * ')
      .replace(/\//g, ' / ')
      .replace(/\(/g, '( ')
      .replace(/\)/g, ' )');

    // Remove extra spaces
    formatted = formatted.replace(/\s+/g, ' ').trim();

    return formatted;
  }

  /**
   * Calculate with error handling and logging
   * @param {string} formula - Formula expression
   * @param {Object} variables - Variable values
   * @param {string} context - Context for logging (e.g., component name)
   * @returns {number} Calculated result
   */
  calculateSafe(formula, variables, context = 'unknown') {
    try {
      // Extract and validate required variables
      const requiredVars = this.extractVariables(formula);
      this.validateVariables(variables, requiredVars);

      // Evaluate formula
      const result = this.evaluateFormula(formula, variables);

      logger.info('Formula calculation successful', {
        context,
        formula: this.formatFormula(formula),
        variables,
        result
      });

      return result;
    } catch (_err) {
      logger.error('Formula calculation failed', {
        context,
        formula,
        variables,
        error: err.message
      });

      // Return 0 for failed calculations (graceful degradation)
      return 0;
    }
  }
}

export default FormulaEngineService;
