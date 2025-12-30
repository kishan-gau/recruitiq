/**
 * Formula Parser - Converts formula strings to Abstract Syntax Tree
 * 
 * Supports:
 * - Arithmetic: +, -, *, /, %
 * - Comparisons: >, <, ==, !=, >=, <=
 * - Logical: AND, OR, NOT
 * - Functions: MIN, MAX, ROUND, IF
 * - Variables: gross_pay, hours_worked, etc.
 * - Conditionals: IF condition THEN value ELSE value
 * 
 * Grammar (simplified):
 * expression     → conditional
 * conditional    → IF comparison THEN expression ELSE expression | logical_or
 * logical_or     → logical_and ( OR logical_and )*
 * logical_and    → comparison ( AND comparison )*
 * comparison     → term ( (> | < | == | != | >= | <=) term )*
 * term           → factor ( (+ | -) factor )*
 * factor         → unary ( (* | / | %) unary )*
 * unary          → NOT unary | primary
 * primary        → NUMBER | VARIABLE | FUNCTION | ( expression )
 */

import {
  LiteralNode,
  VariableNode,
  BinaryOpNode,
  UnaryOpNode,
  ConditionalNode,
  FunctionNode,
  NodeType,
  Functions,
  Variables,
  FormulaParseError,
} from './FormulaTypes.js';

class FormulaParser {
  
  current: number;

  tokens: any;

constructor() {
    this.tokens = [];
    this.current = 0;
  }

  /**
   * Parse formula string into AST
   * @param {string} formula - Formula expression
   * @returns {ASTNode} - Root node of AST
   */
  parse(formula) {
    if (!formula || typeof formula !== 'string') {
      throw new FormulaParseError('Formula must be a non-empty string');
    }

    this.tokens = this.tokenize(formula);
    this.current = 0;

    if (this.tokens.length === 0) {
      throw new FormulaParseError('Formula is empty');
    }

    const ast = this.expression();

    if (!this.isAtEnd()) {
      throw new FormulaParseError(
        `Unexpected token '${this.peek().value}' after expression`,
        this.peek().position,
        this.peek().value
      );
    }

    return ast;
  }

  /**
   * Tokenize formula string
   */
  tokenize(formula) {
    const tokens = [];
    let i = 0;

    const patterns = {
      NUMBER: /^[0-9]+(\.[0-9]+)?/,
      VARIABLE: /^[a-z_][a-z0-9_]*/i,
      WHITESPACE: /^\s+/,
      OPERATOR: /^(\+|-|\*|\/|%|>=|<=|==|!=|>|<|\(|\)|,|\?|:)/,
    };

    while (i < formula.length) {
      const remaining = formula.slice(i);
      let matched = false;

      // Skip whitespace
      const whitespace = remaining.match(patterns.WHITESPACE);
      if (whitespace) {
        i += whitespace[0].length;
        continue;
      }

      // Match numbers
      const number = remaining.match(patterns.NUMBER);
      if (number) {
        tokens.push({ type: 'NUMBER', value: number[0], position: i });
        i += number[0].length;
        matched = true;
        continue;
      }

      // Match operators
      const operator = remaining.match(patterns.OPERATOR);
      if (operator) {
        tokens.push({ type: 'OPERATOR', value: operator[0], position: i });
        i += operator[0].length;
        matched = true;
        continue;
      }

      // Match variables and keywords
      const variable = remaining.match(patterns.VARIABLE);
      if (variable) {
        const value = variable[0].toUpperCase();
        
        // Special case: IF can be either a keyword or a function
        // Check if IF is followed by '(' to determine if it's a function call
        if (value === 'IF') {
          const nextPos = i + variable[0].length;
          // Skip whitespace to find next character
          let lookAhead = nextPos;
          while (lookAhead < formula.length && /\s/.test(formula[lookAhead])) {
            lookAhead++;
          }
          
          if (lookAhead < formula.length && formula[lookAhead] === '(') {
            // IF followed by '(' is a function call
            tokens.push({ type: 'FUNCTION', value, position: i });
          } else {
            // IF without '(' is a conditional keyword
            tokens.push({ type: 'KEYWORD', value, position: i });
          }
        }
        // Check if it's a keyword (excluding IF, handled above)
        else if (['THEN', 'ELSE', 'AND', 'OR', 'NOT'].includes(value)) {
          tokens.push({ type: 'KEYWORD', value, position: i });
        } else if (Object.values(Functions).includes(value)) {
          tokens.push({ type: 'FUNCTION', value, position: i });
        } else {
          // It's a variable - keep original case
          tokens.push({ type: 'VARIABLE', value: variable[0].toLowerCase(), position: i });
        }
        i += variable[0].length;
        matched = true;
        continue;
      }

      if (!matched) {
        throw new FormulaParseError(
          `Unexpected character '${formula[i]}'`,
          i,
          formula[i]
        );
      }
    }

    return tokens;
  }

  /**
   * Parse expression (top level)
   */
  expression() {
    return this.conditional();
  }

