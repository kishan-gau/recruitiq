/**
 * Reconciliation Service Tests
 * 
 * Unit tests for ReconciliationService business logic.
 */

import ReconciliationService from '../../../../src/products/paylinq/services/reconciliationService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';
import TaxRepository from '../../../../src/products/paylinq/repositories/taxRepository.js';

// Mock dependencies

describe('ReconciliationService', () => {
  let service;
  let mockPayrollRepository;
  let mockTaxRepository;

  beforeEach(() => {
    service = new ReconciliationService();
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    mockTaxRepository = TaxRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Payroll Reconciliation', () => {
    describe('reconcilePayrollRun', () => {
      test('should reconcile matching payroll run', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          gross_pay: 100000,
          total_taxes: 20000,
          total_deductions: 5000,
          net_pay: 75000
        };

        const mockPaychecks = [
          { gross_pay: 5000, total_taxes: 1000, total_deductions: 250, net_pay: 3750 }
          // ... 20 employees
        ];
        const totalPaychecks = Array(20).fill(mockPaychecks[0]);

        mockPayrollRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(totalPaychecks);

        const result = await service.reconcilePayrollRun('run-123', 'org-789');

        expect(result.isReconciled).toBe(true);
        expect(result.discrepancies).toHaveLength(0);
        expect(result.totalGross).toBe(100000);
      });

      test('should detect gross pay discrepancy', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          gross_pay: 100000,
          total_taxes: 20000,
          total_deductions: 5000,
          net_pay: 75000
        };

        const mockPaychecks = [
          { gross_pay: 4900, total_taxes: 1000, total_deductions: 250, net_pay: 3650 }
        ];
        const totalPaychecks = Array(20).fill(mockPaychecks[0]);

        mockPayrollRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(totalPaychecks);

        const result = await service.reconcilePayrollRun('run-123', 'org-789');

        expect(result.isReconciled).toBe(false);
        expect(result.discrepancies.length).toBeGreaterThan(0);
        expect(result.discrepancies[0].type).toBe('gross_pay');
      });

      test('should detect tax calculation discrepancy', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          gross_pay: 100000,
          total_taxes: 20000,
          total_deductions: 5000,
          net_pay: 75000
        };

        const mockPaychecks = [
          { gross_pay: 5000, total_taxes: 950, total_deductions: 250, net_pay: 3800 }
        ];
        const totalPaychecks = Array(20).fill(mockPaychecks[0]);

        mockPayrollRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(totalPaychecks);

        const result = await service.reconcilePayrollRun('run-123', 'org-789');

        expect(result.isReconciled).toBe(false);
        expect(result.discrepancies.some(d => d.type === 'taxes')).toBe(true);
      });
    });

    describe('reconcileNetPay', () => {
      test('should verify net pay calculation', () => {
        const grossPay = 5000;
        const taxes = 1000;
        const deductions = 250;
        const expectedNet = 3750;

        const result = service.reconcileNetPay(grossPay, taxes, deductions, expectedNet);

        expect(result.isCorrect).toBe(true);
        expect(result.calculatedNet).toBe(3750);
      });

      test('should detect incorrect net pay', () => {
        const grossPay = 5000;
        const taxes = 1000;
        const deductions = 250;
        const expectedNet = 3700; // Incorrect

        const result = service.reconcileNetPay(grossPay, taxes, deductions, expectedNet);

        expect(result.isCorrect).toBe(false);
        expect(result.difference).toBe(50);
      });
    });
  });

  describe('Bank Transaction Reconciliation', () => {
    describe('reconcileBankTransactions', () => {
      test('should match all bank transactions', async () => {
        const mockPaychecks = [
          { id: 'check-1', net_pay: 3750, check_number: '1001' },
          { id: 'check-2', net_pay: 4200, check_number: '1002' }
        ];

        const mockTransactions = [
          { amount: 3750, reference: '1001', date: '2024-01-15' },
          { amount: 4200, reference: '1002', date: '2024-01-15' }
        ];

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

        const result = await service.reconcileBankTransactions(
          'run-123',
          mockTransactions,
          'org-789'
        );

        expect(result.matched).toBe(2);
        expect(result.unmatched).toBe(0);
        expect(result.isFullyReconciled).toBe(true);
      });

      test('should detect unmatched transactions', async () => {
        const mockPaychecks = [
          { id: 'check-1', net_pay: 3750, check_number: '1001' },
          { id: 'check-2', net_pay: 4200, check_number: '1002' }
        ];

        const mockTransactions = [
          { amount: 3750, reference: '1001', date: '2024-01-15' }
          // Missing transaction for check-2
        ];

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

        const result = await service.reconcileBankTransactions(
          'run-123',
          mockTransactions,
          'org-789'
        );

        expect(result.matched).toBe(1);
        expect(result.unmatched).toBe(1);
        expect(result.isFullyReconciled).toBe(false);
      });

      test('should detect amount discrepancies', async () => {
        const mockPaychecks = [
          { id: 'check-1', net_pay: 3750, check_number: '1001' }
        ];

        const mockTransactions = [
          { amount: 3700, reference: '1001', date: '2024-01-15' } // $50 short
        ];

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

        const result = await service.reconcileBankTransactions(
          'run-123',
          mockTransactions,
          'org-789'
        );

        expect(result.discrepancies.length).toBeGreaterThan(0);
        expect(result.discrepancies[0].difference).toBe(50);
      });
    });
  });

  describe('Tax Reconciliation', () => {
    describe('reconcileTaxLiability', () => {
      test('should reconcile quarterly tax liability', async () => {
        const mockTaxPayments = [
          { federal_tax: 10000, social_security: 6200, medicare: 1450 },
          { federal_tax: 11000, social_security: 6820, medicare: 1595 },
          { federal_tax: 10500, social_security: 6510, medicare: 1523 }
        ];

        mockTaxRepository.findTaxCalculationsForPeriod = jest.fn().mockResolvedValue(mockTaxPayments);

        const result = await service.reconcileTaxLiability(
          '2024-01-01',
          '2024-03-31',
          'org-789'
        );

        expect(result.totalFederal).toBe(31500);
        expect(result.totalSocialSecurity).toBe(19530);
        expect(result.totalMedicare).toBe(4568);
        expect(result.totalLiability).toBeDefined();
      });

      test('should include employer matching', async () => {
        const mockTaxPayments = [
          { social_security: 6200, medicare: 1450 }
        ];

        mockTaxRepository.findTaxCalculationsForPeriod = jest.fn().mockResolvedValue(mockTaxPayments);

        const result = await service.reconcileTaxLiability(
          '2024-01-01',
          '2024-03-31',
          'org-789'
        );

        expect(result.employeeSocialSecurity).toBe(6200);
        expect(result.employerSocialSecurity).toBe(6200); // Matching
        expect(result.totalSocialSecurity).toBe(12400); // Combined
      });
    });

    describe('reconcileTaxDeposits', () => {
      test('should match tax liability with deposits', async () => {
        const liability = {
          totalFederal: 10000,
          totalSocialSecurity: 12400,
          totalMedicare: 2900
        };

        const deposits = [
          { type: 'federal', amount: 10000, date: '2024-04-15' },
          { type: 'social_security', amount: 12400, date: '2024-04-15' },
          { type: 'medicare', amount: 2900, date: '2024-04-15' }
        ];

        const result = service.reconcileTaxDeposits(liability, deposits);

        expect(result.isFullyPaid).toBe(true);
        expect(result.outstanding).toBe(0);
      });

      test('should detect underpayment', async () => {
        const liability = {
          totalFederal: 10000,
          totalSocialSecurity: 12400,
          totalMedicare: 2900
        };

        const deposits = [
          { type: 'federal', amount: 9500, date: '2024-04-15' }, // $500 short
          { type: 'social_security', amount: 12400, date: '2024-04-15' },
          { type: 'medicare', amount: 2900, date: '2024-04-15' }
        ];

        const result = service.reconcileTaxDeposits(liability, deposits);

        expect(result.isFullyPaid).toBe(false);
        expect(result.outstanding).toBe(500);
      });
    });
  });

  describe('Deduction Reconciliation', () => {
    describe('reconcileDeductions', () => {
      test('should reconcile pre-tax deductions', async () => {
        const mockPaychecks = [
          { id: 'check-1', gross_pay: 5000 },
          { id: 'check-2', gross_pay: 4500 }
        ];

        const mockDeductions = {
          'check-1': [
            { amount: 500, is_pre_tax: true },
            { amount: 200, is_pre_tax: true }
          ],
          'check-2': [
            { amount: 450, is_pre_tax: true }
          ]
        };

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);
        mockTaxRepository.findDeductionsForPaycheck = jest.fn()
          .mockResolvedValueOnce(mockDeductions['check-1'])
          .mockResolvedValueOnce(mockDeductions['check-2']);

        const result = await service.reconcileDeductions('run-123', 'org-789');

        expect(result.totalPreTax).toBe(1150); // 700 + 450
      });

      test('should separate pre-tax and post-tax deductions', async () => {
        const mockPaychecks = [{ id: 'check-1', gross_pay: 5000 }];

        const mockDeductions = [
          { amount: 500, is_pre_tax: true },
          { amount: 200, is_pre_tax: true },
          { amount: 100, is_pre_tax: false }
        ];

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);
        mockTaxRepository.findDeductionsForPaycheck = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.reconcileDeductions('run-123', 'org-789');

        expect(result.totalPreTax).toBe(700);
        expect(result.totalPostTax).toBe(100);
        expect(result.totalDeductions).toBe(800);
      });
    });
  });

  describe('Year-to-Date Reconciliation', () => {
    describe('reconcileYTDTotals', () => {
      test('should calculate and verify YTD totals', async () => {
        const mockPaychecks = Array(12).fill({
          gross_pay: 5000,
          total_taxes: 1000,
          net_pay: 3750
        });

        mockPayrollRepository.findPaychecksForEmployee = jest.fn().mockResolvedValue(mockPaychecks);

        const result = await service.reconcileYTDTotals(
          'emp-123',
          '2024-01-01',
          '2024-12-31',
          'org-789'
        );

        expect(result.ytdGross).toBe(60000); // 5000 * 12
        expect(result.ytdTaxes).toBe(12000); // 1000 * 12
        expect(result.ytdNet).toBe(45000); // 3750 * 12
      });
    });

    describe('verifyW2Amounts', () => {
      test('should verify W-2 amounts match YTD', async () => {
        const ytdData = {
          ytdGross: 60000,
          ytdFederalTax: 9600,
          ytdSocialSecurity: 3720,
          ytdMedicare: 870
        };

        const w2Data = {
          box1_wages: 54000, // After pre-tax deductions
          box2_federal: 9600,
          box4_ss_tax: 3720,
          box6_medicare_tax: 870
        };

        const result = service.verifyW2Amounts(ytdData, w2Data);

        expect(result.isAccurate).toBe(true);
        expect(result.discrepancies).toHaveLength(0);
      });

      test('should detect W-2 discrepancies', async () => {
        const ytdData = {
          ytdGross: 60000,
          ytdFederalTax: 9600
        };

        const w2Data = {
          box1_wages: 54000,
          box2_federal: 9500 // $100 discrepancy
        };

        const result = service.verifyW2Amounts(ytdData, w2Data);

        expect(result.isAccurate).toBe(false);
        expect(result.discrepancies.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Variance Analysis', () => {
    describe('analyzePayrollVariance', () => {
      test('should identify significant variance', () => {
        const previousAmount = 100000;
        const currentAmount = 115000;

        const result = service.analyzePayrollVariance(previousAmount, currentAmount);

        expect(result.variance).toBe(15000);
        expect(result.percentChange).toBe(15);
        expect(result.isSignificant).toBe(true); // >10% threshold
      });

      test('should flag normal variance', () => {
        const previousAmount = 100000;
        const currentAmount = 103000;

        const result = service.analyzePayrollVariance(previousAmount, currentAmount);

        expect(result.variance).toBe(3000);
        expect(result.percentChange).toBe(3);
        expect(result.isSignificant).toBe(false); // <10% threshold
      });
    });
  });

  describe('Audit Trail', () => {
    describe('createReconciliationRecord', () => {
      test('should create reconciliation audit record', async () => {
        const reconciliationData = {
          payrollRunId: 'run-123',
          reconciledBy: 'user-456',
          isReconciled: true,
          discrepancies: [],
          notes: 'All amounts match'
        };

        mockPayrollRepository.createReconciliationRecord = jest.fn().mockResolvedValue({
          id: 'recon-789',
          ...reconciliationData
        });

        const result = await service.createReconciliationRecord(
          reconciliationData,
          'org-789'
        );

        expect(result.id).toBe('recon-789');
        expect(result.is_reconciled).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.findPayrollRunById = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.reconcilePayrollRun('run-123', 'org-789')
      ).rejects.toThrow('Database error');
    });

    test('should handle missing payroll run', async () => {
      mockPayrollRepository.findPayrollRunById = jest.fn().mockResolvedValue(null);

      await expect(
        service.reconcilePayrollRun('nonexistent', 'org-789')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rounding differences', () => {
      const grossPay = 5000.00;
      const taxes = 1000.33;
      const deductions = 249.67;
      const expectedNet = 3750.00;

      const result = service.reconcileNetPay(grossPay, taxes, deductions, expectedNet);

      expect(result.isCorrect).toBe(true);
      expect(Math.abs(result.difference)).toBeLessThan(0.01);
    });

    test('should handle zero-dollar paychecks', async () => {
      const mockPayrollRun = {
        id: 'run-123',
        gross_pay: 5000,
        total_taxes: 1000,
        net_pay: 3750
      };

      const mockPaychecks = [
        { gross_pay: 5000, total_taxes: 1000, net_pay: 3750 },
        { gross_pay: 0, total_taxes: 0, net_pay: 0 } // Unpaid leave
      ];

      mockPayrollRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
      mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

      const result = await service.reconcilePayrollRun('run-123', 'org-789');

      expect(result.isReconciled).toBe(true);
    });

    test('should handle manual adjustments', async () => {
      const mockPaychecks = [
        {
          gross_pay: 5000,
          total_taxes: 1000,
          net_pay: 3750,
          adjustments: 100 // Manual adjustment
        }
      ];

      mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

      const result = await service.reconcileDeductions('run-123', 'org-789');

      expect(result.totalAdjustments).toBe(100);
    });
  });
});
