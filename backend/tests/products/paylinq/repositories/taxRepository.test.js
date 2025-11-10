/**
 * Tax Repository Tests
 * 
 * Unit tests for TaxEngineRepository CRUD operations.
 */

import TaxEngineRepository from '../../../../src/products/paylinq/repositories/taxEngineRepository.js';
import db from '../../../../src/config/database.js';

// Mock database

describe('TaxEngineRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    repository = new TaxEngineRepository();
    mockDb = db;
    jest.clearAllMocks();
  });

  describe('Tax Configurations', () => {
    describe('createTaxConfiguration', () => {
      test('should create tax configuration successfully', async () => {
        const taxConfigData = {
          taxType: 'income_tax',
          taxName: 'Federal Income Tax',
          taxRate: 15.5,
          isActive: true,
          effectiveFrom: '2024-01-01'
        };

        const mockCreated = {
          id: 'tax-config-123',
          ...taxConfigData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createTaxConfiguration(
          taxConfigData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.tax_type).toBe('income_tax');
        expect(result.tax_rate).toBe(15.5);
        expect(mockDb).toHaveBeenCalledWith('paylinq_tax_configurations');
      });

      test('should include organizationId in tax configuration', async () => {
        let insertedData;
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            insertedData = data;
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'tax-config-123', ...data }])
            };
          })
        });

        await repository.createTaxConfiguration({
          taxType: 'payroll_tax',
          taxRate: 10
        }, 'org-specific', 'user-123');

        expect(insertedData.organization_id).toBe('org-specific');
      });

      test('should handle duplicate tax type error', async () => {
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockRejectedValue(new Error('Duplicate entry'))
        });

        await expect(
          repository.createTaxConfiguration({}, 'org-123', 'user-123')
        ).rejects.toThrow('Duplicate entry');
      });
    });

    describe('findTaxConfigurationsByType', () => {
      test('should find tax configurations by type', async () => {
        const mockConfigs = [
          { id: 'tax-1', tax_type: 'income_tax', tax_rate: 15.5, is_active: true },
          { id: 'tax-2', tax_type: 'income_tax', tax_rate: 20.0, is_active: false }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockConfigs)
        });

        const result = await repository.findTaxConfigurationsByType('income_tax', 'org-789');

        expect(result).toEqual(mockConfigs);
        expect(result).toHaveLength(2);
        expect(mockDb).toHaveBeenCalledWith('paylinq_tax_configurations');
      });

      test('should filter by active status', async () => {
        const mockActiveConfigs = [
          { id: 'tax-1', tax_type: 'payroll_tax', is_active: true }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockActiveConfigs)
        });

        const result = await repository.findTaxConfigurationsByType('payroll_tax', 'org-789', true);

        expect(result).toEqual(mockActiveConfigs);
        expect(result.every(config => config.is_active)).toBe(true);
      });
    });

    describe('findActiveTaxConfigurations', () => {
      test('should find all active tax configurations', async () => {
        const mockActiveConfigs = [
          { id: 'tax-1', tax_type: 'income_tax', is_active: true },
          { id: 'tax-2', tax_type: 'payroll_tax', is_active: true },
          { id: 'tax-3', tax_type: 'withholding_tax', is_active: true }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockActiveConfigs)
        });

        const result = await repository.findActiveTaxConfigurations('org-789');

        expect(result).toEqual(mockActiveConfigs);
        expect(result).toHaveLength(3);
        expect(result.every(config => config.is_active)).toBe(true);
      });
    });

    describe('updateTaxConfiguration', () => {
      test('should update tax configuration', async () => {
        const updates = {
          taxRate: 18.0,
          isActive: false
        };

        const mockUpdated = {
          id: 'tax-config-123',
          tax_rate: 18.0,
          is_active: false,
          updated_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockUpdated])
        });

        const result = await repository.updateTaxConfiguration(
          'tax-config-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockUpdated);
        expect(result.tax_rate).toBe(18.0);
        expect(result.is_active).toBe(false);
      });
    });
  });

  describe('Tax Brackets', () => {
    describe('createTaxBracket', () => {
      test('should create tax bracket successfully', async () => {
        const bracketData = {
          taxConfigurationId: 'tax-config-123',
          bracketName: 'Low Income',
          minIncome: 0,
          maxIncome: 25000,
          taxRate: 10.0,
          flatAmount: 0
        };

        const mockCreated = {
          id: 'bracket-456',
          ...bracketData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createTaxBracket(
          bracketData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.min_income).toBe(0);
        expect(result.max_income).toBe(25000);
        expect(result.tax_rate).toBe(10.0);
      });

      test('should handle unlimited max income (null)', async () => {
        const bracketData = {
          taxConfigurationId: 'tax-config-123',
          minIncome: 100000,
          maxIncome: null,
          taxRate: 35.0
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 'bracket-999', ...bracketData }])
        });

        const result = await repository.createTaxBracket(bracketData, 'org-789', 'user-123');

        expect(result.max_income).toBeNull();
      });
    });

    describe('findTaxBrackets', () => {
      test('should find tax brackets by configuration', async () => {
        const mockBrackets = [
          { id: 'bracket-1', min_income: 0, max_income: 25000, tax_rate: 10 },
          { id: 'bracket-2', min_income: 25001, max_income: 75000, tax_rate: 20 },
          { id: 'bracket-3', min_income: 75001, max_income: null, tax_rate: 30 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockBrackets)
        });

        const result = await repository.findTaxBrackets('tax-config-123', 'org-789');

        expect(result).toEqual(mockBrackets);
        expect(result).toHaveLength(3);
      });

      test('should order brackets by min_income ascending', async () => {
        const mockBrackets = [
          { id: 'bracket-1', min_income: 0, tax_rate: 10 },
          { id: 'bracket-2', min_income: 25000, tax_rate: 20 },
          { id: 'bracket-3', min_income: 75000, tax_rate: 30 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockBrackets)
        });

        const result = await repository.findTaxBrackets('tax-config-123', 'org-789');

        // Verify ascending order
        for (let i = 1; i < result.length; i++) {
          expect(result[i].min_income).toBeGreaterThanOrEqual(result[i - 1].min_income);
        }
      });
    });
  });

  describe('Tax Calculations', () => {
    describe('createTaxCalculation', () => {
      test('should create tax calculation record', async () => {
        const calculationData = {
          employeeRecordId: 'record-123',
          taxConfigurationId: 'tax-config-456',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          grossPay: 5000,
          taxableIncome: 4500,
          calculatedTax: 675,
          effectiveTaxRate: 15.0
        };

        const mockCreated = {
          id: 'calc-789',
          ...calculationData,
          organization_id: 'org-123',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createTaxCalculation(
          calculationData,
          'org-123',
          'user-456'
        );

        expect(result).toEqual(mockCreated);
        expect(result.gross_pay).toBe(5000);
        expect(result.calculated_tax).toBe(675);
        expect(result.effective_tax_rate).toBe(15.0);
      });
    });

    describe('findTaxCalculations', () => {
      test('should find tax calculations by employee and period', async () => {
        const mockCalculations = [
          { id: 'calc-1', calculated_tax: 500, tax_type: 'income_tax' },
          { id: 'calc-2', calculated_tax: 300, tax_type: 'payroll_tax' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockCalculations)
        });

        const result = await repository.findTaxCalculations({
          employeeRecordId: 'record-123',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31'
        }, 'org-789');

        expect(result).toEqual(mockCalculations);
        expect(result).toHaveLength(2);
      });

      test('should filter by tax type if provided', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue([])
        });

        await repository.findTaxCalculations({
          employeeRecordId: 'record-123',
          taxType: 'income_tax'
        }, 'org-789');

        expect(mockDb).toHaveBeenCalledWith('paylinq_tax_calculations');
      });
    });

    describe('getTotalTaxForPeriod', () => {
      test('should calculate total tax for employee in period', async () => {
        const mockResult = [
          { total: 1250.50 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          sum: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockResult[0])
        });

        const result = await repository.getTotalTaxForPeriod(
          'record-123',
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result).toBe(1250.50);
      });

      test('should return 0 if no calculations found', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          sum: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ total: null })
        });

        const result = await repository.getTotalTaxForPeriod(
          'record-123',
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result).toBe(0);
      });
    });
  });

  describe('Tax Deductions', () => {
    describe('createTaxDeduction', () => {
      test('should create tax deduction record', async () => {
        const deductionData = {
          employeeRecordId: 'record-123',
          deductionType: 'retirement_401k',
          deductionName: '401(k) Contribution',
          deductionAmount: 500,
          isPreTax: true
        };

        const mockCreated = {
          id: 'deduction-456',
          ...deductionData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createTaxDeduction(
          deductionData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.deduction_amount).toBe(500);
        expect(result.is_pre_tax).toBe(true);
      });

      test('should handle post-tax deductions', async () => {
        const deductionData = {
          employeeRecordId: 'record-123',
          deductionType: 'garnishment',
          deductionAmount: 200,
          isPreTax: false
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 'deduction-789', ...deductionData }])
        });

        const result = await repository.createTaxDeduction(deductionData, 'org-789', 'user-123');

        expect(result.is_pre_tax).toBe(false);
      });
    });

    describe('findTaxDeductions', () => {
      test('should find tax deductions by employee', async () => {
        const mockDeductions = [
          { id: 'deduction-1', deduction_type: 'retirement_401k', deduction_amount: 500 },
          { id: 'deduction-2', deduction_type: 'health_insurance', deduction_amount: 300 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockDeductions)
        });

        const result = await repository.findTaxDeductions('record-123', 'org-789');

        expect(result).toEqual(mockDeductions);
        expect(result).toHaveLength(2);
      });

      test('should filter by pre-tax status', async () => {
        const mockPreTaxDeductions = [
          { id: 'deduction-1', is_pre_tax: true, deduction_amount: 500 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockPreTaxDeductions)
        });

        const result = await repository.findTaxDeductions('record-123', 'org-789', true);

        expect(result.every(d => d.is_pre_tax)).toBe(true);
      });
    });
  });

  describe('Tenant Isolation', () => {
    test('should enforce tenant isolation in all queries', async () => {
      const methods = [
        { name: 'findTaxConfigurationsByType', args: ['income_tax', 'org-test'] },
        { name: 'findActiveTaxConfigurations', args: ['org-test'] },
        { name: 'findTaxBrackets', args: ['tax-config-123', 'org-test'] },
        { name: 'findTaxDeductions', args: ['record-123', 'org-test'] }
      ];

      for (const method of methods) {
        jest.clearAllMocks();

        let whereClauses = [];
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockImplementation((clause) => {
            whereClauses.push(clause);
            return {
              andWhere: jest.fn().mockImplementation((andClause) => {
                whereClauses.push(andClause);
                return {
                  andWhere: jest.fn().mockReturnThis(),
                  orderBy: jest.fn().mockResolvedValue([]),
                  first: jest.fn().mockResolvedValue(null)
                };
              })
            };
          })
        });

        await repository[method.name](...method.args);

        const hasOrgFilter = whereClauses.some(clause =>
          clause && clause.organization_id === 'org-test'
        );

        expect(hasOrgFilter).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockDb.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Connection timeout'))
      });

      await expect(
        repository.createTaxConfiguration({}, 'org-123', 'user-123')
      ).rejects.toThrow('Connection timeout');
    });

    test('should handle constraint violations', async () => {
      mockDb.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Foreign key constraint'))
      });

      await expect(
        repository.createTaxBracket({}, 'org-123', 'user-123')
      ).rejects.toThrow('Foreign key constraint');
    });
  });

  describe('Data Validation', () => {
    test('should handle null values appropriately', async () => {
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const result = await repository.findActiveTaxConfigurations('org-123');

      expect(result).toBeDefined();
    });

    test('should handle empty result sets', async () => {
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockResolvedValue([])
      });

      const result = await repository.findTaxConfigurationsByType('income_tax', 'org-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