  /**
   * Parse conditional: IF condition THEN value ELSE value OR condition ? value : value
   */
  conditional() {
    if (this.match('KEYWORD', 'IF')) {
      const condition = this.logicalOr();
      
      if (!this.match('KEYWORD', 'THEN')) {
        throw new FormulaParseError('Expected THEN after IF condition', this.peek().position);
      }
      
      const thenBranch = this.expression();
      
      if (!this.match('KEYWORD', 'ELSE')) {
        throw new FormulaParseError('Expected ELSE after THEN branch', this.peek().position);
      }
      
      const elseBranch = this.expression();
      
      return new ConditionalNode(condition, thenBranch, elseBranch);
    }

    // Support ternary operator: condition ? thenBranch : elseBranch
    const expr = this.logicalOr();
    
    if (this.match('OPERATOR', '?')) {
      const thenBranch = this.expression();
      
      if (!this.match('OPERATOR', ':')) {
        throw new FormulaParseError('Expected : after ? in ternary operator', this.peek().position);
      }
      
      const elseBranch = this.conditional();
      
      return new ConditionalNode(expr, thenBranch, elseBranch);
    }

    return expr;
  }

  /**
   * Parse logical OR
   */
  logicalOr() {
    let left = this.logicalAnd();

    while (this.match('KEYWORD', 'OR')) {
      const right = this.logicalAnd();
      left = new BinaryOpNode(NodeType.OR, left, right);
    }

    return left;
  }

  /**
   * Parse logical AND
   */
  logicalAnd() {
    let left = this.comparison();

    while (this.match('KEYWORD', 'AND')) {
      const right = this.comparison();
      left = new BinaryOpNode(NodeType.AND, left, right);
    }

    return left;
  }

  /**
   * Parse comparison operators
   */
  comparison() {
    let left = this.term();

    const comparisons = {
      '>=': NodeType.GREATER_OR_EQUAL,
      '<=': NodeType.LESS_OR_EQUAL,
      '>': NodeType.GREATER_THAN,
      '<': NodeType.LESS_THAN,
      '==': NodeType.EQUAL,
      '!=': NodeType.NOT_EQUAL,
    };

    while (true) {
      let matched = false;
      for (const [op, nodeType] of Object.entries(comparisons)) {
        if (this.match('OPERATOR', op)) {
          const right = this.term();
          left = new BinaryOpNode(nodeType, left, right);
          matched = true;
          break;
        }
      }
      if (!matched) break;
    }

    return left;
  }

  /**
   * Parse addition and subtraction
   */
  term() {
    let left = this.factor();

    while (this.match('OPERATOR', '+') || this.match('OPERATOR', '-')) {
      const operator = this.previous().value;
      const right = this.factor();
      const nodeType = operator === '+' ? NodeType.ADD : NodeType.SUBTRACT;
      left = new BinaryOpNode(nodeType, left, right);
    }

    return left;
  }

  /**
   * Parse multiplication, division, modulo
   */
  factor() {
    let left = this.unary();

    while (this.match('OPERATOR', '*') || this.match('OPERATOR', '/') || this.match('OPERATOR', '%')) {
      const operator = this.previous().value;
      const right = this.unary();
      let nodeType;
      if (operator === '*') nodeType = NodeType.MULTIPLY;
      else if (operator === '/') nodeType = NodeType.DIVIDE;
      else nodeType = NodeType.MODULO;
      
      left = new BinaryOpNode(nodeType, left, right);
    }

    return left;
  }

  /**
   * Parse unary operators
   */
  unary() {
    if (this.match('KEYWORD', 'NOT')) {
      const operand = this.unary();
      return new UnaryOpNode(NodeType.NOT, operand);
    }

    if (this.match('OPERATOR', '-')) {
      const operand = this.unary();
      // Represent as 0 - operand
      return new BinaryOpNode(NodeType.SUBTRACT, new LiteralNode(0), operand);
    }

    return this.primary();
  }

  /**
   * Parse primary expressions
   */
  primary() {
    // Numbers
    if (this.check('NUMBER')) {
      const value = this.advance().value;
      return new LiteralNode(parseFloat(value));
    }

    // Variables
    if (this.check('VARIABLE')) {
      const name = this.advance().value;
      return new VariableNode(name);
    }

    // Functions
    if (this.check('FUNCTION')) {
      const name = this.advance().value;
      
      if (!this.match('OPERATOR', '(')) {
        throw new FormulaParseError(`Expected '(' after function ${name}`, this.peek().position);
      }

      const args = [];
      
      if (!this.check('OPERATOR', ')')) {
        do {
          args.push(this.expression());
        } while (this.match('OPERATOR', ','));
      }

      if (!this.match('OPERATOR', ')')) {
        throw new FormulaParseError(`Expected ')' after function arguments`, this.peek().position);
      }

      return new FunctionNode(name, args);
    }

    // Parenthesized expressions
    if (this.match('OPERATOR', '(')) {
      const expr = this.expression();
      if (!this.match('OPERATOR', ')')) {
        throw new FormulaParseError(`Expected ')' after expression`, this.peek().position);
      }
      return expr;
    }

    throw new FormulaParseError(
      `Unexpected token '${this.peek().value}'`,
      this.peek().position,
      this.peek().value
    );
  }

  /**
   * Helper methods
   */
  match(type, value = null) {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  check(type, value = null) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  isAtEnd() {
    return this.current >= this.tokens.length;
  }

  peek() {
    return this.tokens[this.current] || { type: 'EOF', value: '', position: -1 };
  }

  previous() {
    return this.tokens[this.current - 1];
  }
}

export default FormulaParser;
