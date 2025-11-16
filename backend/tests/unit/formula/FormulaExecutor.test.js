import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach } from '@jest/globals';
import FormulaExecutor from '../../../src/services/formula/FormulaExecutor.js';
import FormulaParser from '../../../src/services/formula/FormulaParser.js';
import { FormulaExecutionError, DivisionByZeroError } from '../../../src/services/formula/FormulaTypes.js';

describe('FormulaExecutor', () => {
  let executor;
  let parser;

  beforeEach(() => {
    executor = new FormulaExecutor();
    parser = new FormulaParser();
  });

  describe('Literal Evaluation', () => {
    test('should evaluate number literal', () => {
      const ast = parser.parse('42');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(42);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should evaluate negative number', () => {
      const ast = parser.parse('-10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(-10);
    });

    test('should evaluate decimal number', () => {
      const ast = parser.parse('3.14159');
      const result = executor.execute(ast, {});
      expect(result.value).toBeCloseTo(3.14159);
    });
  });

  describe('Variable Evaluation', () => {
    test('should evaluate single variable', () => {
      const ast = parser.parse('gross_pay');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.value).toBe(5000);
      expect(result.metadata.variablesUsed).toContain('gross_pay');
    });

    test('should throw error for missing variable', () => {
      const ast = parser.parse('gross_pay');
      expect(() => executor.execute(ast, {})).toThrow(FormulaExecutionError);
    });

    test('should throw error for non-numeric variable', () => {
      const ast = parser.parse('gross_pay');
      expect(() => executor.execute(ast, { gross_pay: 'abc' })).toThrow(FormulaExecutionError);
    });

    test('should throw error for NaN variable', () => {
      const ast = parser.parse('gross_pay');
      expect(() => executor.execute(ast, { gross_pay: NaN })).toThrow(FormulaExecutionError);
    });

    test('should throw error for Infinity variable', () => {
      const ast = parser.parse('gross_pay');
      expect(() => executor.execute(ast, { gross_pay: Infinity })).toThrow(FormulaExecutionError);
    });
  });

  describe('Arithmetic Operations', () => {
    test('should evaluate addition', () => {
      const ast = parser.parse('10 + 20');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(30);
    });

    test('should evaluate subtraction', () => {
      const ast = parser.parse('100 - 25');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(75);
    });

    test('should evaluate multiplication', () => {
      const ast = parser.parse('5 * 3');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(15);
    });

    test('should evaluate division', () => {
      const ast = parser.parse('100 / 4');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(25);
    });

    test('should evaluate modulo', () => {
      const ast = parser.parse('10 % 3');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should throw error on division by zero', () => {
      const ast = parser.parse('10 / 0');
      expect(() => executor.execute(ast, {})).toThrow(DivisionByZeroError);
    });

    test('should throw error on modulo by zero', () => {
      const ast = parser.parse('10 % 0');
      expect(() => executor.execute(ast, {})).toThrow(DivisionByZeroError);
    });

    test('should handle complex arithmetic', () => {
      const ast = parser.parse('(10 + 20) * 3 - 15 / 5');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(87); // (30) * 3 - 3 = 90 - 3 = 87
    });
  });

  describe('Comparison Operations', () => {
    test('should evaluate greater than (true)', () => {
      const ast = parser.parse('10 > 5');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate greater than (false)', () => {
      const ast = parser.parse('5 > 10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(0);
    });

    test('should evaluate less than', () => {
      const ast = parser.parse('5 < 10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate equal to', () => {
      const ast = parser.parse('10 == 10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate not equal to', () => {
      const ast = parser.parse('10 != 5');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate greater than or equal', () => {
      const ast = parser.parse('10 >= 10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate less than or equal', () => {
      const ast = parser.parse('5 <= 10');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should handle float comparison with tolerance', () => {
      const ast = parser.parse('0.1 + 0.2 == 0.3');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1); // Should be true due to tolerance
    });
  });

  describe('Logical Operations', () => {
    test('should evaluate AND (true AND true)', () => {
      const ast = parser.parse('1 AND 1');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate AND (true AND false)', () => {
      const ast = parser.parse('1 AND 0');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(0);
    });

    test('should evaluate OR (true OR false)', () => {
      const ast = parser.parse('1 OR 0');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should evaluate OR (false OR false)', () => {
      const ast = parser.parse('0 OR 0');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(0);
    });

    test('should evaluate NOT', () => {
      const ast = parser.parse('NOT 0');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });

    test('should short-circuit AND', () => {
      const ast = parser.parse('0 AND gross_pay'); // gross_pay not provided, but shouldn't error
      const result = executor.execute(ast, {});
      expect(result.value).toBe(0);
    });

    test('should short-circuit OR', () => {
      const ast = parser.parse('1 OR gross_pay'); // gross_pay not provided, but shouldn't error
      const result = executor.execute(ast, {});
      expect(result.value).toBe(1);
    });
  });

  describe('Conditional Expressions', () => {
    test('should evaluate ternary (true branch)', () => {
      const ast = parser.parse('10 > 5 ? 100 : 50');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(100);
    });

    test('should evaluate ternary (false branch)', () => {
      const ast = parser.parse('5 > 10 ? 100 : 50');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(50);
    });

    test('should short-circuit ternary', () => {
      const ast = parser.parse('1 ? 100 : gross_pay'); // gross_pay not provided, but shouldn't error
      const result = executor.execute(ast, {});
      expect(result.value).toBe(100);
    });

    test('should handle nested conditionals', () => {
      const ast = parser.parse('10 > 5 ? (20 > 15 ? 100 : 50) : 0');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(100);
    });
  });

  describe('Function Calls', () => {
    test('should evaluate MIN function', () => {
      const ast = parser.parse('MIN(10, 20)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(10);
    });

    test('should evaluate MAX function', () => {
      const ast = parser.parse('MAX(10, 20)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(20);
    });

    test('should evaluate ROUND function', () => {
      const ast = parser.parse('ROUND(3.14159, 2)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(3.14);
    });

    test('should evaluate FLOOR function', () => {
      const ast = parser.parse('FLOOR(3.9)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(3);
    });

    test('should evaluate CEIL function', () => {
      const ast = parser.parse('CEIL(3.1)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(4);
    });

    test('should evaluate ABS function', () => {
      const ast = parser.parse('ABS(-10)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(10);
    });

    test('should evaluate IF function (true)', () => {
      const ast = parser.parse('IF(10 > 5, 100, 50)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(100);
    });

    test('should evaluate IF function (false)', () => {
      const ast = parser.parse('IF(5 > 10, 100, 50)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(50);
    });

    test('should evaluate nested functions', () => {
      const ast = parser.parse('MAX(MIN(15, 10), 5)');
      const result = executor.execute(ast, {});
      expect(result.value).toBe(10); // MIN(15, 10) = 10, MAX(10, 5) = 10
    });
  });

  describe('Real-World Payroll Formulas', () => {
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

    test('should calculate 10% of gross pay', () => {
      const ast = parser.parse('gross_pay * 0.10');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(500);
    });

    test('should calculate overtime pay', () => {
      const ast = parser.parse('overtime_hours * overtime_rate');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(375);
    });

    test('should calculate daily rate', () => {
      const ast = parser.parse('ROUND(base_salary / 260, 2)');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBeCloseTo(230.77, 1);
    });

    test('should calculate conditional bonus', () => {
      const ast = parser.parse('hours_worked > 160 ? (hours_worked - 160) * hourly_rate * 1.5 : 0');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(0); // hours_worked = 160, not > 160
    });

    test('should calculate tiered health insurance', () => {
      const ast = parser.parse('IF(gross_pay > 3000, 150, 100)');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(150);
    });

    test('should calculate total with overtime', () => {
      const ast = parser.parse('(regular_hours * hourly_rate) + (overtime_hours * overtime_rate * 1.5)');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(4562.5); // (160 * 25) + (10 * 37.5 * 1.5)
    });

    test('should calculate tax withholding', () => {
      const ast = parser.parse('taxable_income > 5000 ? taxable_income * 0.25 : taxable_income * 0.20');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(900); // 4500 * 0.20
    });

    test('should calculate safe division with MAX', () => {
      const ast = parser.parse('gross_pay / MAX(hours_worked, 1)');
      const result = executor.execute(ast, payrollData);
      expect(result.value).toBe(31.25); // 5000 / 160
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values', () => {
      const ast = parser.parse('gross_pay * 0');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.value).toBe(0);
    });

    test('should handle very large numbers', () => {
      const ast = parser.parse('gross_pay * 1000000');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.value).toBe(5000000000);
    });

    test('should handle very small numbers', () => {
      const ast = parser.parse('gross_pay * 0.0001');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.value).toBe(0.5);
    });

    test('should handle negative results', () => {
      const ast = parser.parse('net_pay - gross_pay');
      const result = executor.execute(ast, { net_pay: 4000, gross_pay: 5000 });
      expect(result.value).toBe(-1000);
    });
  });

  describe('Execution Metadata', () => {
    test('should track variables used', () => {
      const ast = parser.parse('gross_pay + overtime_hours * hourly_rate');
      const result = executor.execute(ast, {
        gross_pay: 5000,
        overtime_hours: 10,
        hourly_rate: 25,
      });
      expect(result.metadata.variablesUsed).toContain('gross_pay');
      expect(result.metadata.variablesUsed).toContain('overtime_hours');
      expect(result.metadata.variablesUsed).toContain('hourly_rate');
    });

    test('should measure execution time', () => {
      const ast = parser.parse('gross_pay * 0.10');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should not include unused variables in metadata', () => {
      const ast = parser.parse('10 + 20');
      const result = executor.execute(ast, { gross_pay: 5000 });
      expect(result.metadata.variablesUsed).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error on invalid AST', () => {
      expect(() => executor.execute(null, {})).toThrow(FormulaExecutionError);
    });

    test('should throw error on unknown node type', () => {
      const invalidAst = { type: 'UNKNOWN', value: 10 };
      expect(() => executor.execute(invalidAst, {})).toThrow(FormulaExecutionError);
    });

    test('should throw error on runtime division by zero', () => {
      const ast = parser.parse('gross_pay / hours_worked');
      expect(() => executor.execute(ast, { gross_pay: 5000, hours_worked: 0 })).toThrow(DivisionByZeroError);
    });
  });

  describe('Performance', () => {
    test('should execute simple formula quickly', () => {
      const ast = parser.parse('gross_pay * 0.10');
      const start = Date.now();
      executor.execute(ast, { gross_pay: 5000 });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    test('should execute complex formula in reasonable time', () => {
      const ast = parser.parse(
        'IF(hours_worked > 160, (hours_worked - 160) * overtime_rate * 1.5 + regular_hours * hourly_rate, hours_worked * hourly_rate)'
      );
      const start = Date.now();
      executor.execute(ast, {
        hours_worked: 170,
        overtime_rate: 37.5,
        regular_hours: 160,
        hourly_rate: 25,
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(20);
    });
  });
});
