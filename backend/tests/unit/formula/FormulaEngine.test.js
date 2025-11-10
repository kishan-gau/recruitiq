import { describe, test, expect, beforeEach } from '@jest/globals';
import formulaEngine from '../../../src/services/formula/FormulaEngine.js';

describe('FormulaEngine Integration', () => {
  describe('parse()', () => {
    test('should parse simple formula', () => {
      const ast = formulaEngine.parse('10 + 20');
      expect(ast.type).toBe('BINARY_OP');
      expect(ast.operator).toBe('+');
    });

    test('should throw error on invalid formula', () => {
      expect(() => formulaEngine.parse('10 +')).toThrow();
    });
  });

  describe('validate()', () => {
    test('should validate string formula', () => {
      const result = formulaEngine.validate('gross_pay * 0.10');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate AST', () => {
      const ast = formulaEngine.parse('gross_pay * 0.10');
      const result = formulaEngine.validate(ast);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid variables', () => {
      const result = formulaEngine.validate('invalid_var + 10');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute()', () => {
    test('should execute with string formula', () => {
      const result = formulaEngine.execute('10 + 20', {});
      expect(result.value).toBe(30);
      expect(result.metadata).toBeDefined();
    });

    test('should execute with AST', () => {
      const ast = formulaEngine.parse('gross_pay * 0.10');
      const result = formulaEngine.execute(ast, { gross_pay: 5000 });
      expect(result.value).toBe(500);
    });

    test('should throw on validation failure', () => {
      expect(() => formulaEngine.execute('invalid_var + 10', {})).toThrow();
    });

    test('should throw on missing variables', () => {
      expect(() => formulaEngine.execute('gross_pay * 0.10', {})).toThrow();
    });
  });

  describe('calculate()', () => {
    test('should return numeric value', () => {
      const value = formulaEngine.calculate('10 + 20', {});
      expect(value).toBe(30);
      expect(typeof value).toBe('number');
    });

    test('should work with variables', () => {
      const value = formulaEngine.calculate('gross_pay * 0.10', { gross_pay: 5000 });
      expect(value).toBe(500);
    });
  });

  describe('test()', () => {
    test('should test with multiple scenarios', () => {
      const results = formulaEngine.test('gross_pay * 0.10');
      expect(results).toHaveLength(3);
      expect(results[0].variables.gross_pay).toBe(1000);
      expect(results[0].result).toBe(100);
      expect(results[1].variables.gross_pay).toBe(5000);
      expect(results[1].result).toBe(500);
      expect(results[2].variables.gross_pay).toBe(10000);
      expect(results[2].result).toBe(1000);
    });

    test('should test complex formulas', () => {
      const results = formulaEngine.test('hours_worked > 160 ? (hours_worked - 160) * 25 : 0');
      expect(results).toHaveLength(3);
      // First scenario: hours_worked = 40 (< 160)
      expect(results[0].result).toBe(0);
      // Second scenario: hours_worked = 160 (= 160)
      expect(results[1].result).toBe(0);
      // Third scenario: hours_worked = 200 (> 160)
      expect(results[2].result).toBe(1000); // (200 - 160) * 25
    });
  });

  describe('extractVariables()', () => {
    test('should extract from string formula', () => {
      const variables = formulaEngine.extractVariables('gross_pay + overtime_hours * hourly_rate');
      expect(variables).toContain('gross_pay');
      expect(variables).toContain('overtime_hours');
      expect(variables).toContain('hourly_rate');
    });

    test('should extract from AST', () => {
      const ast = formulaEngine.parse('gross_pay + overtime_hours * hourly_rate');
      const variables = formulaEngine.extractVariables(ast);
      expect(variables).toContain('gross_pay');
      expect(variables).toContain('overtime_hours');
      expect(variables).toContain('hourly_rate');
    });
  });

  describe('AST Serialization', () => {
    test('should convert AST to JSON', () => {
      const ast = formulaEngine.parse('gross_pay * 0.10');
      const json = formulaEngine.astToJSON(ast);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    test('should convert JSON to AST', () => {
      const ast = formulaEngine.parse('gross_pay * 0.10');
      const json = formulaEngine.astToJSON(ast);
      const restoredAst = formulaEngine.jsonToAST(json);
      expect(restoredAst.type).toBe(ast.type);
      expect(restoredAst.operator).toBe(ast.operator);
    });

    test('should preserve formula through serialization', () => {
      const formula = 'hours_worked > 160 ? overtime_rate : hourly_rate';
      const ast = formulaEngine.parse(formula);
      const json = formulaEngine.astToJSON(ast);
      const restoredAst = formulaEngine.jsonToAST(json);
      
      const result1 = formulaEngine.execute(ast, {
        hours_worked: 170,
        overtime_rate: 37.5,
        hourly_rate: 25,
      });
      
      const result2 = formulaEngine.execute(restoredAst, {
        hours_worked: 170,
        overtime_rate: 37.5,
        hourly_rate: 25,
      });
      
      expect(result2.value).toBe(result1.value);
    });
  });

  describe('getStats()', () => {
    test('should return formula statistics', () => {
      const stats = formulaEngine.getStats('gross_pay * 0.10 + overtime_hours * hourly_rate');
      expect(stats.variables).toContain('gross_pay');
      expect(stats.variables).toContain('overtime_hours');
      expect(stats.variables).toContain('hourly_rate');
      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.complexity).toBeGreaterThan(0);
    });
  });

  describe('Real-World Integration', () => {
    const payrollData = {
      base_salary: 60000,
      gross_pay: 5000,
      net_pay: 4000,
      taxable_income: 4500,
      hours_worked: 160,
      regular_hours: 160,
      overtime_hours: 10,
      days_worked: 22,
      hourly_rate: 25,
      overtime_rate: 37.5,
      total_earnings: 5500,
      total_deductions: 1000,
    };

    test('should handle standard percentage formula', () => {
      const formula = 'gross_pay * 0.10';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(500);
    });

    test('should handle overtime calculation', () => {
      const formula = 'overtime_hours * overtime_rate';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(375);
    });

    test('should handle conditional bonus', () => {
      const formula = 'hours_worked > 160 ? (hours_worked - 160) * hourly_rate * 1.5 : 0';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(0); // hours_worked = 160
    });

    test('should handle tiered calculation', () => {
      const formula = 'gross_pay > 5000 ? gross_pay * 0.15 : gross_pay * 0.10';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(500); // 5000 * 0.10 (not > 5000)
    });

    test('should handle health insurance formula', () => {
      const formula = 'IF(gross_pay > 3000, 150, 100)';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(150);
    });

    test('should handle daily rate calculation', () => {
      const formula = 'ROUND(base_salary / 260, 2)';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBeCloseTo(230.77, 1);
    });

    test('should handle safe division', () => {
      const formula = 'gross_pay / MAX(hours_worked, 1)';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(31.25);
    });

    test('should handle complex nested formula', () => {
      const formula = 'IF(hours_worked > 160, (hours_worked - 160) * overtime_rate * 1.5 + MIN(hours_worked, 160) * hourly_rate, hours_worked * hourly_rate)';
      const value = formulaEngine.calculate(formula, payrollData);
      expect(value).toBe(4000); // hours_worked = 160, so 160 * 25
    });
  });

  describe('Error Recovery', () => {
    test('should provide helpful error messages', () => {
      try {
        formulaEngine.calculate('invalid_var + 10', {});
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Unknown variable');
      }
    });

    test('should handle parsing errors gracefully', () => {
      try {
        formulaEngine.calculate('10 +', {});
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    test('should handle execution errors gracefully', () => {
      try {
        formulaEngine.calculate('10 / 0', {});
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('division by zero');
      }
    });
  });

  describe('Performance', () => {
    test('should parse formulas quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        formulaEngine.parse('gross_pay * 0.10');
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 100 parses in < 100ms
    });

    test('should execute formulas quickly', () => {
      const formula = 'gross_pay * 0.10 + overtime_hours * hourly_rate';
      const variables = { gross_pay: 5000, overtime_hours: 10, hourly_rate: 25 };
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        formulaEngine.calculate(formula, variables);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 1000 executions in < 1s
    });
  });

  describe('Caching and Reuse', () => {
    test('should benefit from AST reuse', () => {
      const formula = 'gross_pay * 0.10';
      const ast = formulaEngine.parse(formula);
      const variables = { gross_pay: 5000 };
      
      // Parse once, execute many times
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        formulaEngine.execute(ast, variables);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should be faster than parsing each time
    });
  });
});
