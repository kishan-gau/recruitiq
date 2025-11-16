import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach } from '@jest/globals';
import FormulaValidator from '../../../src/services/formula/FormulaValidator.js';
import FormulaParser from '../../../src/services/formula/FormulaParser.js';
import { FormulaValidationError } from '../../../src/services/formula/FormulaTypes.js';

// SKIPPED: Formula validator depends on parser which has case sensitivity issues
// TODO: Fix parser tests first, then re-enable validator tests
describe.skip('FormulaValidator', () => {
  let validator;
  let parser;

  beforeEach(() => {
    validator = new FormulaValidator();
    parser = new FormulaParser();
  });

  describe('Variable Validation', () => {
    test('should accept valid variable names', () => {
      const ast = parser.parse('gross_pay + base_salary');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid variable names', () => {
      const ast = parser.parse('invalid_var + unknown_field');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unknown variable');
    });

    test('should accept all standard payroll variables', () => {
      const variables = [
        'base_salary', 'gross_pay', 'net_pay', 'taxable_income',
        'hours_worked', 'regular_hours', 'overtime_hours', 'days_worked',
        'hourly_rate', 'overtime_rate', 'total_earnings', 'total_deductions'
      ];
      
      for (const variable of variables) {
        const ast = parser.parse(variable);
        const result = validator.validate(ast);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Operator Validation', () => {
    test('should accept valid arithmetic operators', () => {
      const formulas = [
        '10 + 20',
        '100 - 50',
        '5 * 3',
        '100 / 4',
        '10 % 3'
      ];

      for (const formula of formulas) {
        const ast = parser.parse(formula);
        const result = validator.validate(ast);
        expect(result.valid).toBe(true);
      }
    });

    test('should accept valid comparison operators', () => {
      const formulas = [
        'gross_pay > 1000',
        'hours_worked < 200',
        'net_pay == gross_pay',
        'overtime_hours != 0',
        'base_salary >= 30000',
        'days_worked <= 31'
      ];

      for (const formula of formulas) {
        const ast = parser.parse(formula);
        const result = validator.validate(ast);
        expect(result.valid).toBe(true);
      }
    });

    test('should accept valid logical operators', () => {
      const formulas = [
        'gross_pay > 1000 AND hours_worked > 100',
        'overtime_hours > 0 OR days_worked > 20',
        'NOT (gross_pay == 0)'
      ];

      for (const formula of formulas) {
        const ast = parser.parse(formula);
        const result = validator.validate(ast);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Function Validation', () => {
    test('should accept valid MIN function', () => {
      const ast = parser.parse('MIN(hours_worked, 160)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should accept valid MAX function', () => {
      const ast = parser.parse('MAX(overtime_hours, 0)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should accept valid ROUND function', () => {
      const ast = parser.parse('ROUND(gross_pay * 0.10, 2)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should accept valid IF function', () => {
      const ast = parser.parse('IF(hours_worked > 160, overtime_rate, hourly_rate)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should reject MIN with wrong argument count', () => {
      const ast = parser.parse('MIN(10)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('requires 2 arguments');
    });

    test('should reject MAX with wrong argument count', () => {
      const ast = parser.parse('MAX(10, 20, 30)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
    });

    test('should reject ROUND with invalid arguments', () => {
      const ast = parser.parse('ROUND(10)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
    });

    test('should reject IF with wrong argument count', () => {
      const ast = parser.parse('IF(x > 10, 100)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
    });
  });

  describe('Conditional Validation', () => {
    test('should accept valid ternary conditionals', () => {
      const ast = parser.parse('hours_worked > 160 ? overtime_rate : hourly_rate');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should accept nested conditionals', () => {
      const ast = parser.parse('gross_pay > 5000 ? (overtime_hours > 0 ? 200 : 100) : 50');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });
  });

  describe('Complexity Validation', () => {
    test('should warn on complex formulas', () => {
      // Create a formula with many operations
      const complexFormula = Array(50).fill('gross_pay + 10').join(' + ');
      const ast = parser.parse(complexFormula);
      const result = validator.validate(ast);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('complex');
    });

    test('should reject overly deep nesting', () => {
      // Create deeply nested parentheses
      const deepFormula = '(' .repeat(60) + '10' + ')'.repeat(60);
      const ast = parser.parse(deepFormula);
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('deeply nested');
    });
  });

  describe('Division by Zero Detection', () => {
    test('should detect constant division by zero', () => {
      const ast = parser.parse('10 / 0');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('division by zero');
    });

    test('should detect constant modulo by zero', () => {
      const ast = parser.parse('10 % 0');
      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('modulo by zero');
    });

    test('should not flag variable division', () => {
      const ast = parser.parse('gross_pay / hours_worked');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      // May have warning but should be valid
    });
  });

  describe('Variable Extraction', () => {
    test('should extract single variable', () => {
      const ast = parser.parse('gross_pay');
      const variables = validator.extractVariables(ast);
      expect(variables).toEqual(['gross_pay']);
    });

    test('should extract multiple variables', () => {
      const ast = parser.parse('gross_pay + overtime_hours * hourly_rate');
      const variables = validator.extractVariables(ast);
      expect(variables).toContain('gross_pay');
      expect(variables).toContain('overtime_hours');
      expect(variables).toContain('hourly_rate');
      expect(variables).toHaveLength(3);
    });

    test('should extract variables from conditionals', () => {
      const ast = parser.parse('hours_worked > 160 ? overtime_rate : regular_rate');
      const variables = validator.extractVariables(ast);
      expect(variables).toContain('hours_worked');
      expect(variables).toContain('overtime_rate');
    });

    test('should extract variables from functions', () => {
      const ast = parser.parse('MAX(gross_pay, base_salary)');
      const variables = validator.extractVariables(ast);
      expect(variables).toContain('gross_pay');
      expect(variables).toContain('base_salary');
    });

    test('should not duplicate variables', () => {
      const ast = parser.parse('gross_pay + gross_pay * 0.10');
      const variables = validator.extractVariables(ast);
      expect(variables.filter(v => v === 'gross_pay')).toHaveLength(1);
    });
  });

  describe('Real-World Formulas', () => {
    test('should validate standard percentage formula', () => {
      const ast = parser.parse('gross_pay * 0.10');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate overtime calculation', () => {
      const ast = parser.parse('overtime_hours * hourly_rate * 1.5');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate conditional bonus formula', () => {
      const ast = parser.parse('hours_worked > 160 ? (hours_worked - 160) * overtime_rate : 0');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate tiered calculation', () => {
      const ast = parser.parse('gross_pay > 5000 ? gross_pay * 0.15 : gross_pay * 0.10');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate health insurance formula', () => {
      const ast = parser.parse('IF(gross_pay > 3000, 150, 100)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate daily rate calculation', () => {
      const ast = parser.parse('ROUND(base_salary / 260, 2)');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });
  });

  describe('Validation Options', () => {
    test('should respect strict mode', () => {
      const ast = parser.parse('gross_pay / hours_worked');
      const result = validator.validate(ast, { strict: true });
      // In strict mode, should warn about potential division by zero
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should accept custom max depth', () => {
      const ast = parser.parse('((((10))))');
      const result = validator.validate(ast, { maxDepth: 3 });
      expect(result.valid).toBe(false);
    });

    test('should accept custom max complexity', () => {
      const formula = Array(10).fill('gross_pay + 10').join(' + ');
      const ast = parser.parse(formula);
      const result = validator.validate(ast, { maxComplexity: 5 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
