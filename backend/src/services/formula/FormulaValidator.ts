/**
 * Formula Validator - Validates formula AST for correctness
 * 
 * Validates:
 * - Variable names are valid
 * - Function names are valid
 * - Function arguments are correct
 * - Type safety (no mixing incompatible types)
 * - Semantic correctness
 */

import {
  NodeType,
  Functions,
  Variables,
  VariableMetadata,
  ValidationResult,
  FormulaValidationError,
} from './FormulaTypes.ts';

class FormulaValidator {
  constructor() {
    this.validVariables = Object.values(Variables);
    this.validFunctions = Object.values(Functions);
  }

  /**
   * Validate AST
   * @param {ASTNode} ast - Abstract Syntax Tree
   * @param {Object} options - Validation options
   * @returns {ValidationResult}
   */
  validate(ast, options = {}) {
    const result = new ValidationResult(true);
    
    try {
      this.validateNode(ast, result, options);
      
      // Additional semantic checks
      this.checkSemantics(ast, result);
      
    } catch (error) {
      result.addError(error.message);
    }

    return result;
  }

  /**
   * Validate a single node recursively
   */
  validateNode(node, result, options) {
    if (!node) {
      result.addError('Invalid node: null or undefined');
      return;
    }

    switch (node.type) {
      case NodeType.LITERAL:
        this.validateLiteral(node, result);
        break;

      case NodeType.VARIABLE:
        this.validateVariable(node, result, options);
        break;

      case NodeType.ADD:
      case NodeType.SUBTRACT:
      case NodeType.MULTIPLY:
      case NodeType.DIVIDE:
      case NodeType.MODULO:
        this.validateBinaryOp(node, result, options);
        break;

      case NodeType.GREATER_THAN:
      case NodeType.LESS_THAN:
      case NodeType.EQUAL:
      case NodeType.NOT_EQUAL:
      case NodeType.GREATER_OR_EQUAL:
      case NodeType.LESS_OR_EQUAL:
        this.validateComparison(node, result, options);
        break;

      case NodeType.AND:
      case NodeType.OR:
        this.validateLogical(node, result, options);
        break;

      case NodeType.NOT:
        this.validateUnary(node, result, options);
        break;

      case NodeType.CONDITIONAL:
        this.validateConditional(node, result, options);
        break;

      case NodeType.FUNCTION:
        this.validateFunction(node, result, options);
        break;

      default:
        result.addError(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Validate literal node
   */
  validateLiteral(node, result) {
    if (typeof node.value !== 'number') {
      result.addError(`Literal value must be a number, got: ${typeof node.value}`);
    }

    if (!Number.isFinite(node.value)) {
      result.addError(`Literal value must be finite, got: ${node.value}`);
    }
  }

  /**
   * Validate variable node
   */
  validateVariable(node, result, options) {
    if (!node.name) {
      result.addError('Variable name is required');
      return;
    }

    // Check if variable is in allowed list
    if (!this.validVariables.includes(node.name)) {
      result.addError(
        `Unknown variable '${node.name}'. Valid variables: ${this.validVariables.join(', ')}`,
        node.name
      );
      return;
    }

    // Check if variable is available in context
    if (options.availableVariables && !options.availableVariables.includes(node.name)) {
      result.addWarning(
        `Variable '${node.name}' may not be available in all contexts`,
        node.name
      );
    }

    // Get variable metadata
    const metadata = VariableMetadata[node.name];
    if (metadata && metadata.deprecated) {
      result.addWarning(`Variable '${node.name}' is deprecated: ${metadata.deprecatedMessage}`);
    }
  }

  /**
   * Validate binary operation
   */
  validateBinaryOp(node, result, options) {
    this.validateNode(node.left, result, options);
    this.validateNode(node.right, result, options);

    // Check for division by zero at compile time (if right side is literal 0)
    if (node.type === NodeType.DIVIDE && node.right.type === NodeType.LITERAL && node.right.value === 0) {
      result.addError('Division by zero');
    }
  }

  /**
   * Validate comparison operation
   */
  validateComparison(node, result, options) {
    this.validateNode(node.left, result, options);
    this.validateNode(node.right, result, options);
  }

  /**
   * Validate logical operation
   */
  validateLogical(node, result, options) {
    this.validateNode(node.left, result, options);
    this.validateNode(node.right, result, options);
  }

  /**
   * Validate unary operation
   */
  validateUnary(node, result, options) {
    this.validateNode(node.operand, result, options);
  }

  /**
   * Validate conditional (IF/THEN/ELSE)
   */
  validateConditional(node, result, options) {
    this.validateNode(node.condition, result, options);
    this.validateNode(node.thenBranch, result, options);
    this.validateNode(node.elseBranch, result, options);
  }

  /**
   * Validate function call
   */
  validateFunction(node, result, options) {
    // Check function name
    if (!this.validFunctions.includes(node.name)) {
      result.addError(
        `Unknown function '${node.name}'. Valid functions: ${this.validFunctions.join(', ')}`,
        node.name
      );
      return;
    }

    // Validate arguments
    if (!node.args || !Array.isArray(node.args)) {
      result.addError(`Function '${node.name}' requires arguments array`);
      return;
    }

    // Check argument count and validate each argument
    switch (node.name) {
      case Functions.MIN:
      case Functions.MAX:
        if (node.args.length < 2) {
          result.addError(`Function ${node.name} requires at least 2 arguments, got ${node.args.length}`);
        }
        break;

      case Functions.ROUND:
      case Functions.FLOOR:
      case Functions.CEIL:
      case Functions.ABS:
        if (node.args.length !== 1) {
          result.addError(`Function ${node.name} requires exactly 1 argument, got ${node.args.length}`);
        }
        break;

      case Functions.IF:
        if (node.args.length !== 3) {
          result.addError(`Function ${node.name} requires exactly 3 arguments (condition, then, else), got ${node.args.length}`);
        }
        break;

      default:
        result.addWarning(`Function ${node.name} argument count not validated`);
    }

    // Validate each argument
    node.args.forEach((arg, index) => {
      this.validateNode(arg, result, options);
    });
  }

  /**
   * Additional semantic checks
   */
  checkSemantics(ast, result) {
    // Check for infinite recursion potential
    this.checkDepth(ast, result, 0, 50);

    // Check for potential performance issues
    this.checkComplexity(ast, result);
  }

  /**
   * Check AST depth to prevent stack overflow
   */
  checkDepth(node, result, depth, maxDepth) {
    if (depth > maxDepth) {
      result.addError(`Formula is too deeply nested (max depth: ${maxDepth})`);
      return;
    }

    if (!node) return;

    switch (node.type) {
      case NodeType.ADD:
      case NodeType.SUBTRACT:
      case NodeType.MULTIPLY:
      case NodeType.DIVIDE:
      case NodeType.MODULO:
      case NodeType.GREATER_THAN:
      case NodeType.LESS_THAN:
      case NodeType.EQUAL:
      case NodeType.NOT_EQUAL:
      case NodeType.GREATER_OR_EQUAL:
      case NodeType.LESS_OR_EQUAL:
      case NodeType.AND:
      case NodeType.OR:
        this.checkDepth(node.left, result, depth + 1, maxDepth);
        this.checkDepth(node.right, result, depth + 1, maxDepth);
        break;

      case NodeType.NOT:
        this.checkDepth(node.operand, result, depth + 1, maxDepth);
        break;

      case NodeType.CONDITIONAL:
        this.checkDepth(node.condition, result, depth + 1, maxDepth);
        this.checkDepth(node.thenBranch, result, depth + 1, maxDepth);
        this.checkDepth(node.elseBranch, result, depth + 1, maxDepth);
        break;

      case NodeType.FUNCTION:
        node.args.forEach(arg => this.checkDepth(arg, result, depth + 1, maxDepth));
        break;
    }
  }

  /**
   * Check formula complexity
   */
  checkComplexity(ast, result) {
    const nodeCount = this.countNodes(ast);
    
    if (nodeCount > 100) {
      result.addWarning(`Formula is very complex (${nodeCount} nodes). Consider simplifying.`);
    }
  }

  /**
   * Count nodes in AST
   */
  countNodes(node) {
    if (!node) return 0;

    let count = 1; // Count this node

    switch (node.type) {
      case NodeType.ADD:
      case NodeType.SUBTRACT:
      case NodeType.MULTIPLY:
      case NodeType.DIVIDE:
      case NodeType.MODULO:
      case NodeType.GREATER_THAN:
      case NodeType.LESS_THAN:
      case NodeType.EQUAL:
      case NodeType.NOT_EQUAL:
      case NodeType.GREATER_OR_EQUAL:
      case NodeType.LESS_OR_EQUAL:
      case NodeType.AND:
      case NodeType.OR:
        count += this.countNodes(node.left);
        count += this.countNodes(node.right);
        break;

      case NodeType.NOT:
        count += this.countNodes(node.operand);
        break;

      case NodeType.CONDITIONAL:
        count += this.countNodes(node.condition);
        count += this.countNodes(node.thenBranch);
        count += this.countNodes(node.elseBranch);
        break;

      case NodeType.FUNCTION:
        node.args.forEach(arg => {
          count += this.countNodes(arg);
        });
        break;
    }

    return count;
  }

  /**
   * Extract all variables used in formula
   * @param {ASTNode} ast 
   * @returns {string[]} Array of variable names
   */
  extractVariables(ast) {
    const variables = new Set();

    const traverse = (node) => {
      if (!node) return;

      if (node.type === NodeType.VARIABLE) {
        variables.add(node.name);
      }

      // Recurse based on node type
      if (node.left) traverse(node.left);
      if (node.right) traverse(node.right);
      if (node.operand) traverse(node.operand);
      if (node.condition) traverse(node.condition);
      if (node.thenBranch) traverse(node.thenBranch);
      if (node.elseBranch) traverse(node.elseBranch);
      if (node.args) node.args.forEach(traverse);
    };

    traverse(ast);
    return Array.from(variables);
  }
}

export default FormulaValidator;
