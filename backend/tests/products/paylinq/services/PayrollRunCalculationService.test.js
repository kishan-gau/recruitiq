/**
 * PayrollRunCalculationService Unit Tests
 * 
 * VERIFIED METHODS (from source code inspection):
 * 
 * Public Methods:
 * 1. calculatePayrollRunComponents(payrollRunData, employeeComponents, organizationId)
 *    - Returns: Promise<Object> with loontijdvak metadata and processed components
 *    - DTO: No
 * 
 * 2. validatePayrollRunData(payrollRunData)
 *    - Returns: void (throws ValidationError on failure)
 *    - DTO: No
 * 
 * Private Methods (tested indirectly through public methods):
 * 3. _calculateProratingFactor(loontijdvak, actualPeriodStart, actualPeriodEnd)
 * 4. _calculateWorkingDays(startDate, endDate)
 * 5. _processEmployeeComponents(employee, loontijdvak, proratingMetadata, organizationId)
 * 
 * EXPORT PATTERN: ✅ Class export (testable)
 * DTO USAGE: ❌ No DTOs used
 * 
 * DEPENDENCIES:
 * - LoontijdvakService (inject mock)
 * - logger (mock via jest)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayrollRunCalculationService from '../../../../src/products/paylinq/services/PayrollRunCalculationService.js';
import { ValidationError } from '../../../../src/middleware/errorHandler.js';

describe('PayrollRunCalculationService', () => {
  let service;
  let mockLoontijdvakService;
  let mockLogger;

  beforeEach(() => {
    // Mock LoontijdvakService
    mockLoontijdvakService = {
      determineLoontijdvak: jest.fn(),
      getStandardPeriodDays: jest.fn()
    };

    // Inject mock into service
    service = new PayrollRunCalculationService(mockLoontijdvakService);

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should accept loontijdvakService via dependency injection', () => {
      const customService = new PayrollRunCalculationService(mockLoontijdvakService);
      expect(customService.loontijdvakService).toBe(mockLoontijdvakService);
    });

    it('should create default loontijdvakService if none provided', () => {
      const defaultService = new PayrollRunCalculationService();
      expect(defaultService.loontijdvakService).toBeDefined();
    });
  });

  describe('calculatePayrollRunComponents', () => {
    const validPayrollRunData = {
      payPeriodStart: '2025-01-01',
      payPeriodEnd: '2025-01-31',
      payDate: '2025-01-31',
      configuredFrequency: 'monthly'
    };

    const sampleEmployeeComponents = [
      {
        employeeRecordId: 'emp-001',
        employeeName: 'John Doe',
        employeeNumber: 'E001',
        components: [
          {
            componentId: 'comp-001',
            componentName: 'Base Salary',
            componentType: 'earning',
            amount: 5000.00,
            shouldProrate: true
          },
          {
            componentId: 'comp-002',
            componentName: 'Health Insurance',
            componentType: 'deduction',
            amount: 200.00,
            shouldProrate: false
          }
        ]
      }
    ];

    const mockLoontijdvak = {
      type: 'monthly',
      reason: 'Standard monthly payroll',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31')
    };

    beforeEach(() => {
      mockLoontijdvakService.determineLoontijdvak.mockResolvedValue(mockLoontijdvak);
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(31);
    });

    it('should calculate payroll run components with full period (no prorating)', async () => {
      const organizationId = 'org-123';

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        sampleEmployeeComponents,
        organizationId
      );

      // Verify loontijdvak determination was called
      expect(mockLoontijdvakService.determineLoontijdvak).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        expect.any(Date),
        'monthly'
      );

      // Verify result structure
      expect(result).toMatchObject({
        loontijdvak: 'monthly',
        loontijdvakMetadata: mockLoontijdvak
      });

      expect(result.proratingMetadata).toBeDefined();
      expect(result.proratingMetadata.needsProrating).toBe(false);
      expect(result.proratingMetadata.actualDays).toBe(31);
      expect(result.proratingMetadata.standardDays).toBe(31);
      expect(result.proratingMetadata.proratingFactor).toBeCloseTo(1.0, 3);

      // Verify employee components
      expect(result.employeeComponents).toHaveLength(1);
      
      const employee = result.employeeComponents[0];
      expect(employee.employeeRecordId).toBe('emp-001');
      expect(employee.loontijdvak).toBe('monthly');
      expect(employee.wasProrated).toBe(false);
      expect(employee.grossPay).toBe(5000.00);
      expect(employee.deductions).toBe(200.00);
      expect(employee.netPay).toBe(4800.00);

      // Verify components
      expect(employee.components).toHaveLength(2);
      expect(employee.components[0].finalAmount).toBe(5000.00);
      expect(employee.components[0].wasProrated).toBe(false);
      expect(employee.components[1].finalAmount).toBe(200.00);
    });

    it('should calculate payroll run components with partial period (prorating)', async () => {
      const organizationId = 'org-123';
      
      // Mock partial period: 15 days worked instead of 31
      const partialPayrollRunData = {
        ...validPayrollRunData,
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-15' // Only 15 days
      };

      const result = await service.calculatePayrollRunComponents(
        partialPayrollRunData,
        sampleEmployeeComponents,
        organizationId
      );

      // Verify prorating metadata
      expect(result.proratingMetadata.needsProrating).toBe(true);
      expect(result.proratingMetadata.actualDays).toBe(15);
      expect(result.proratingMetadata.standardDays).toBe(31);
      expect(result.proratingMetadata.proratingFactor).toBeCloseTo(15 / 31, 4);

      // Verify employee components were prorated
      const employee = result.employeeComponents[0];
      expect(employee.wasProrated).toBe(true);

      // Base salary should be prorated (shouldProrate: true)
      const baseSalary = employee.components[0];
      expect(baseSalary.originalAmount).toBe(5000.00);
      expect(baseSalary.finalAmount).toBeCloseTo(5000.00 * (15 / 31), 2);
      expect(baseSalary.wasProrated).toBe(true);

      // Health insurance should NOT be prorated (shouldProrate: false)
      const healthInsurance = employee.components[1];
      expect(healthInsurance.originalAmount).toBe(200.00);
      expect(healthInsurance.finalAmount).toBe(200.00);
      expect(healthInsurance.wasProrated).toBe(false);
    });

    it('should handle multiple employees', async () => {
      const organizationId = 'org-123';
      
      const multipleEmployees = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: [
            { componentId: 'c1', componentName: 'Salary', componentType: 'earning', amount: 5000, shouldProrate: true }
          ]
        },
        {
          employeeRecordId: 'emp-002',
          employeeName: 'Jane Smith',
          employeeNumber: 'E002',
          components: [
            { componentId: 'c2', componentName: 'Salary', componentType: 'earning', amount: 6000, shouldProrate: true }
          ]
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        multipleEmployees,
        organizationId
      );

      expect(result.employeeComponents).toHaveLength(2);
      expect(result.employeeComponents[0].employeeRecordId).toBe('emp-001');
      expect(result.employeeComponents[1].employeeRecordId).toBe('emp-002');
      expect(result.employeeComponents[0].grossPay).toBe(5000.00);
      expect(result.employeeComponents[1].grossPay).toBe(6000.00);
    });

    it('should handle employees with no components', async () => {
      const organizationId = 'org-123';
      
      const employeeNoComponents = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: []
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        employeeNoComponents,
        organizationId
      );

      const employee = result.employeeComponents[0];
      expect(employee.components).toHaveLength(0);
      expect(employee.grossPay).toBe(0);
      expect(employee.deductions).toBe(0);
      expect(employee.netPay).toBe(0);
    });

    it('should handle employees with undefined components', async () => {
      const organizationId = 'org-123';
      
      const employeeUndefinedComponents = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001'
          // components is undefined
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        employeeUndefinedComponents,
        organizationId
      );

      const employee = result.employeeComponents[0];
      expect(employee.components).toHaveLength(0);
      expect(employee.grossPay).toBe(0);
    });

    it('should calculate correct totals with mixed earnings and deductions', async () => {
      const organizationId = 'org-123';
      
      const complexComponents = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: [
            { componentId: 'c1', componentName: 'Base Salary', componentType: 'earning', amount: 5000, shouldProrate: true },
            { componentId: 'c2', componentName: 'Bonus', componentType: 'earning', amount: 1000, shouldProrate: false },
            { componentId: 'c3', componentName: 'Health Insurance', componentType: 'deduction', amount: 200, shouldProrate: false },
            { componentId: 'c4', componentName: 'Pension', componentType: 'deduction', amount: 300, shouldProrate: true }
          ]
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        complexComponents,
        organizationId
      );

      const employee = result.employeeComponents[0];
      expect(employee.grossPay).toBe(6000.00); // 5000 + 1000
      expect(employee.deductions).toBe(500.00); // 200 + 300
      expect(employee.netPay).toBe(5500.00); // 6000 - 500
    });

    it('should round amounts to 2 decimal places', async () => {
      const organizationId = 'org-123';
      
      // Use partial period to trigger prorating that creates decimals
      const partialPayrollRunData = {
        ...validPayrollRunData,
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-10' // 10 days
      };

      const employeeWithDecimals = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: [
            { componentId: 'c1', componentName: 'Salary', componentType: 'earning', amount: 5000.00, shouldProrate: true }
          ]
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        partialPayrollRunData,
        employeeWithDecimals,
        organizationId
      );

      const employee = result.employeeComponents[0];
      const component = employee.components[0];
      
      // Verify amounts are rounded to 2 decimals
      expect(component.finalAmount).toEqual(expect.any(Number));
      expect(component.finalAmount.toString()).toMatch(/^\d+\.\d{1,2}$/);
      expect(employee.grossPay.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });

    it('should include calculatedAt timestamp', async () => {
      const organizationId = 'org-123';

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        sampleEmployeeComponents,
        organizationId
      );

      expect(result.calculatedAt).toBeDefined();
      expect(new Date(result.calculatedAt)).toBeInstanceOf(Date);
    });

    it('should attach loontijdvak to each component', async () => {
      const organizationId = 'org-123';

      const result = await service.calculatePayrollRunComponents(
        validPayrollRunData,
        sampleEmployeeComponents,
        organizationId
      );

      const employee = result.employeeComponents[0];
      employee.components.forEach(component => {
        expect(component.loontijdvak).toBe('monthly');
      });
    });

    it('should handle loontijdvakService errors gracefully', async () => {
      const organizationId = 'org-123';
      
      mockLoontijdvakService.determineLoontijdvak.mockRejectedValue(
        new Error('Loontijdvak determination failed')
      );

      await expect(
        service.calculatePayrollRunComponents(
          validPayrollRunData,
          sampleEmployeeComponents,
          organizationId
        )
      ).rejects.toThrow('Loontijdvak determination failed');
    });

    it('should handle weekly loontijdvak', async () => {
      const organizationId = 'org-123';
      
      const weeklyLoontijdvak = {
        type: 'weekly',
        reason: 'Weekly payroll',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-07')
      };

      mockLoontijdvakService.determineLoontijdvak.mockResolvedValue(weeklyLoontijdvak);
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(7);

      const weeklyPayrollData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-07',
        payDate: '2025-01-07',
        configuredFrequency: 'weekly'
      };

      const result = await service.calculatePayrollRunComponents(
        weeklyPayrollData,
        sampleEmployeeComponents,
        organizationId
      );

      expect(result.loontijdvak).toBe('weekly');
      expect(result.proratingMetadata.standardDays).toBe(7);
    });

    it('should handle biweekly loontijdvak', async () => {
      const organizationId = 'org-123';
      
      const biweeklyLoontijdvak = {
        type: 'biweekly',
        reason: 'Biweekly payroll',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-14')
      };

      mockLoontijdvakService.determineLoontijdvak.mockResolvedValue(biweeklyLoontijdvak);
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(14);

      const biweeklyPayrollData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-14',
        payDate: '2025-01-14',
        configuredFrequency: 'biweekly'
      };

      const result = await service.calculatePayrollRunComponents(
        biweeklyPayrollData,
        sampleEmployeeComponents,
        organizationId
      );

      expect(result.loontijdvak).toBe('biweekly');
      expect(result.proratingMetadata.standardDays).toBe(14);
    });
  });

  describe('validatePayrollRunData', () => {
    it('should pass validation for valid payroll run data', () => {
      const validData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(validData)).not.toThrow();
    });

    it('should throw ValidationError if payPeriodStart is missing', () => {
      const invalidData = {
        payPeriodEnd: '2025-01-31',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Pay period start date is required');
    });

    it('should throw ValidationError if payPeriodEnd is missing', () => {
      const invalidData = {
        payPeriodStart: '2025-01-01',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Pay period end date is required');
    });

    it('should throw ValidationError if payDate is missing', () => {
      const invalidData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Pay date is required');
    });

    it('should throw ValidationError if configuredFrequency is missing', () => {
      const invalidData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        payDate: '2025-01-31'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Configured pay frequency is required');
    });

    it('should throw ValidationError if payPeriodStart is invalid date', () => {
      const invalidData = {
        payPeriodStart: 'invalid-date',
        payPeriodEnd: '2025-01-31',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Invalid pay period start date');
    });

    it('should throw ValidationError if payPeriodEnd is invalid date', () => {
      const invalidData = {
        payPeriodStart: '2025-01-01',
        payPeriodEnd: 'invalid-date',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Invalid pay period end date');
    });

    it('should throw ValidationError if start date is after end date', () => {
      const invalidData = {
        payPeriodStart: '2025-01-31',
        payPeriodEnd: '2025-01-01',
        payDate: '2025-01-31',
        configuredFrequency: 'monthly'
      };

      expect(() => service.validatePayrollRunData(invalidData)).toThrow(ValidationError);
      expect(() => service.validatePayrollRunData(invalidData)).toThrow('Pay period start date must be before end date');
    });

    it('should allow start date to equal end date (single day period)', () => {
      const validData = {
        payPeriodStart: '2025-01-15',
        payPeriodEnd: '2025-01-15',
        payDate: '2025-01-15',
        configuredFrequency: 'daily'
      };

      expect(() => service.validatePayrollRunData(validData)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockLoontijdvakService.determineLoontijdvak.mockResolvedValue({
        type: 'monthly',
        reason: 'Standard monthly',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31')
      });
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(31);
    });

    it('should handle zero-amount components', async () => {
      const organizationId = 'org-123';
      
      const zeroAmountComponents = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: [
            { componentId: 'c1', componentName: 'Salary', componentType: 'earning', amount: 0, shouldProrate: true }
          ]
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        {
          payPeriodStart: '2025-01-01',
          payPeriodEnd: '2025-01-31',
          payDate: '2025-01-31',
          configuredFrequency: 'monthly'
        },
        zeroAmountComponents,
        organizationId
      );

      const employee = result.employeeComponents[0];
      expect(employee.grossPay).toBe(0);
      expect(employee.netPay).toBe(0);
    });

    it('should handle negative deductions (refunds)', async () => {
      const organizationId = 'org-123';
      
      const negativeDeduction = [
        {
          employeeRecordId: 'emp-001',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          components: [
            { componentId: 'c1', componentName: 'Salary', componentType: 'earning', amount: 5000, shouldProrate: true },
            { componentId: 'c2', componentName: 'Refund', componentType: 'deduction', amount: -100, shouldProrate: false }
          ]
        }
      ];

      const result = await service.calculatePayrollRunComponents(
        {
          payPeriodStart: '2025-01-01',
          payPeriodEnd: '2025-01-31',
          payDate: '2025-01-31',
          configuredFrequency: 'monthly'
        },
        negativeDeduction,
        organizationId
      );

      const employee = result.employeeComponents[0];
      expect(employee.deductions).toBe(-100);
      expect(employee.netPay).toBe(5100); // 5000 - (-100)
    });

    it('should handle prorating factor close to 1.0 (no prorating)', async () => {
      const organizationId = 'org-123';
      
      // Mock 30.9999 days vs 31 days standard (should not prorate)
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(31);

      const result = await service.calculatePayrollRunComponents(
        {
          payPeriodStart: '2025-01-01',
          payPeriodEnd: '2025-01-31', // 31 days
          payDate: '2025-01-31',
          configuredFrequency: 'monthly'
        },
        [
          {
            employeeRecordId: 'emp-001',
            employeeName: 'John Doe',
            employeeNumber: 'E001',
            components: [
              { componentId: 'c1', componentName: 'Salary', componentType: 'earning', amount: 5000, shouldProrate: true }
            ]
          }
        ],
        organizationId
      );

      // Should not prorate when difference is within rounding tolerance
      expect(result.proratingMetadata.needsProrating).toBe(false);
    });

    it('should handle single-day period', async () => {
      const organizationId = 'org-123';
      
      mockLoontijdvakService.determineLoontijdvak.mockResolvedValue({
        type: 'daily',
        reason: 'Single day payroll',
        periodStart: new Date('2025-01-15'),
        periodEnd: new Date('2025-01-15')
      });
      mockLoontijdvakService.getStandardPeriodDays.mockReturnValue(1);

      const result = await service.calculatePayrollRunComponents(
        {
          payPeriodStart: '2025-01-15',
          payPeriodEnd: '2025-01-15',
          payDate: '2025-01-15',
          configuredFrequency: 'daily'
        },
        [
          {
            employeeRecordId: 'emp-001',
            employeeName: 'John Doe',
            employeeNumber: 'E001',
            components: [
              { componentId: 'c1', componentName: 'Daily Pay', componentType: 'earning', amount: 200, shouldProrate: true }
            ]
          }
        ],
        organizationId
      );

      expect(result.proratingMetadata.actualDays).toBe(1);
      expect(result.proratingMetadata.needsProrating).toBe(false);
    });
  });
});
