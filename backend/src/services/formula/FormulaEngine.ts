/**
 * Formula Engine - Main orchestrator for formula operations
 * 
 * High-level API for:
 * - Parsing formulas
 * - Validating formulas
 * - Executing formulas
 * - Converting AST to/from JSON
 * 
 * Usage:
 *   const engine = new FormulaEngine();
 *   const result = engine.calculate('gross_pay * 0.10', {gross_pay: 5000});
 *   // result.value = 500
 */

import FormulaParser from './FormulaParser.js';
import FormulaValidator from './FormulaValidator.js';
import FormulaExecutor from './FormulaExecutor.js';
import {
  FormulaParseError,
  FormulaValidationError,
  FormulaExecutionError,
  DivisionByZeroError,
} from './FormulaTypes.js';
import logger from '../../utils/logger.js';

class FormulaEngine {
  
  executor: any;

  parser: any;

  validator: any;

constructor() {
    this.parser = new FormulaParser();
    this.validator = new FormulaValidator();
    this.executor = new FormulaExecutor();
  }

  /**
   * Parse formula string to AST
   * @param {string} formula - Formula expression
   * @returns {ASTNode}
   */
  parse(formula) {
    try {
      const ast = this.parser.parse(formula);
      logger.debug('Formula parsed successfully', { formula, ast });
      return ast;
    } catch (_error) {
      logger.error('Formula parse error', { formula, error: error.message });
      throw error;
    }
  }

  /**
   * Validate formula (string or AST)
   * @param {string|ASTNode} formula - Formula string or AST
   * @param {Object} options - Validation options
   * @returns {ValidationResult}
   */
  validate(formula, options = {}) {
    try {
      const ast = typeof formula === 'string' ? this.parse(formula) : formula;
      const result = this.validator.validate(ast, options);
      
      logger.debug('Formula validation complete', {
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });
      
      return result;
    } catch (_error) {
      logger.error('Formula validation error', { formula, error: error.message });
      throw error;
    }
  }

  /**
   * Execute formula with variables
   * @param {string|ASTNode} formula - Formula string or AST
   * @param {Object} variables - Variable values
   * @param {Object} options - Execution options
   * @returns {ExecutionResult}
   */
  execute(formula, variables = {}, options = {}) {
    try {
      const ast = typeof formula === 'string' ? this.parse(formula) : formula;
      
      // Validate before execution
      if (options.validate !== false) {
        const validationResult = this.validator.validate(ast, options);
        if (!validationResult.valid) {
          throw new FormulaValidationError(
            `Formula validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            { errors: validationResult.errors }
          );
        }
      }
      
      const result = this.executor.execute(ast, variables, options);
      
      logger.debug('Formula executed successfully', {
        value: result.value,
        executionTime: result.metadata.executionTime,
      });
      
      return result;
    } catch (_error) {
      logger.error('Formula execution error', {
        formula: typeof formula === 'string' ? formula : '[AST]',
        variables,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate formula (parse + validate + execute in one call)
   * @param {string} formula - Formula expression
   * @param {Object} variables - Variable values
   * @param {Object} options - Options
   * @returns {number} Calculated value
   */
  calculate(formula, variables = {}, options = {}) {
    const result = this.execute(formula, variables, options);
    return result.value;
  }

  /**
   * Convert AST to JSON (for database storage)
   * @param {ASTNode} ast 
   * @returns {Object}
   */
  astToJSON(ast) {
    return JSON.parse(JSON.stringify(ast));
  }

  /**
   * Convert JSON to AST (from database)
   * @param {Object} json 
   * @returns {ASTNode}
   */
  jsonToAST(json) {
    // Reconstruct AST nodes with proper prototypes
    return this._reconstructNode(json);
  }

  /**
   * Reconstruct node from JSON (internal)
   */
  _reconstructNode(json) {
    if (!json || !json.type) return null;

    const node = { ...json };

    // Recursively reconstruct child nodes
    if (node.left) node.left = this._reconstructNode(node.left);
    if (node.right) node.right = this._reconstructNode(node.right);
    if (node.operand) node.operand = this._reconstructNode(node.operand);
    if (node.condition) node.condition = this._reconstructNode(node.condition);
    if (node.thenBranch) node.thenBranch = this._reconstructNode(node.thenBranch);
    if (node.elseBranch) node.elseBranch = this._reconstructNode(node.elseBranch);
    if (node.args) node.args = node.args.map(arg => this._reconstructNode(arg));

    return node;
  }

  /**
   * Extract variables from formula
   * @param {string|ASTNode} formula 
   * @returns {string[]}
   */
  extractVariables(formula) {
    try {
      const ast = typeof formula === 'string' ? this.parse(formula) : formula;
      return this.validator.extractVariables(ast);
    } catch (_error) {
      logger.error('Error extracting variables', { formula, error: error.message });
      throw error;
    }
  }

  /**
   * Test formula with mock data
   * @param {string} formula 
   * @returns {Object} Test results with examples
   */
  test(formula) {
    try {
      const ast = this.parse(formula);
      const variables = this.extractVariables(ast);
      
      // Generate test cases
      const testCases = [
        { gross_pay: 1000, base_salary: 1000, hours_worked: 160, hourly_rate: 6.25 },
        { gross_pay: 5000, base_salary: 5000, hours_worked: 160, hourly_rate: 31.25 },
        { gross_pay: 10000, base_salary: 10000, hours_worked: 160, hourly_rate: 62.50 },
      ];

      const results = testCases.map(testVars => {
        try {
          const result = this.execute(ast, testVars, { validate: false });
          return {
            variables: testVars,
            result: result.value,
            success: true,
          };
        } catch (_error) {
          return {
            variables: testVars,
            error: error.message,
            success: false,
          };
        }
      });

      return {
        formula,
        variables,
        testCases: results,
        ast: this.astToJSON(ast),
      };
    } catch (_error) {
      return {
        formula,
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * Get formula statistics
   * @param {string|ASTNode} formula 
   * @returns {Object}
   */
  getStats(formula) {
    try {
      const ast = typeof formula === 'string' ? this.parse(formula) : formula;
      const variables = this.extractVariables(ast);
      const nodeCount = this.validator.countNodes(ast);

      return {
        variables,
        variableCount: variables.length,
        nodeCount,
        complexity: nodeCount > 50 ? 'high' : nodeCount > 20 ? 'medium' : 'low',
      };
    } catch (_error) {
      logger.error('Error getting formula stats', { formula, error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const formulaEngine = new FormulaEngine();

export default formulaEngine;
export {
  FormulaEngine,
  FormulaParser,
  FormulaValidator,
  FormulaExecutor,
  FormulaParseError,
  FormulaValidationError,
  FormulaExecutionError,
  DivisionByZeroError,
};
