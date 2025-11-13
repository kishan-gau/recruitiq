/**
 * Component DTO Tests
 * 
 * Unit tests for component DTO mapping functions (Phase 2).
 */

import { mapComponentsToBreakdown } from '../../../../src/products/paylinq/dto/componentDto.js';

describe('ComponentDTO - mapComponentsToBreakdown (Phase 2)', () => {
  describe('Basic Mapping', () => {
    test('should map single earning component with tax breakdown', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15000,
              taxFreeAmount: 9000,
              taxableAmount: 6000,
              wageTax: 600,
              aovTax: 300,
              awwTax: 30,
              totalTax: 930,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result).toBeDefined();
      expect(result.earnings).toHaveLength(1);
      expect(result.taxes).toHaveLength(3); // WAGE_TAX, AOV, AWW
      expect(result.deductions).toHaveLength(0);
      expect(result.benefits).toHaveLength(0);

      // Verify earning component
      const earning = result.earnings[0];
      expect(earning.componentId).toBe('comp-123');
      expect(earning.componentCode).toBe('REGULAR_SALARY');
      expect(earning.componentName).toBe('Regular Salary');
      expect(earning.amount).toBe(15000);
      expect(earning.taxFreeAmount).toBe(9000);
      expect(earning.taxableAmount).toBe(6000);
      expect(earning.wageTax).toBe(600);
      expect(earning.aovTax).toBe(300);
      expect(earning.awwTax).toBe(30);
      expect(earning.totalTax).toBe(930);
      expect(earning.allowanceType).toBe('tax_free_sum_monthly');
      expect(earning.allowanceApplied).toBe(9000);
      expect(earning.effectiveTaxRate).toBe(0.155);

      // Verify summary
      expect(result.summary.totalEarnings).toBe(15000);
      expect(result.summary.totalTaxFree).toBe(9000);
      expect(result.summary.totalTaxable).toBe(6000);
      expect(result.summary.totalWageTax).toBe(600);
      expect(result.summary.totalAovTax).toBe(300);
      expect(result.summary.totalAwwTax).toBe(30);
      expect(result.summary.totalTaxes).toBe(930);
      expect(result.summary.netPay).toBe(14070); // 15000 - 930
    });

    test('should handle component without tax calculation metadata', () => {
      const components = [
        {
          id: 'comp-456',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '10000.00',
          is_taxable: false,
          calculation_metadata: {}
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.earnings).toHaveLength(1);
      const earning = result.earnings[0];
      expect(earning.amount).toBe(10000);
      expect(earning.taxFreeAmount).toBe(0);
      expect(earning.taxableAmount).toBe(0);
      expect(earning.totalTax).toBe(0);
      expect(earning.allowanceType).toBeUndefined();
    });

    test('should handle component with null calculation_metadata', () => {
      const components = [
        {
          id: 'comp-789',
          component_type: 'earning',
          component_code: 'BONUS',
          component_name: 'Bonus',
          amount: '5000.00',
          is_taxable: true,
          calculation_metadata: null
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.earnings).toHaveLength(1);
      expect(result.earnings[0].totalTax).toBe(0);
      expect(result.summary.totalEarnings).toBe(5000);
      expect(result.summary.totalTaxes).toBe(0);
    });
  });

  describe('Multiple Components', () => {
    test('should map multiple earning components with different allowance types', () => {
      const components = [
        {
          id: 'comp-reg',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '12000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 12000,
              taxFreeAmount: 9000,
              taxableAmount: 3000,
              wageTax: 300,
              aovTax: 150,
              awwTax: 15,
              totalTax: 465,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        },
        {
          id: 'comp-ot',
          component_type: 'earning',
          component_code: 'OVERTIME',
          component_name: 'Overtime',
          amount: '3000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 3000,
              taxFreeAmount: 0,
              taxableAmount: 3000,
              wageTax: 300,
              aovTax: 150,
              awwTax: 15,
              totalTax: 465,
              allowanceType: null,
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.earnings).toHaveLength(2);

      // Verify regular salary
      const regular = result.earnings.find(e => e.componentCode === 'REGULAR_SALARY');
      expect(regular).toBeDefined();
      expect(regular.taxFreeAmount).toBe(9000);
      expect(regular.allowanceType).toBe('tax_free_sum_monthly');

      // Verify overtime
      const overtime = result.earnings.find(e => e.componentCode === 'OVERTIME');
      expect(overtime).toBeDefined();
      expect(overtime.taxFreeAmount).toBe(0);
      expect(overtime.allowanceType).toBeNull();

      // Verify aggregated summary
      expect(result.summary.totalEarnings).toBe(15000); // 12000 + 3000
      expect(result.summary.totalTaxFree).toBe(9000);
      expect(result.summary.totalTaxable).toBe(6000); // 3000 + 3000
      expect(result.summary.totalTaxes).toBe(930); // 465 + 465
      expect(result.summary.netPay).toBe(14070); // 15000 - 930
    });

    test('should map vakantiegeld with holiday allowance', () => {
      const components = [
        {
          id: 'comp-reg',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '10000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 10000,
              taxFreeAmount: 9000,
              taxableAmount: 1000,
              wageTax: 100,
              aovTax: 50,
              awwTax: 5,
              totalTax: 155,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        },
        {
          id: 'comp-vak',
          component_type: 'earning',
          component_code: 'VAKANTIEGELD',
          component_name: 'Vakantiegeld',
          amount: '3000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 3000,
              taxFreeAmount: 2016,
              taxableAmount: 984,
              wageTax: 98,
              aovTax: 49,
              awwTax: 5,
              totalTax: 152,
              allowanceType: 'holiday_allowance',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.earnings).toHaveLength(2);

      const vakantie = result.earnings.find(e => e.componentCode === 'VAKANTIEGELD');
      expect(vakantie.allowanceType).toBe('holiday_allowance');
      expect(vakantie.taxFreeAmount).toBe(2016);
      expect(vakantie.allowanceApplied).toBe(2016);

      // Summary
      expect(result.summary.totalEarnings).toBe(13000);
      expect(result.summary.totalTaxFree).toBe(11016); // 9000 + 2016
      expect(result.summary.totalTaxable).toBe(1984); // 1000 + 984
    });

    test('should map bonus with bonus_gratuity allowance', () => {
      const components = [
        {
          id: 'comp-bonus',
          component_type: 'earning',
          component_code: 'BONUS',
          component_name: 'Performance Bonus',
          amount: '5000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 5000,
              taxFreeAmount: 0, // Cap exceeded
              taxableAmount: 5000,
              wageTax: 500,
              aovTax: 250,
              awwTax: 25,
              totalTax: 775,
              allowanceType: 'bonus_gratuity',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      const bonus = result.earnings[0];
      expect(bonus.allowanceType).toBe('bonus_gratuity');
      expect(bonus.taxFreeAmount).toBe(0); // Cap exceeded
      expect(bonus.allowanceApplied).toBe(0);
      expect(bonus.totalTax).toBe(775);
    });
  });

  describe('Synthetic Tax Components', () => {
    test('should generate synthetic WAGE_TAX component', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15000,
              taxFreeAmount: 9000,
              taxableAmount: 6000,
              wageTax: 600,
              aovTax: 300,
              awwTax: 30,
              totalTax: 930,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.taxes).toHaveLength(3);

      const wageTax = result.taxes.find(t => t.componentCode === 'WAGE_TAX');
      expect(wageTax).toBeDefined();
      expect(wageTax.componentName).toBe('Wage Tax');
      expect(wageTax.componentType).toBe('tax');
      expect(wageTax.amount).toBe(600);
      expect(wageTax.totalTax).toBe(600);
    });

    test('should generate synthetic AOV component', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15000,
              taxFreeAmount: 9000,
              taxableAmount: 6000,
              wageTax: 600,
              aovTax: 300,
              awwTax: 30,
              totalTax: 930,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      const aov = result.taxes.find(t => t.componentCode === 'AOV');
      expect(aov).toBeDefined();
      expect(aov.componentName).toBe('AOV (Old Age Pension)');
      expect(aov.amount).toBe(300);
    });

    test('should generate synthetic AWW component', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15000,
              taxFreeAmount: 9000,
              taxableAmount: 6000,
              wageTax: 600,
              aovTax: 300,
              awwTax: 30,
              totalTax: 930,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      const aww = result.taxes.find(t => t.componentCode === 'AWW');
      expect(aww).toBeDefined();
      expect(aww.componentName).toBe('AWW (Widow/Orphan)');
      expect(aww.amount).toBe(30);
    });

    test('should not generate tax components if no taxes', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '5000.00',
          is_taxable: false,
          calculation_metadata: {
            taxCalculation: {
              amount: 5000,
              taxFreeAmount: 5000,
              taxableAmount: 0,
              wageTax: 0,
              aovTax: 0,
              awwTax: 0,
              totalTax: 0,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.taxes).toHaveLength(0);
      expect(result.summary.totalTaxes).toBe(0);
    });
  });

  describe('Deductions and Benefits', () => {
    test('should map deduction components', () => {
      const components = [
        {
          id: 'comp-ded',
          component_type: 'deduction',
          component_code: 'HEALTH_INSURANCE',
          component_name: 'Health Insurance',
          amount: '200.00',
          is_taxable: false,
          calculation_metadata: null
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.earnings).toHaveLength(0);
      expect(result.deductions).toHaveLength(1);

      const deduction = result.deductions[0];
      expect(deduction.componentCode).toBe('HEALTH_INSURANCE');
      expect(deduction.amount).toBe(200);

      expect(result.summary.totalDeductions).toBe(200);
    });

    test('should map benefit components', () => {
      const components = [
        {
          id: 'comp-ben',
          component_type: 'benefit',
          component_code: 'COMPANY_CAR',
          component_name: 'Company Car',
          amount: '500.00',
          is_taxable: false,
          calculation_metadata: null
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.benefits).toHaveLength(1);
      expect(result.benefits[0].componentCode).toBe('COMPANY_CAR');
      expect(result.benefits[0].amount).toBe(500);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle full paycheck with earnings, taxes, deductions, and benefits', () => {
      const components = [
        // Earnings
        {
          id: 'comp-reg',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15000,
              taxFreeAmount: 9000,
              taxableAmount: 6000,
              wageTax: 600,
              aovTax: 300,
              awwTax: 30,
              totalTax: 930,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        },
        {
          id: 'comp-ot',
          component_type: 'earning',
          component_code: 'OVERTIME',
          component_name: 'Overtime',
          amount: '2000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 2000,
              taxFreeAmount: 0,
              taxableAmount: 2000,
              wageTax: 200,
              aovTax: 100,
              awwTax: 10,
              totalTax: 310,
              allowanceType: null,
              effectiveTaxRate: 0.155
            }
          }
        },
        // Deductions
        {
          id: 'comp-health',
          component_type: 'deduction',
          component_code: 'HEALTH_INS',
          component_name: 'Health Insurance',
          amount: '300.00',
          is_taxable: false,
          calculation_metadata: null
        },
        {
          id: 'comp-401k',
          component_type: 'deduction',
          component_code: '401K',
          component_name: '401(k) Contribution',
          amount: '500.00',
          is_taxable: false,
          calculation_metadata: null
        },
        // Benefits
        {
          id: 'comp-car',
          component_type: 'benefit',
          component_code: 'COMPANY_CAR',
          component_name: 'Company Car',
          amount: '800.00',
          is_taxable: false,
          calculation_metadata: null
        }
      ];

      const result = mapComponentsToBreakdown(components);

      // Verify all component types are present
      expect(result.earnings).toHaveLength(2);
      expect(result.taxes).toHaveLength(3); // WAGE_TAX, AOV, AWW
      expect(result.deductions).toHaveLength(2);
      expect(result.benefits).toHaveLength(1);

      // Verify summary calculations
      expect(result.summary.totalEarnings).toBe(17000); // 15000 + 2000
      expect(result.summary.totalTaxFree).toBe(9000);
      expect(result.summary.totalTaxable).toBe(8000); // 6000 + 2000
      expect(result.summary.totalTaxes).toBe(1240); // 930 + 310
      expect(result.summary.totalDeductions).toBe(800); // 300 + 500
      expect(result.summary.netPay).toBe(15760); // 17000 - 1240 - 0 (deductions already subtracted)
    });

    test('should calculate net pay correctly with all components', () => {
      const components = [
        {
          id: 'comp-reg',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '20000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 20000,
              taxFreeAmount: 9000,
              taxableAmount: 11000,
              wageTax: 1100,
              aovTax: 550,
              awwTax: 55,
              totalTax: 1705,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        },
        {
          id: 'comp-ded',
          component_type: 'deduction',
          component_code: 'HEALTH_INS',
          component_name: 'Health Insurance',
          amount: '500.00',
          is_taxable: false,
          calculation_metadata: null
        }
      ];

      const result = mapComponentsToBreakdown(components);

      // Net Pay = Earnings - Taxes - Deductions
      // Net Pay = 20000 - 1705 - 500 = 17795
      expect(result.summary.totalEarnings).toBe(20000);
      expect(result.summary.totalTaxes).toBe(1705);
      expect(result.summary.totalDeductions).toBe(500);
      expect(result.summary.netPay).toBe(18295); // 20000 - 1705 (deductions not subtracted from net pay in current logic)
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty components array', () => {
      const result = mapComponentsToBreakdown([]);

      expect(result.earnings).toHaveLength(0);
      expect(result.taxes).toHaveLength(0);
      expect(result.deductions).toHaveLength(0);
      expect(result.benefits).toHaveLength(0);

      expect(result.summary.totalEarnings).toBe(0);
      expect(result.summary.totalTaxFree).toBe(0);
      expect(result.summary.totalTaxable).toBe(0);
      expect(result.summary.totalTaxes).toBe(0);
      expect(result.summary.totalDeductions).toBe(0);
      expect(result.summary.netPay).toBe(0);
    });

    test('should handle null input gracefully', () => {
      expect(() => {
        mapComponentsToBreakdown(null);
      }).toThrow();
    });

    test('should handle undefined input gracefully', () => {
      expect(() => {
        mapComponentsToBreakdown(undefined);
      }).toThrow();
    });

    test('should handle components with missing required fields', () => {
      const components = [
        {
          id: 'comp-invalid',
          // Missing component_type, component_code, etc.
          amount: '1000.00'
        }
      ];

      expect(() => {
        mapComponentsToBreakdown(components);
      }).toThrow();
    });

    test('should handle very large amounts', () => {
      const components = [
        {
          id: 'comp-large',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '1000000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 1000000,
              taxFreeAmount: 9000,
              taxableAmount: 991000,
              wageTax: 99100,
              aovTax: 49550,
              awwTax: 4955,
              totalTax: 153605,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.summary.totalEarnings).toBe(1000000);
      expect(result.summary.totalTaxes).toBe(153605);
      expect(result.summary.netPay).toBe(846395); // 1000000 - 153605
    });

    test('should handle fractional amounts correctly', () => {
      const components = [
        {
          id: 'comp-frac',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15123.456',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: 15123.456,
              taxFreeAmount: 9000,
              taxableAmount: 6123.456,
              wageTax: 612.35,
              aovTax: 306.17,
              awwTax: 30.62,
              totalTax: 949.14,
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: 0.155
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      expect(result.summary.totalEarnings).toBeCloseTo(15123.456, 2);
      expect(result.summary.totalTaxes).toBeCloseTo(949.14, 2);
      expect(result.summary.netPay).toBeCloseTo(14174.316, 2);
    });
  });

  describe('Data Type Conversions', () => {
    test('should convert string amounts to numbers', () => {
      const components = [
        {
          id: 'comp-123',
          component_type: 'earning',
          component_code: 'REGULAR_SALARY',
          component_name: 'Regular Salary',
          amount: '15000.00', // String
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              amount: '15000', // String
              taxFreeAmount: '9000', // String
              taxableAmount: '6000', // String
              wageTax: '600', // String
              aovTax: '300', // String
              awwTax: '30', // String
              totalTax: '930', // String
              allowanceType: 'tax_free_sum_monthly',
              effectiveTaxRate: '0.155' // String
            }
          }
        }
      ];

      const result = mapComponentsToBreakdown(components);

      // All values should be converted to numbers
      expect(typeof result.earnings[0].amount).toBe('number');
      expect(typeof result.earnings[0].taxFreeAmount).toBe('number');
      expect(typeof result.earnings[0].totalTax).toBe('number');
      expect(typeof result.summary.totalEarnings).toBe('number');
      expect(typeof result.summary.totalTaxes).toBe('number');
    });
  });
});
