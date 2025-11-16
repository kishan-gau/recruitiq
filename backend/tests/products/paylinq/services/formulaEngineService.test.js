/**
 * FormulaEngineService Test Suite
 * 
 * VERIFIED METHODS (grep "async \w+\|^\s+\w+\(" formulaEngineService.js):
 * - evaluateFormula(formula, variables = {})
 * - validateFormula(formula)
 * - substituteVariables(formula, variables)
 * - evaluateExpression(expression)
 * - testFormula(formula, sampleVariables)
 * - getFormulaTemplates()
 * - extractVariables(formula)
 * - validateVariables(variables, requiredVariables)
 * - formatFormula(formula)
 * - calculateSafe(formula, variables, context = 'unknown')
 * 
 * Export Pattern: Class (no DI needed - pure logic service)
 * Uses DTO: No
 * Dependencies: expr-eval Parser library
 * Security Critical: YES - prevents code injection
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import FormulaEngineService from '../../../../src/products/paylinq/services/formulaEngineService.js';

describe('FormulaEngineService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FormulaEngineService();
  });

  describe('constructor', () => {
    it('should initialize with allowed operators', () => {
      expect(service.allowedOperators).toBeDefined();
      expect(service.allowedOperators).toContain('+');
      expect(service.allowedOperators).toContain('-');
      expect(service.allowedOperators).toContain('*');
      expect(service.allowedOperators).toContain('/');
    });
  });

  describe('evaluateFormula', () => {
    it('should evaluate simple addition formula', () => {
      const formula = '{a} + {b}';
      const variables = { a: 10, b: 20 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(30);
    });

    it('should evaluate subtraction formula', () => {
      const formula = '{gross} - {deduction}';
      const variables = { gross: 5000, deduction: 500 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(4500);
    });

    it('should evaluate multiplication formula', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(1000);
    });

    it('should evaluate division formula', () => {
      const formula = '{total} / {count}';
      const variables = { total: 1000, count: 4 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(250);
    });

    it('should evaluate complex formula with multiple operators', () => {
      const formula = '({hours} * {rate}) + {bonus}';
      const variables = { hours: 40, rate: 25, bonus: 500 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(1500);
    });

    it('should evaluate formula with nested parentheses', () => {
      const formula = '(({a} + {b}) * {c}) / {d}';
      const variables = { a: 10, b: 20, c: 2, d: 5 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(12);
    });

    it('should evaluate formula with decimal values', () => {
      const formula = '{sales} * {commission}';
      const variables = { sales: 10000, commission: 0.05 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(500);
    });

    it('should throw error for undefined variable', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40 }; // Missing 'rate'

      expect(() => service.evaluateFormula(formula, variables))
        .toThrow("Variable 'rate' is not defined");
    });

    it('should throw error for null variable value', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: null };

      expect(() => service.evaluateFormula(formula, variables))
        .toThrow("Variable 'rate' is not defined");
    });

    it('should throw error for invalid numeric variable', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 'invalid' };

      expect(() => service.evaluateFormula(formula, variables))
        .toThrow("Variable 'rate' has invalid numeric value");
    });

    it('should handle empty variables object', () => {
      const formula = '10 + 20';
      const variables = {};

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(30);
    });

    it('should throw error for invalid formula', () => {
      const formula = '{a} +';
      const variables = { a: 10 };

      expect(() => service.evaluateFormula(formula, variables))
        .toThrow(/Formula evaluation error/);
    });
  });

  describe('validateFormula', () => {
    it('should validate correct formula', () => {
      const formula = '{hours} * {rate}';

      expect(() => service.validateFormula(formula)).not.toThrow();
    });

    it('should throw error for empty formula', () => {
      expect(() => service.validateFormula('')).toThrow('Formula must be a non-empty string');
    });

    it('should throw error for null formula', () => {
      expect(() => service.validateFormula(null)).toThrow('Formula must be a non-empty string');
    });

    it('should throw error for non-string formula', () => {
      expect(() => service.validateFormula(123)).toThrow('Formula must be a non-empty string');
    });

    it('should throw error for unbalanced opening parentheses', () => {
      const formula = '({a} + {b}';

      expect(() => service.validateFormula(formula))
        .toThrow('Unbalanced parentheses in formula');
    });

    it('should throw error for unbalanced closing parentheses', () => {
      const formula = '{a} + {b})';

      expect(() => service.validateFormula(formula))
        .toThrow('Unbalanced parentheses in formula');
    });

    it('should throw error for consecutive operators', () => {
      const formula = '{a} ++ {b}';

      expect(() => service.validateFormula(formula))
        .toThrow('Formula contains consecutive operators');
    });

    it('should throw error for formula starting with operator', () => {
      const formula = '+ {a}';

      expect(() => service.validateFormula(formula))
        .toThrow('Formula cannot start or end with an operator');
    });

    it('should throw error for formula ending with operator', () => {
      const formula = '{a} +';

      expect(() => service.validateFormula(formula))
        .toThrow('Formula cannot start or end with an operator');
    });

    it('should allow valid complex formula', () => {
      const formula = '({hours} * {rate}) + ({overtimeHours} * {rate} * 1.5)';

      expect(() => service.validateFormula(formula)).not.toThrow();
    });

    it('should validate formula with spaces', () => {
      const formula = '{a} + {b} * {c}';

      expect(() => service.validateFormula(formula)).not.toThrow();
    });
  });

  describe('substituteVariables', () => {
    it('should substitute single variable', () => {
      const formula = '{hours}';
      const variables = { hours: 40 };

      const result = service.substituteVariables(formula, variables);

      expect(result).toBe('40');
    });

    it('should substitute multiple variables', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      const result = service.substituteVariables(formula, variables);

      expect(result).toBe('40 * 25');
    });

    it('should substitute same variable multiple times', () => {
      const formula = '{rate} + {rate}';
      const variables = { rate: 25 };

      const result = service.substituteVariables(formula, variables);

      expect(result).toBe('25 + 25');
    });

    it('should substitute decimal values', () => {
      const formula = '{sales} * {commission}';
      const variables = { sales: 10000, commission: 0.05 };

      const result = service.substituteVariables(formula, variables);

      expect(result).toBe('10000 * 0.05');
    });

    it('should throw error for undefined variable', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40 };

      expect(() => service.substituteVariables(formula, variables))
        .toThrow("Variable 'rate' is not defined");
    });

    it('should throw error for null variable', () => {
      const formula = '{hours}';
      const variables = { hours: null };

      expect(() => service.substituteVariables(formula, variables))
        .toThrow("Variable 'hours' is not defined");
    });

    it('should throw error for non-numeric variable', () => {
      const formula = '{hours}';
      const variables = { hours: 'forty' };

      expect(() => service.substituteVariables(formula, variables))
        .toThrow("Variable 'hours' has invalid numeric value");
    });

    it('should handle formula with no variables', () => {
      const formula = '10 + 20';
      const variables = {};

      const result = service.substituteVariables(formula, variables);

      expect(result).toBe('10 + 20');
    });
  });

  describe('evaluateExpression', () => {
    it('should evaluate simple addition', () => {
      const expression = '10 + 20';

      const result = service.evaluateExpression(expression);

      expect(result).toBe(30);
    });

    it('should evaluate complex expression', () => {
      const expression = '(40 * 25) + 500';

      const result = service.evaluateExpression(expression);

      expect(result).toBe(1500);
    });

    it('should evaluate expression with decimals', () => {
      const expression = '10000 * 0.05';

      const result = service.evaluateExpression(expression);

      expect(result).toBe(500);
    });

    it('should handle division by non-zero', () => {
      const expression = '1000 / 4';

      const result = service.evaluateExpression(expression);

      expect(result).toBe(250);
    });

    it('should throw error for unsubstituted variables', () => {
      const expression = '{hours} * 25';

      expect(() => service.evaluateExpression(expression))
        .toThrow('Unsubstituted variables found in expression');
    });

    it('should throw error for invalid characters', () => {
      const expression = '10 + abc';

      expect(() => service.evaluateExpression(expression))
        .toThrow('Expression contains invalid characters after substitution');
    });

    it('should remove whitespace before evaluation', () => {
      const expression = '  10   +   20  ';

      const result = service.evaluateExpression(expression);

      expect(result).toBe(30);
    });

    it('should validate result is a number', () => {
      // Parser should handle this, but testing edge case
      const expression = '10 + 20';

      const result = service.evaluateExpression(expression);

      expect(typeof result).toBe('number');
      expect(isNaN(result)).toBe(false);
      expect(isFinite(result)).toBe(true);
    });
  });

  describe('testFormula', () => {
    it('should return success for valid formula', () => {
      const formula = '{hours} * {rate}';
      const sampleVariables = { hours: 40, rate: 25 };

      const result = service.testFormula(formula, sampleVariables);

      expect(result.success).toBe(true);
      expect(result.formula).toBe(formula);
      expect(result.sampleVariables).toEqual(sampleVariables);
      expect(result.result).toBe(1000);
      expect(result.message).toBe('Formula is valid and evaluates successfully');
    });

    it('should return failure for invalid formula', () => {
      const formula = '{hours} +';
      const sampleVariables = { hours: 40 };

      const result = service.testFormula(formula, sampleVariables);

      expect(result.success).toBe(false);
      expect(result.formula).toBe(formula);
      expect(result.sampleVariables).toEqual(sampleVariables);
      expect(result.error).toBeDefined();
      expect(result.message).toBe('Formula validation failed');
    });

    it('should return failure for missing variables', () => {
      const formula = '{hours} * {rate}';
      const sampleVariables = { hours: 40 }; // Missing 'rate'

      const result = service.testFormula(formula, sampleVariables);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Variable 'rate' is not defined");
    });
  });

  describe('getFormulaTemplates', () => {
    it('should return array of formula templates', () => {
      const templates = service.getFormulaTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return templates with required fields', () => {
      const templates = service.getFormulaTemplates();

      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.formula).toBeDefined();
        expect(template.description).toBeDefined();
        expect(Array.isArray(template.variables)).toBe(true);
        expect(template.example).toBeDefined();
      });
    });

    it('should include Hourly Pay template', () => {
      const templates = service.getFormulaTemplates();

      const hourlyPay = templates.find(t => t.name === 'Hourly Pay');

      expect(hourlyPay).toBeDefined();
      expect(hourlyPay.formula).toBe('{hours} * {rate}');
      expect(hourlyPay.variables).toEqual(['hours', 'rate']);
    });

    it('should include Overtime Pay template', () => {
      const templates = service.getFormulaTemplates();

      const overtimePay = templates.find(t => t.name === 'Overtime Pay');

      expect(overtimePay).toBeDefined();
      expect(overtimePay.formula).toBe('{overtimeHours} * {rate} * 1.5');
    });

    it('should include Commission template', () => {
      const templates = service.getFormulaTemplates();

      const commission = templates.find(t => t.name === 'Commission');

      expect(commission).toBeDefined();
      expect(commission.formula).toBe('{sales} * {commissionRate}');
    });

    it('should have valid example variables for each template', () => {
      const templates = service.getFormulaTemplates();

      templates.forEach(template => {
        const { formula, example } = template;
        
        // Test that template example evaluates successfully
        expect(() => service.evaluateFormula(formula, example)).not.toThrow();
      });
    });
  });

  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const formula = '{hours}';

      const variables = service.extractVariables(formula);

      expect(variables).toEqual(['hours']);
    });

    it('should extract multiple variables', () => {
      const formula = '{hours} * {rate}';

      const variables = service.extractVariables(formula);

      expect(variables).toEqual(['hours', 'rate']);
    });

    it('should extract unique variables', () => {
      const formula = '{rate} + {rate}';

      const variables = service.extractVariables(formula);

      expect(variables).toEqual(['rate']);
    });

    it('should extract variables from complex formula', () => {
      const formula = '({hours} * {rate}) + ({overtimeHours} * {rate} * 1.5)';

      const variables = service.extractVariables(formula);

      expect(variables).toContain('hours');
      expect(variables).toContain('rate');
      expect(variables).toContain('overtimeHours');
      expect(variables.length).toBe(3); // Unique only
    });

    it('should return empty array for formula with no variables', () => {
      const formula = '10 + 20';

      const variables = service.extractVariables(formula);

      expect(variables).toEqual([]);
    });
  });

  describe('validateVariables', () => {
    it('should validate all required variables are present', () => {
      const variables = { hours: 40, rate: 25 };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables)).not.toThrow();
    });

    it('should throw error for missing required variable', () => {
      const variables = { hours: 40 };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables))
        .toThrow("Required variable 'rate' is missing");
    });

    it('should throw error for null variable value', () => {
      const variables = { hours: 40, rate: null };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables))
        .toThrow("Variable 'rate' has null or undefined value");
    });

    it('should throw error for undefined variable value', () => {
      const variables = { hours: 40, rate: undefined };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables))
        .toThrow("Variable 'rate' has null or undefined value");
    });

    it('should throw error for non-numeric variable', () => {
      const variables = { hours: 40, rate: 'twenty-five' };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables))
        .toThrow("Variable 'rate' is not a valid number");
    });

    it('should accept numeric strings', () => {
      const variables = { hours: '40', rate: '25' };
      const requiredVariables = ['hours', 'rate'];

      expect(() => service.validateVariables(variables, requiredVariables)).not.toThrow();
    });

    it('should accept decimal values', () => {
      const variables = { sales: 10000, commission: 0.05 };
      const requiredVariables = ['sales', 'commission'];

      expect(() => service.validateVariables(variables, requiredVariables)).not.toThrow();
    });

    it('should handle empty required variables array', () => {
      const variables = { hours: 40 };
      const requiredVariables = [];

      expect(() => service.validateVariables(variables, requiredVariables)).not.toThrow();
    });
  });

  describe('formatFormula', () => {
    it('should add spaces around operators', () => {
      const formula = '{hours}*{rate}';

      const formatted = service.formatFormula(formula);

      expect(formatted).toBe('{hours} * {rate}');
    });

    it('should format complex formula', () => {
      const formula = '({hours}*{rate})+{bonus}';

      const formatted = service.formatFormula(formula);

      expect(formatted).toBe('( {hours} * {rate} ) + {bonus}');
    });

    it('should handle formula with existing spaces', () => {
      const formula = '{hours} * {rate}';

      const formatted = service.formatFormula(formula);

      expect(formatted).toBe('{hours} * {rate}');
    });

    it('should trim extra whitespace', () => {
      const formula = '  {hours}  *  {rate}  ';

      const formatted = service.formatFormula(formula);

      expect(formatted).toBe('{hours} * {rate}');
    });

    it('should format all arithmetic operators', () => {
      const formula = '{a}+{b}-{c}*{d}/{e}';

      const formatted = service.formatFormula(formula);

      expect(formatted).toBe('{a} + {b} - {c} * {d} / {e}');
    });
  });

  describe('calculateSafe', () => {
    it('should calculate and return result for valid formula', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      const result = service.calculateSafe(formula, variables, 'test-context');

      expect(result).toBe(1000);
    });

    it('should return 0 for invalid formula', () => {
      const formula = '{hours} +';
      const variables = { hours: 40 };

      const result = service.calculateSafe(formula, variables, 'test-context');

      expect(result).toBe(0);
    });

    it('should return 0 for missing variables', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40 }; // Missing 'rate'

      const result = service.calculateSafe(formula, variables, 'test-context');

      expect(result).toBe(0);
    });

    it('should return 0 for invalid variables', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 'invalid' };

      const result = service.calculateSafe(formula, variables, 'test-context');

      expect(result).toBe(0);
    });

    it('should handle complex formula successfully', () => {
      const formula = '({hours} * {rate}) + {bonus}';
      const variables = { hours: 40, rate: 25, bonus: 500 };

      const result = service.calculateSafe(formula, variables, 'payroll-calculation');

      expect(result).toBe(1500);
    });

    it('should use default context if not provided', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 40, rate: 25 };

      const result = service.calculateSafe(formula, variables);

      expect(result).toBe(1000);
    });
  });

  describe('security - code injection prevention', () => {
    it('should not execute malicious code in formula', () => {
      const maliciousFormulas = [
        'process.exit()',
        'require("fs").readFileSync("/etc/passwd")',
        'eval("malicious code")',
        '__dirname',
        'global.process'
      ];

      maliciousFormulas.forEach(formula => {
        expect(() => service.evaluateFormula(formula, {}))
          .toThrow();
      });
    });

    it('should not allow function calls in variables', () => {
      const formula = '{malicious}';
      const variables = { malicious: 'console.log("hacked")' };

      expect(() => service.evaluateFormula(formula, variables))
        .toThrow();
    });

    it('should sanitize formula input', () => {
      const formula = '{hours} * {rate}; DROP TABLE users;';

      expect(() => service.validateFormula(formula))
        .toThrow();
    });
  });

  describe('edge cases', () => {
    it('should throw error for division by zero', () => {
      const formula = '{a} / {b}';
      const variables = { a: 10, b: 0 };

      // Division by zero results in Infinity, which is invalid for payroll calculations
      expect(() => service.evaluateFormula(formula, variables))
        .toThrow('Formula evaluation resulted in invalid number');
    });

    it('should handle very large numbers', () => {
      const formula = '{a} * {b}';
      const variables = { a: 1e10, b: 1e10 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(1e20);
    });

    it('should handle very small decimals', () => {
      const formula = '{a} * {b}';
      const variables = { a: 0.0001, b: 0.0001 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBeCloseTo(0.00000001, 10);
    });

    it('should handle negative numbers', () => {
      const formula = '{a} + {b}';
      const variables = { a: -100, b: 50 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(-50);
    });

    it('should handle zero values', () => {
      const formula = '{hours} * {rate}';
      const variables = { hours: 0, rate: 25 };

      const result = service.evaluateFormula(formula, variables);

      expect(result).toBe(0);
    });
  });
});
