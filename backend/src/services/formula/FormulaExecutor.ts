/**
 * Formula Executor - Executes validated AST with variables
 * 
 * Executes formula AST and returns calculated result
 * Supports all arithmetic, comparison, logical operations and functions
 */

import {
  NodeType,
  Functions,
  ExecutionResult,
  FormulaExecutionError,
  DivisionByZeroError,
} from './FormulaTypes.ts';

class FormulaExecutor {
  /**
   * Execute AST with given variables
   * @param {ASTNode} ast - Abstract Syntax Tree
   * @param {Object} variables - Variable values {gross_pay: 5000, hours: 160}
   * @param {Object} options - Execution options
   * @returns {ExecutionResult}
   */
  execute(ast, variables = {}, options = {}) {
    const startTime = Date.now();
    const usedVariables = new Set();
    
    try {
      const value = this.evaluateNode(ast, variables, options, usedVariables);
      const executionTime = Date.now() - startTime;

      return new ExecutionResult(value, {
        executionTime,
        variablesUsed: Array.from(usedVariables),
      });
    } catch (error) {
      if (error instanceof FormulaExecutionError) {
        throw error;
      }
      throw new FormulaExecutionError(error.message, { originalError: error });
    }
  }

  /**
   * Evaluate a single node
   */
  evaluateNode(node, variables, options, usedVariables = new Set()) {
    if (!node) {
      throw new FormulaExecutionError('Cannot evaluate null node');
    }

    switch (node.type) {
      case NodeType.LITERAL:
        return node.value;

      case NodeType.VARIABLE:
        return this.evaluateVariable(node, variables, usedVariables);

      case NodeType.ADD:
        return this.evaluateNode(node.left, variables, options, usedVariables) + 
               this.evaluateNode(node.right, variables, options, usedVariables);

      case NodeType.SUBTRACT:
        return this.evaluateNode(node.left, variables, options, usedVariables) - 
               this.evaluateNode(node.right, variables, options, usedVariables);

      case NodeType.MULTIPLY:
        return this.evaluateNode(node.left, variables, options, usedVariables) * 
               this.evaluateNode(node.right, variables, options, usedVariables);

      case NodeType.DIVIDE:
        return this.evaluateDivision(node, variables, options, usedVariables);

      case NodeType.MODULO:
        return this.evaluateModulo(node, variables, options, usedVariables);

      case NodeType.GREATER_THAN:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) > 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.LESS_THAN:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) < 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.EQUAL:
        return this.booleanToNumber(
          Math.abs(
            this.evaluateNode(node.left, variables, options, usedVariables) - 
            this.evaluateNode(node.right, variables, options, usedVariables)
          ) < 0.0001 // Float comparison with tolerance
        );

      case NodeType.NOT_EQUAL:
        return this.booleanToNumber(
          Math.abs(
            this.evaluateNode(node.left, variables, options, usedVariables) - 
            this.evaluateNode(node.right, variables, options, usedVariables)
          ) >= 0.0001
        );

      case NodeType.GREATER_OR_EQUAL:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) >= 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.LESS_OR_EQUAL:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) <= 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.AND:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) && 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.OR:
        return this.booleanToNumber(
          this.evaluateNode(node.left, variables, options, usedVariables) || 
          this.evaluateNode(node.right, variables, options, usedVariables)
        );

      case NodeType.NOT:
        return this.booleanToNumber(
          !this.evaluateNode(node.operand, variables, options, usedVariables)
        );

      case NodeType.CONDITIONAL:
        return this.evaluateConditional(node, variables, options, usedVariables);

      case NodeType.FUNCTION:
        return this.evaluateFunction(node, variables, options, usedVariables);

      default:
        throw new FormulaExecutionError(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Evaluate variable node
   */
  evaluateVariable(node, variables, usedVariables) {
    const value = variables[node.name];

    if (value === undefined || value === null) {
      throw new FormulaExecutionError(
        `Variable '${node.name}' is not defined`,
        { variable: node.name, availableVariables: Object.keys(variables) }
      );
    }

    if (typeof value !== 'number') {
      throw new FormulaExecutionError(
        `Variable '${node.name}' must be a number, got: ${typeof value}`,
        { variable: node.name, value, type: typeof value }
      );
    }

    if (!Number.isFinite(value)) {
      throw new FormulaExecutionError(
        `Variable '${node.name}' must be a finite number, got: ${value}`,
        { variable: node.name, value }
      );
    }

    usedVariables.add(node.name);
    return value;
  }

  /**
   * Evaluate division with zero check
   */
  evaluateDivision(node, variables, options, usedVariables) {
    const left = this.evaluateNode(node.left, variables, options, usedVariables);
    const right = this.evaluateNode(node.right, variables, options, usedVariables);

    if (right === 0) {
      if (options.divideByZeroValue !== undefined) {
        return options.divideByZeroValue;
      }
      throw new DivisionByZeroError();
    }

    return left / right;
  }

  /**
   * Evaluate modulo with zero check
   */
  evaluateModulo(node, variables, options, usedVariables) {
    const left = this.evaluateNode(node.left, variables, options, usedVariables);
    const right = this.evaluateNode(node.right, variables, options, usedVariables);

    if (right === 0) {
      throw new DivisionByZeroError();
    }

    return left % right;
  }

  /**
   * Evaluate conditional (IF/THEN/ELSE)
   */
  evaluateConditional(node, variables, options, usedVariables) {
    const condition = this.evaluateNode(node.condition, variables, options, usedVariables);
    
    if (condition) {
      return this.evaluateNode(node.thenBranch, variables, options, usedVariables);
    } else {
      return this.evaluateNode(node.elseBranch, variables, options, usedVariables);
    }
  }

  /**
   * Evaluate function call
   */
  evaluateFunction(node, variables, options, usedVariables) {
    const args = node.args.map(arg => this.evaluateNode(arg, variables, options, usedVariables));

    switch (node.name) {
      case Functions.MIN:
        return Math.min(...args);

      case Functions.MAX:
        return Math.max(...args);

      case Functions.ROUND:
        // ROUND(value, decimals)
        if (args.length === 1) {
          return Math.round(args[0]);
        } else {
          const multiplier = Math.pow(10, args[1]);
          return Math.round(args[0] * multiplier) / multiplier;
        }

      case Functions.FLOOR:
        return Math.floor(args[0]);

      case Functions.CEIL:
        return Math.ceil(args[0]);

      case Functions.ABS:
        return Math.abs(args[0]);

      case Functions.IF:
        // IF(condition, then_value, else_value)
        return args[0] ? args[1] : args[2];

      default:
        throw new FormulaExecutionError(`Unknown function: ${node.name}`);
    }
  }

  /**
   * Convert boolean result to number (for payroll calculations)
   * @param {boolean} value 
   * @returns {number}
   */
  booleanToNumber(value) {
    return value ? 1 : 0;
  }

  /**
   * Round result to specified decimal places
   * @param {number} value 
   * @param {number} decimals 
   * @returns {number}
   */
  roundResult(value, decimals = 2) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}

export default FormulaExecutor;
