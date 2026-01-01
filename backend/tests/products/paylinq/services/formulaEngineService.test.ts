/**
 * FormulaEngineService Unit Tests
 * 
 * Tests for formula parsing, validation, variable substitution, and evaluation.
 * Covers security validation, arithmetic operations, and error handling.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards (docs/TESTING_STANDARDS.md)
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Dependency injection pattern
 * - Arrange-Act-Assert structure
 * - EXACT method names from service (verified against source)
 * 
 * VERIFIED METHODS (from grep analysis):
 * 1. evaluateFormula(formula, variables = {})
 * 2. parseFormula(formula) - async
 * 3. validateFormula(formula)
 * 4. substituteVariables(formula, variables)
 * 5. evaluateExpression(expression)
 * 6. testFormula(formula, sampleVariables)
 * 7. getFormulaTemplates()
 * 8. extractVariables(formula)
 * 9. validateVariables(variables, requiredVariables)
 * 10. formatFormula(formula)
 * 11. calculateSafe(formula, variables, context)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import FormulaEngineService from '../../../../src/products/paylinq/services/formulaEngineService.js';

describe('FormulaEngineService', () => {
  let service;

  beforeEach(() => {
    // Setup: Create fresh service instance for each test
    service = new FormulaEngineService();
  });

  // ==================== evaluateFormula ====================

  describe('evaluateFormula', () => {
    it('should evaluate simple addition formula', () => {
      // Arrange: Simple addition with variables
      const formula = '{a} + {b}';
      const variables = { a: 10, b: 20 };

      // Act: Evaluate formula
      const result = service.evaluateFormula(formula, variables);

      // Assert: Correct result
      expect(result).toBe(30);
    });

    it('should evaluate multiplication formula', () => {
      // Arrange: Hourly pay calculation
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      // Act: Evaluate formula
      const result = service.evaluateFormula(formula, variables);

      // Assert: Correct hourly pay
      expect(result).toBe(1000);
    });

    it('should evaluate complex formula with parentheses', () => {
      // Arrange: Overtime calculation
      const formula = '({hours} * {rate}) + ({overtimeHours} * {rate} * 1.5)';
      const variables = { hours: 40, rate: 25, overtimeHours: 5 };

      // Act: Evaluate formula
      const result = service.evaluateFormula(formula, variables);

      // Assert: Correct total with overtime
      expect(result).toBe(1187.5); // 1000 + 187.5
    });

    it('should evaluate division formula', () => {
      // Arrange: Average calculation
      const formula = '{total} / {count}';
      const variables = { total: 100, count: 4 };

      // Act: Evaluate formula
      const result = service.evaluateFormula(formula, variables);

      // Assert: Correct average
      expect(result).toBe(25);
    });

    it('should evaluate subtraction formula', () => {
      // Arrange: Net pay calculation
      const formula = '{gross} - {deduction}';
      const variables = { gross: 5000, deduction: 500 };

      // Act: Evaluate formula
      const result = service.evaluateFormula(formula, variables);

      // Assert: Correct net pay
      expect(result).toBe(4500);
    });

    it('should throw error for undefined variable', () => {
      // Arrange: Formula with missing variable
      const formula = '{a} + {b}';
      const variables = { a: 10 }; // Missing 'b'

      // Act & Assert: Should throw error
      expect(() => {
        service.evaluateFormula(formula, variables);
      }).toThrow("Variable 'b' is not defined");
    });

    it('should throw error for null variable', () => {
      // Arrange: Formula with null variable
      const formula = '{a} + {b}';
      const variables = { a: 10, b: null };

      // Act & Assert: Should throw error
      expect(() => {
        service.evaluateFormula(formula, variables);
      }).toThrow("Variable 'b' is not defined");
    });

    it('should throw error for non-numeric variable', () => {
      // Arrange: Formula with invalid variable
      const formula = '{a} + {b}';
      const variables = { a: 10, b: 'invalid' };

      // Act & Assert: Should throw error
      expect(() => {
        service.evaluateFormula(formula, variables);
      }).toThrow("Variable 'b' has invalid numeric value");
    });

    it('should throw error for invalid formula syntax', () => {
      // Arrange: Invalid formula
      const formula = '{a} ++';

      // Act & Assert: Should throw error
      expect(() => {
        service.evaluateFormula(formula, { a: 10 });
      }).toThrow('consecutive operators');
    });
  });

  // ==================== parseFormula ====================

  describe('parseFormula', () => {
    it('should parse simple expression and auto-wrap with return', async () => {
      // Arrange: Simple expression
      const formula = 'amount * 0.05';

      // Act: Parse formula
      const result = await service.parseFormula(formula);

      // Assert: Valid with auto-wrapped return
      expect(result.isValid).toBe(true);
      expect(result.formula).toContain('return');
      expect(result.variables).toContain('amount');
      expect(result.type).toBe('javascript');
    });

    it('should parse formula with explicit return', async () => {
      // Arrange: Formula with return
      const formula = 'return amount * 0.05;';

      // Act: Parse formula
      const result = await service.parseFormula(formula);

      // Assert: Valid as-is
      expect(result.isValid).toBe(true);
      expect(result.formula).toBe(formula);
      expect(result.variables).toContain('amount');
    });

    it('should detect conditionals in formula', async () => {
      // Arrange: Formula with if statement
      const formula = 'if (amount > 1000) return amount * 0.05; else return amount * 0.03;';

      // Act: Parse formula
      const result = await service.parseFormula(formula);

      // Assert: Detects conditional
      expect(result.isValid).toBe(true);
      expect(result.hasConditionals).toBe(true);
      expect(result.hasLoops).toBe(false);
    });

    it('should detect loops in formula', async () => {
      // Arrange: Formula with for loop (no let declarations to avoid duplicate variable errors)
      const formula = 'sum = 0; for (i = 0; i < count; i++) { sum += amount; } return sum;';

      // Act: Parse formula
      const result = await service.parseFormula(formula);

      // Assert: Detects loop
      expect(result.isValid).toBe(true);
      expect(result.hasLoops).toBe(true);
    });

    it('should reject formula with eval', async () => {
      // Arrange: Dangerous formula with eval
      const formula = 'eval("malicious code")';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('forbidden patterns');
    });

    it('should reject formula with Function constructor', async () => {
      // Arrange: Dangerous formula with Function
      const formula = 'Function("return 1")()';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('forbidden patterns');
    });

    it('should reject formula with require', async () => {
      // Arrange: Dangerous formula with require
      const formula = 'require("fs")';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('forbidden patterns');
    });

    it('should reject formula with process', async () => {
      // Arrange: Dangerous formula with process
      const formula = 'process.exit()';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('forbidden patterns');
    });

    it('should reject formula with unbalanced braces', async () => {
      // Arrange: Formula with unbalanced braces
      const formula = 'if (x > 0) { return x;';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('Unbalanced braces');
    });

    it('should reject formula with unbalanced parentheses', async () => {
      // Arrange: Formula with unbalanced parentheses
      const formula = '((x + y) * z';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('Unbalanced parentheses');
    });

    it('should throw error for empty formula', async () => {
      // Arrange: Empty formula
      const formula = '';

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('must be a non-empty string');
    });

    it('should throw error for non-string formula', async () => {
      // Arrange: Non-string formula
      const formula = 123;

      // Act & Assert: Should reject
      await expect(service.parseFormula(formula)).rejects.toThrow('must be a non-empty string');
    });

    it('should extract all variables from formula', async () => {
      // Arrange: Formula with multiple variables
      const formula = 'base + bonus + commission';

      // Act: Parse formula
      const result = await service.parseFormula(formula);

      // Assert: All variables extracted
      expect(result.variables).toContain('base');
      expect(result.variables).toContain('bonus');
      expect(result.variables).toContain('commission');
      expect(result.variables.length).toBe(3);
    });

    it('should reject complex formula without return statement', async () => {
      // Arrange: Complex formula (has semicolon but no return)
      const formula = 'let x = 5; x + y';

      // Act & Assert: Should reject complex formula without return
      await expect(service.parseFormula(formula)).rejects.toThrow(
        'Complex formulas must contain a return statement'
      );
    });

    it('should reject formula with severe syntax errors', async () => {
      // Arrange: Formula with clear syntax error (incomplete function call)
      const formula = 'return Math.ceil(;';

      // Act & Assert: Should reject with syntax error
      await expect(service.parseFormula(formula)).rejects.toThrow('Syntax error');
    });
  });

  // ==================== validateFormula ====================

  describe('validateFormula', () => {
    it('should validate correct formula', () => {
      // Arrange: Valid formula
      const formula = '{a} + {b} * {c}';

      // Act & Assert: Should not throw
      expect(() => service.validateFormula(formula)).not.toThrow();
    });

    it('should reject formula with unbalanced parentheses', () => {
      // Arrange: Unbalanced parentheses
      const formula = '({a} + {b}';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('Unbalanced parentheses');
    });

    it('should reject formula starting with operator', () => {
      // Arrange: Formula starting with operator
      const formula = '+ {a} + {b}';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('cannot start or end with an operator');
    });

    it('should reject formula ending with operator', () => {
      // Arrange: Formula ending with operator
      const formula = '{a} + {b} *';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('cannot start or end with an operator');
    });

    it('should reject formula with consecutive operators', () => {
      // Arrange: Consecutive operators
      const formula = '{a} ++ {b}';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('consecutive operators');
    });

    it('should reject empty formula', () => {
      // Arrange: Empty formula
      const formula = '';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('must be a non-empty string');
    });

    it('should reject non-string formula', () => {
      // Arrange: Non-string formula
      const formula = null;

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('must be a non-empty string');
    });

    it('should accept formula with parentheses', () => {
      // Arrange: Formula with nested parentheses
      const formula = '({a} + {b}) * ({c} + {d})';

      // Act & Assert: Should not throw
      expect(() => service.validateFormula(formula)).not.toThrow();
    });

    it('should reject formula with unbalanced braces in the middle', () => {
      // Arrange: Unbalanced braces
      const formula = '{a + b';

      // Act & Assert: Should throw
      expect(() => service.validateFormula(formula)).toThrow('Unbalanced');
    });

    it('should reject formula with more closing than opening braces', () => {
      // Arrange: More closing braces than opening (caught later)
      const formula = 'a} + b}';

      // Act & Assert: Should throw about unbalanced braces or parentheses
      expect(() => service.validateFormula(formula)).toThrow();
    });

    it('should reject formula with more closing than opening parens', () => {
      // Arrange: More closing parens than opening
      const formula = 'a) + b)';

      // Act & Assert: Should throw about unbalanced parentheses
      expect(() => service.validateFormula(formula)).toThrow('Unbalanced');
    });
  });

  // ==================== substituteVariables ====================

  describe('substituteVariables', () => {
    it('should substitute single variable', () => {
      // Arrange: Formula with one variable
      const formula = '{x} * 2';
      const variables = { x: 10 };

      // Act: Substitute variables
      const result = service.substituteVariables(formula, variables);

      // Assert: Variable replaced
      expect(result).toBe('10 * 2');
    });

    it('should substitute multiple variables', () => {
      // Arrange: Formula with multiple variables
      const formula = '{a} + {b} * {c}';
      const variables = { a: 5, b: 10, c: 2 };

      // Act: Substitute variables
      const result = service.substituteVariables(formula, variables);

      // Assert: All variables replaced
      expect(result).toBe('5 + 10 * 2');
    });

    it('should substitute same variable multiple times', () => {
      // Arrange: Formula with repeated variable
      const formula = '{x} * {x} + {x}';
      const variables = { x: 3 };

      // Act: Substitute variables
      const result = service.substituteVariables(formula, variables);

      // Assert: All occurrences replaced
      expect(result).toBe('3 * 3 + 3');
    });

    it('should handle decimal values', () => {
      // Arrange: Formula with decimal variable
      const formula = '{rate} * {hours}';
      const variables = { rate: 25.5, hours: 8 };

      // Act: Substitute variables
      const result = service.substituteVariables(formula, variables);

      // Assert: Decimals preserved
      expect(result).toBe('25.5 * 8');
    });

    it('should throw error for undefined variable', () => {
      // Arrange: Formula with undefined variable
      const formula = '{x} + {y}';
      const variables = { x: 10 };

      // Act & Assert: Should throw
      expect(() => service.substituteVariables(formula, variables)).toThrow("Variable 'y' is not defined");
    });

    it('should throw error for null variable', () => {
      // Arrange: Formula with null variable
      const formula = '{x} + {y}';
      const variables = { x: 10, y: null };

      // Act & Assert: Should throw
      expect(() => service.substituteVariables(formula, variables)).toThrow("Variable 'y' is not defined");
    });

    it('should throw error for non-numeric variable', () => {
      // Arrange: Formula with non-numeric variable
      const formula = '{x} + {y}';
      const variables = { x: 10, y: 'text' };

      // Act & Assert: Should throw
      expect(() => service.substituteVariables(formula, variables)).toThrow("Variable 'y' has invalid numeric value");
    });
  });

  // ==================== evaluateExpression ====================

  describe('evaluateExpression', () => {
    it('should evaluate simple addition', () => {
      // Arrange: Simple addition expression
      const expression = '5 + 3';

      // Act: Evaluate expression
      const result = service.evaluateExpression(expression);

      // Assert: Correct result
      expect(result).toBe(8);
    });

    it('should evaluate expression with parentheses', () => {
      // Arrange: Expression with operator precedence
      const expression = '(5 + 3) * 2';

      // Act: Evaluate expression
      const result = service.evaluateExpression(expression);

      // Assert: Correct result with precedence
      expect(result).toBe(16);
    });

    it('should evaluate complex expression', () => {
      // Arrange: Complex arithmetic
      const expression = '(10 + 5) * 2 - 8 / 4';

      // Act: Evaluate expression
      const result = service.evaluateExpression(expression);

      // Assert: Correct result
      expect(result).toBe(28); // 15 * 2 - 2 = 30 - 2 = 28
    });

    it('should evaluate decimal calculations', () => {
      // Arrange: Decimal expression
      const expression = '10.5 * 2.5';

      // Act: Evaluate expression
      const result = service.evaluateExpression(expression);

      // Assert: Correct decimal result
      expect(result).toBe(26.25);
    });

    it('should throw error for unsubstituted variables', () => {
      // Arrange: Expression with variable placeholders
      const expression = '{x} + 5';

      // Act & Assert: Should throw
      expect(() => service.evaluateExpression(expression)).toThrow('Unsubstituted variables');
    });

    it('should throw error for invalid characters', () => {
      // Arrange: Expression with invalid characters
      const expression = '5 + x';

      // Act & Assert: Should throw
      expect(() => service.evaluateExpression(expression)).toThrow('invalid characters');
    });

    it('should handle negative numbers', () => {
      // Arrange: Expression with negative number
      const expression = '5 + (-3)';

      // Act: Evaluate expression
      const result = service.evaluateExpression(expression);

      // Assert: Correct result with negative
      expect(result).toBe(2);
    });
  });

  // ==================== testFormula ====================

  describe('testFormula', () => {
    it('should return success for valid formula', () => {
      // Arrange: Valid formula with sample variables
      const formula = '{hours} * {rate}';
      const sampleVariables = { hours: 40, rate: 25 };

      // Act: Test formula
      const result = service.testFormula(formula, sampleVariables);

      // Assert: Success result
      expect(result.success).toBe(true);
      expect(result.result).toBe(1000);
      expect(result.message).toContain('valid');
    });

    it('should return failure for invalid formula', () => {
      // Arrange: Invalid formula
      const formula = '{x} ++';
      const sampleVariables = { x: 10 };

      // Act: Test formula
      const result = service.testFormula(formula, sampleVariables);

      // Assert: Failure result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('failed');
    });

    it('should return failure for missing variable', () => {
      // Arrange: Formula with missing variable
      const formula = '{x} + {y}';
      const sampleVariables = { x: 10 };

      // Act: Test formula
      const result = service.testFormula(formula, sampleVariables);

      // Assert: Failure result
      expect(result.success).toBe(false);
      expect(result.error).toContain('not defined');
    });
  });

  // ==================== getFormulaTemplates ====================

  describe('getFormulaTemplates', () => {
    it('should return array of formula templates', () => {
      // Act: Get templates
      const templates = service.getFormulaTemplates();

      // Assert: Returns templates array
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return templates with required properties', () => {
      // Act: Get templates
      const templates = service.getFormulaTemplates();

      // Assert: Each template has required fields
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('formula');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('variables');
        expect(template).toHaveProperty('example');
      });
    });

    it('should include hourly pay template', () => {
      // Act: Get templates
      const templates = service.getFormulaTemplates();

      // Assert: Contains hourly pay template
      const hourlyPay = templates.find(t => t.name === 'Hourly Pay');
      expect(hourlyPay).toBeDefined();
      expect(hourlyPay.formula).toBe('{hours} * {rate}');
    });

    it('should include overtime pay template', () => {
      // Act: Get templates
      const templates = service.getFormulaTemplates();

      // Assert: Contains overtime template
      const overtime = templates.find(t => t.name === 'Overtime Pay');
      expect(overtime).toBeDefined();
      expect(overtime.formula).toContain('1.5');
    });
  });

  // ==================== extractVariables ====================

  describe('extractVariables', () => {
    it('should extract single variable', () => {
      // Arrange: Formula with one variable
      const formula = '{x} * 2';

      // Act: Extract variables
      const variables = service.extractVariables(formula);

      // Assert: Single variable extracted
      expect(variables).toEqual(['x']);
    });

    it('should extract multiple variables', () => {
      // Arrange: Formula with multiple variables
      const formula = '{a} + {b} * {c}';

      // Act: Extract variables
      const variables = service.extractVariables(formula);

      // Assert: All variables extracted
      expect(variables).toContain('a');
      expect(variables).toContain('b');
      expect(variables).toContain('c');
      expect(variables.length).toBe(3);
    });

    it('should extract unique variables only', () => {
      // Arrange: Formula with repeated variable
      const formula = '{x} + {x} * {x}';

      // Act: Extract variables
      const variables = service.extractVariables(formula);

      // Assert: Only unique variables
      expect(variables).toEqual(['x']);
    });

    it('should return empty array for formula without variables', () => {
      // Arrange: Formula without variables
      const formula = '10 + 20';

      // Act: Extract variables
      const variables = service.extractVariables(formula);

      // Assert: Empty array
      expect(variables).toEqual([]);
    });
  });

  // ==================== validateVariables ====================

  describe('validateVariables', () => {
    it('should validate all required variables present', () => {
      // Arrange: Variables and requirements
      const variables = { hours: 40, rate: 25 };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should not throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).not.toThrow();
    });

    it('should throw error for missing variable', () => {
      // Arrange: Missing variable
      const variables = { hours: 40 };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).toThrow("Required variable 'rate' is missing");
    });

    it('should throw error for null variable', () => {
      // Arrange: Null variable
      const variables = { hours: 40, rate: null };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).toThrow("Variable 'rate' has null or undefined value");
    });

    it('should throw error for undefined variable', () => {
      // Arrange: Undefined variable
      const variables = { hours: 40, rate: undefined };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).toThrow("Variable 'rate' has null or undefined value");
    });

    it('should throw error for non-numeric variable', () => {
      // Arrange: Non-numeric variable
      const variables = { hours: 40, rate: 'invalid' };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).toThrow("Variable 'rate' is not a valid number");
    });

    it('should accept string numbers', () => {
      // Arrange: String numbers that can be parsed
      const variables = { hours: '40', rate: '25' };
      const requiredVariables = ['hours', 'rate'];

      // Act & Assert: Should not throw
      expect(() => {
        service.validateVariables(variables, requiredVariables);
      }).not.toThrow();
    });
  });

  // ==================== formatFormula ====================

  describe('formatFormula', () => {
    it('should add spaces around operators', () => {
      // Arrange: Compact formula
      const formula = '{a}+{b}*{c}';

      // Act: Format formula
      const result = service.formatFormula(formula);

      // Assert: Spaces added
      expect(result).toContain(' + ');
      expect(result).toContain(' * ');
    });

    it('should format complex formula', () => {
      // Arrange: Complex formula
      const formula = '({a}+{b})*({c}-{d})/{e}';

      // Act: Format formula
      const result = service.formatFormula(formula);

      // Assert: Well formatted
      expect(result).toContain(' + ');
      expect(result).toContain(' * ');
      expect(result).toContain(' - ');
      expect(result).toContain(' / ');
    });

    it('should remove extra spaces', () => {
      // Arrange: Formula with extra spaces
      const formula = '{a}  +  {b}';

      // Act: Format formula
      const result = service.formatFormula(formula);

      // Assert: Single spaces only
      expect(result).not.toContain('  ');
    });
  });

  // ==================== calculateSafe ====================

  describe('calculateSafe', () => {
    it('should calculate with valid inputs', () => {
      // Arrange: Valid formula and variables
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      // Act: Calculate safely
      const result = service.calculateSafe(formula, variables, 'test');

      // Assert: Correct result
      expect(result).toBe(1000);
    });

    it('should return 0 for missing variables', () => {
      // Arrange: Missing variable
      const formula = '{hours} * {rate}';
      const variables = { hours: 40 };

      // Act: Calculate safely (should not throw)
      const result = service.calculateSafe(formula, variables, 'test');

      // Assert: Returns 0 on error
      expect(result).toBe(0);
    });

    it('should return 0 for invalid formula', () => {
      // Arrange: Invalid formula
      const formula = '{x} ++';
      const variables = { x: 10 };

      // Act: Calculate safely (should not throw)
      const result = service.calculateSafe(formula, variables, 'test');

      // Assert: Returns 0 on error
      expect(result).toBe(0);
    });

    it('should handle context parameter', () => {
      // Arrange: Valid inputs with context
      const formula = '{amount} * 0.05';
      const variables = { amount: 1000 };

      // Act: Calculate with context
      const result = service.calculateSafe(formula, variables, 'commission');

      // Assert: Calculates successfully
      expect(result).toBe(50);
    });

    it('should use default context when not provided', () => {
      // Arrange: Valid inputs without context
      const formula = '{amount} * 0.05';
      const variables = { amount: 1000 };

      // Act: Calculate without context
      const result = service.calculateSafe(formula, variables);

      // Assert: Calculates successfully
      expect(result).toBe(50);
    });
  });
});
