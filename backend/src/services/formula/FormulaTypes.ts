/**
 * Formula Engine Type Definitions
 * Type-safe models for formula parsing, validation, and execution
 */

/**
 * Supported formula node types in Abstract Syntax Tree
 */
export const NodeType = {
  // Literals
  LITERAL: 'literal',
  VARIABLE: 'variable',
  
  // Arithmetic operators
  ADD: 'add',
  SUBTRACT: 'subtract',
  MULTIPLY: 'multiply',
  DIVIDE: 'divide',
  MODULO: 'modulo',
  
  // Comparison operators
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  EQUAL: 'equal',
  NOT_EQUAL: 'not_equal',
  GREATER_OR_EQUAL: 'greater_or_equal',
  LESS_OR_EQUAL: 'less_or_equal',
  
  // Logical operators
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  
  // Control flow
  CONDITIONAL: 'conditional', // IF/THEN/ELSE
  
  // Functions
  FUNCTION: 'function',
};

/**
 * Available built-in functions
 */
export const Functions = {
  MIN: 'MIN',
  MAX: 'MAX',
  ROUND: 'ROUND',
  FLOOR: 'FLOOR',
  CEIL: 'CEIL',
  ABS: 'ABS',
  IF: 'IF',
};

/**
 * Available variables in payroll context
 */
export const Variables = {
  // Employee compensation
  BASE_SALARY: 'base_salary',
  GROSS_PAY: 'gross_pay',
  NET_PAY: 'net_pay',
  TAXABLE_INCOME: 'taxable_income',
  
  // Time tracking
  HOURS_WORKED: 'hours_worked',
  REGULAR_HOURS: 'regular_hours',
  OVERTIME_HOURS: 'overtime_hours',
  DAYS_WORKED: 'days_worked',
  
  // Rates
  HOURLY_RATE: 'hourly_rate',
  OVERTIME_RATE: 'overtime_rate',
  
  // Other pay components (can reference other components)
  TOTAL_EARNINGS: 'total_earnings',
  TOTAL_DEDUCTIONS: 'total_deductions',
};

/**
 * Variable metadata with validation rules
 */
export const VariableMetadata = {
  [Variables.BASE_SALARY]: {
    type: 'number',
    description: 'Employee base salary amount',
    min: 0,
    required: false,
  },
  [Variables.GROSS_PAY]: {
    type: 'number',
    description: 'Total earnings before deductions',
    min: 0,
    required: false,
  },
  [Variables.NET_PAY]: {
    type: 'number',
    description: 'Pay after all deductions',
    min: 0,
    required: false,
  },
  [Variables.TAXABLE_INCOME]: {
    type: 'number',
    description: 'Income subject to taxation',
    min: 0,
    required: false,
  },
  [Variables.HOURS_WORKED]: {
    type: 'number',
    description: 'Total hours worked in pay period',
    min: 0,
    max: 744, // Max hours in a month (31 days * 24 hours)
    required: false,
  },
  [Variables.REGULAR_HOURS]: {
    type: 'number',
    description: 'Regular work hours',
    min: 0,
    max: 744,
    required: false,
  },
  [Variables.OVERTIME_HOURS]: {
    type: 'number',
    description: 'Overtime hours beyond regular time',
    min: 0,
    max: 744,
    required: false,
  },
  [Variables.DAYS_WORKED]: {
    type: 'number',
    description: 'Number of working days',
    min: 0,
    max: 31,
    required: false,
  },
  [Variables.HOURLY_RATE]: {
    type: 'number',
    description: 'Standard hourly pay rate',
    min: 0,
    required: false,
  },
  [Variables.OVERTIME_RATE]: {
    type: 'number',
    description: 'Overtime hourly rate',
    min: 0,
    required: false,
  },
  [Variables.TOTAL_EARNINGS]: {
    type: 'number',
    description: 'Sum of all earning components',
    min: 0,
    required: false,
  },
  [Variables.TOTAL_DEDUCTIONS]: {
    type: 'number',
    description: 'Sum of all deduction components',
    min: 0,
    required: false,
  },
};

/**
 * Base AST Node interface
 */
export class ASTNode {
  
  type: any;

constructor(type) {
    this.type = type;
  }
}

/**
 * Literal value node (numbers)
 */
export class LiteralNode extends ASTNode {
  constructor(value) {
    super(NodeType.LITERAL);
    this.value = Number(value);
  }
}

/**
 * Variable reference node
 */
export class VariableNode extends ASTNode {
  constructor(name) {
    super(NodeType.VARIABLE);
    this.name = name;
  }
}

/**
 * Binary operation node (left operator right)
 */
export class BinaryOpNode extends ASTNode {
  constructor(type, left, right) {
    super(type);
    this.left = left;
    this.right = right;
  }
}

/**
 * Unary operation node (operator operand)
 */
export class UnaryOpNode extends ASTNode {
  constructor(type, operand) {
    super(type);
    this.operand = operand;
  }
}

/**
 * Conditional node (IF condition THEN thenBranch ELSE elseBranch)
 */
export class ConditionalNode extends ASTNode {
  constructor(condition, thenBranch, elseBranch) {
    super(NodeType.CONDITIONAL);
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }
}

/**
 * Function call node
 */
export class FunctionNode extends ASTNode {
  constructor(name, args) {
    super(NodeType.FUNCTION);
    this.name = name;
    this.args = args || [];
  }
}

/**
 * Formula validation error
 */
export class FormulaValidationError extends Error {
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'FormulaValidationError';
    this.details = details;
  }
}

/**
 * Formula execution error
 */
export class FormulaExecutionError extends Error {
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'FormulaExecutionError';
    this.details = details;
  }
}

/**
 * Formula parse error
 */
export class FormulaParseError extends Error {
  constructor(message, position = null, token = null) {
    super(message);
    this.name = 'FormulaParseError';
    this.position = position;
    this.token = token;
  }
}

/**
 * Division by zero error
 */
export class DivisionByZeroError extends FormulaExecutionError {
  constructor() {
    super('Division by zero is not allowed');
    this.name = 'DivisionByZeroError';
  }
}

/**
 * Formula execution result
 */
export interface ExecutionMetadata {
  executionTime?: number | null;
  variablesUsed?: string[];
  intermediateValues?: unknown[];
  [key: string]: unknown;
}

export class ExecutionResult {
  value: unknown;
  metadata: ExecutionMetadata;

  constructor(value: unknown, metadata: ExecutionMetadata = {}) {
    this.value = value;
    this.metadata = {
      executionTime: null,
      variablesUsed: [],
      intermediateValues: [],
      ...metadata,
    };
  }
}

/**
 * Formula validation result
 */
export class ValidationResult {
  constructor(valid, errors = [], warnings = []) {
    this.valid = valid;
    this.errors = errors;
    this.warnings = warnings;
  }

  addError(message, field = null) {
    this.errors.push({ message, field, type: 'error' });
    this.valid = false;
  }

  addWarning(message, field = null) {
    this.warnings.push({ message, field, type: 'warning' });
  }
}

export default {
  NodeType,
  Functions,
  Variables,
  VariableMetadata,
  ASTNode,
  LiteralNode,
  VariableNode,
  BinaryOpNode,
  UnaryOpNode,
  ConditionalNode,
  FunctionNode,
  FormulaValidationError,
  FormulaExecutionError,
  FormulaParseError,
  DivisionByZeroError,
  ExecutionResult,
  ValidationResult,
};
