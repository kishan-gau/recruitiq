/**
 * Formula Engine Service Tests
 * 
 * Tests formula evaluation with the secure mathjs library.
 * Ensures formulas work correctly after security fix.
 */

import FormulaEngineService from '../formulaEngineService.ts';

describe('FormulaEngineService', () => {
  let service;

  beforeEach(() => {
    service = new FormulaEngineService();
  });

  describe('evaluateFormula', () => {
    test('should evaluate simple addition', () => {
      const result = service.evaluateFormula('{a} + {b}', { a: 10, b: 5 });
      expect(result).toBe(15);
    });

    test('should evaluate simple subtraction', () => {
      const result = service.evaluateFormula('{a} - {b}', { a: 10, b: 3 });
      expect(result).toBe(7);
    });

    test('should evaluate simple multiplication', () => {
      const result = service.evaluateFormula('{hours} * {rate}', { hours: 40, rate: 25 });
      expect(result).toBe(1000);
    });

    test('should evaluate simple division', () => {
      const result = service.evaluateFormula('{total} / {count}', { total: 100, count: 4 });
      expect(result).toBe(25);
    });

    test('should evaluate complex expression with parentheses', () => {
      const result = service.evaluateFormula('({a} + {b}) * {c}', { a: 5, b: 3, c: 2 });
      expect(result).toBe(16);
    });

    test('should evaluate hourly pay formula', () => {
      const result = service.evaluateFormula('{hours} * {rate}', { hours: 40, rate: 25 });
      expect(result).toBe(1000);
    });

    test('should evaluate overtime pay formula', () => {
      const result = service.evaluateFormula('{overtimeHours} * {rate} * 1.5', { 
        overtimeHours: 5, 
        rate: 25 
      });
      expect(result).toBe(187.5);
    });

    test('should evaluate salary with bonus', () => {
      const result = service.evaluateFormula('{baseSalary} + {bonus}', { 
        baseSalary: 5000, 
        bonus: 500 
      });
      expect(result).toBe(5500);
    });

    test('should throw error for missing variables', () => {
      expect(() => {
        service.evaluateFormula('{a} + {b}', { a: 10 });
      }).toThrow("Variable 'b' is not defined");
    });

    test('should throw error for invalid formula', () => {
      expect(() => {
        service.evaluateFormula('{a} ++ {b}', { a: 10, b: 5 });
      }).toThrow('Formula contains consecutive operators');
    });

    test('should throw error for unbalanced parentheses', () => {
      expect(() => {
        service.evaluateFormula('({a} + {b}', { a: 10, b: 5 });
      }).toThrow('Unbalanced parentheses');
    });
  });

  describe('Security Tests', () => {
    test('should NOT execute code injection attempts', () => {
      // These should all fail safely without executing malicious code
      const maliciousInputs = [
        "process.exit()",
        "console.log('hacked')",
        "require('fs')",
        "eval('malicious')",
        "function(){return 1}()",
      ];

      maliciousInputs.forEach(input => {
        expect(() => {
          service.evaluateFormula(input, {});
        }).toThrow();
      });
    });

    test('should handle only safe mathematical operations', () => {
      // Should work fine with legitimate math
      const result = service.evaluateFormula('({a} + {b}) * {c} / {d}', { 
        a: 10, 
        b: 5, 
        c: 2, 
        d: 3 
      });
      expect(result).toBe(10);
    });
  });

  describe('extractVariables', () => {
    test('should extract all variables from formula', () => {
      const variables = service.extractVariables('{hours} * {rate} + {bonus}');
      expect(variables).toEqual(['hours', 'rate', 'bonus']);
    });

    test('should return unique variables', () => {
      const variables = service.extractVariables('{a} + {b} + {a}');
      expect(variables).toEqual(['a', 'b']);
    });
  });

  describe('validateVariables', () => {
    test('should validate all required variables are present', () => {
      expect(() => {
        service.validateVariables({ a: 10, b: 5 }, ['a', 'b']);
      }).not.toThrow();
    });

    test('should throw error for missing variable', () => {
      expect(() => {
        service.validateVariables({ a: 10 }, ['a', 'b']);
      }).toThrow("Required variable 'b' is missing");
    });

    test('should throw error for non-numeric variable', () => {
      expect(() => {
        service.validateVariables({ a: 10, b: 'invalid' }, ['a', 'b']);
      }).toThrow("Variable 'b' is not a valid number");
    });
  });

  describe('calculateSafe', () => {
    test('should calculate and log success', () => {
      const result = service.calculateSafe('{hours} * {rate}', { hours: 40, rate: 25 }, 'test');
      expect(result).toBe(1000);
    });

    test('should return 0 and log error on failure', () => {
      const result = service.calculateSafe('{invalid}', {}, 'test');
      expect(result).toBe(0);
    });
  });

  describe('formatFormula', () => {
    test('should add spaces around operators', () => {
      const formatted = service.formatFormula('{a}+{b}*{c}');
      expect(formatted).toBe('{a} + {b} * {c}');
    });
  });
});
