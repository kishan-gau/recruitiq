/**
 * Payroll Service Tests
 * 
 * Unit tests for PayrollService business logic.
 */

import { jest } from '@jest/globals';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';
import TaxCalculationService from '../../../../src/products/paylinq/services/taxCalculationService.js';
import * as payrollEmitters from '../../../../src/products/paylinq/events/emitters/payrollEmitters.js';

// Mock dependencies
jest.mock('../../../../src/products/paylinq/repositories/payrollRepository.js');
jest.mock('../../../../src/products/paylinq/services/taxCalculationService.js');
jest.mock('../../../../src/products/paylinq/events/emitters/payrollEmitters.js');
jest.mock('../../../../src/utils/logger.js');

describe('PayrollService', () => {
  let service;
  let mockRepository;
  let mockTaxService;

  beforeEach(() => {
    service = new PayrollService();
    mockRepository = PayrollRepository.mock.instances[0];
    mockTaxService = TaxCalculationService.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Employee Record Management', () => {
    describe('createEmployeeRecord', () => {
      test('should create employee record with valid data', async () => {
        const employeeData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'ach',
          currency: 'SRD',
          status: 'active',
          startDate: '2024-01-15',
          bankAccountNumber: '1234567890',
          routingNumber: '987654'
        };

        const mockCreated = {
          id: 'record-456',
          ...employeeData,
          created_at: new Date()
        };

        mockRepository.createEmployeeRecord = jest.fn().mockResolvedValue(mockCreated);

        const result = await service.createEmployeeRecord(
          employeeData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(mockRepository.createEmployeeRecord).toHaveBeenCalledWith(
          employeeData,
          'org-789',
          'user-123'
        );
      });

      test('should validate required fields', async () => {
        const invalidData = {
          employeeId: 'emp-123'
          // Missing required fields
        };

        await expect(
          service.createEmployeeRecord(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate payment method has bank details for ACH', async () => {
        const invalidData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'ach',
          status: 'active',
          startDate: '2024-01-15'
          // Missing bankAccountNumber and routingNumber
        };

        await expect(
          service.createEmployeeRecord(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/bank account/i);
      });

      test('should accept cash payment without bank details', async () => {
        const validData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'cash',
          currency: 'SRD',
          status: 'active',
          startDate: '2024-01-15'
        };

        mockRepository.createEmployeeRecord = jest.fn().mockResolvedValue({
          id: 'record-456',
          ...validData
        });

        await expect(
          service.createEmployeeRecord(validData, 'org-789', 'user-123')
        ).resolves.toBeDefined();
      });

      test('should validate pay frequency enum', async () => {
        const invalidData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'invalid_frequency',
          paymentMethod: 'cash',
          status: 'active',
          startDate: '2024-01-15'
        };

        await expect(
          service.createEmployeeRecord(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate payment method enum', async () => {
        const invalidData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'invalid_method',
          status: 'active',
          startDate: '2024-01-15'
        };

        await expect(
          service.createEmployeeRecord(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('updateEmployeeRecord', () => {
      test('should update employee record', async () => {
        const updates = {
          status: 'inactive',
          paymentMethod: 'check'
        };

        mockRepository.updateEmployeeRecord = jest.fn().mockResolvedValue({
          id: 'record-123',
          ...updates,
          updated_at: new Date()
        });

        const result = await service.updateEmployeeRecord(
          'record-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(mockRepository.updateEmployeeRecord).toHaveBeenCalledWith(
          'record-123',
          updates,
          'org-789',
          'user-123'
        );
      });
    });

    describe('getEmployeeRecord', () => {
      test('should retrieve employee record by ID', async () => {
        const mockEmployee = {
          id: 'record-123',
          employee_id: 'emp-456',
          status: 'active'
        };

        mockRepository.findById = jest.fn().mockResolvedValue(mockEmployee);

        const result = await service.getEmployeeRecord('record-123', 'org-789');

        expect(result).toEqual(mockEmployee);
      });

      test('should throw NotFoundError if employee not found', async () => {
        mockRepository.findById = jest.fn().mockResolvedValue(null);

        await expect(
          service.getEmployeeRecord('nonexistent', 'org-789')
        ).rejects.toThrow('not found');
      });
    });
  });

  describe('Compensation Management', () => {
    describe('createCompensation', () => {
      test('should create compensation record with valid data', async () => {
        const compensationData = {
          employeeRecordId: 'record-123',
          compensationType: 'salary',
          payRate: 75000,
          payPeriod: 'year',
          effectiveFrom: '2024-01-01',
          isCurrent: true
        };

        mockRepository.createCompensation = jest.fn().mockResolvedValue({
          id: 'comp-456',
          ...compensationData
        });

        const result = await service.createCompensation(
          compensationData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.pay_rate).toBe(75000);
      });

      test('should validate compensation type', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          compensationType: 'invalid_type',
          payRate: 1000,
          payPeriod: 'month',
          effectiveFrom: '2024-01-01'
        };

        await expect(
          service.createCompensation(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate positive pay rate', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          compensationType: 'salary',
          payRate: -1000,
          payPeriod: 'year',
          effectiveFrom: '2024-01-01'
        };

        await expect(
          service.createCompensation(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });
  });

  describe('Payroll Run Management', () => {
    describe('createPayrollRun', () => {
      test('should create payroll run with valid data', async () => {
        const runData = {
          runNumber: 'PR-2024-001',
          runName: 'January 2024',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          paymentDate: '2024-02-05',
          status: 'draft'
        };

        mockRepository.createPayrollRun = jest.fn().mockResolvedValue({
          id: 'run-123',
          ...runData
        });

        const result = await service.createPayrollRun(runData, 'org-789', 'user-123');

        expect(result).toBeDefined();
        expect(result.status).toBe('draft');
      });

      test('should validate pay period end after start', async () => {
        const invalidData = {
          runNumber: 'PR-2024-001',
          runName: 'Invalid Period',
          payPeriodStart: '2024-01-31',
          payPeriodEnd: '2024-01-01',
          paymentDate: '2024-02-05',
          status: 'draft'
        };

        await expect(
          service.createPayrollRun(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/period end must be after/i);
      });

      test('should validate payment date after period end', async () => {
        const invalidData = {
          runNumber: 'PR-2024-001',
          runName: 'Invalid Payment',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          paymentDate: '2024-01-15',
          status: 'draft'
        };

        await expect(
          service.createPayrollRun(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/payment date must be/i);
      });

      test('should emit payroll.run.created event', async () => {
        const runData = {
          runNumber: 'PR-2024-001',
          runName: 'January 2024',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          paymentDate: '2024-02-05',
          status: 'draft'
        };

        const mockCreated = { id: 'run-123', ...runData };
        mockRepository.createPayrollRun = jest.fn().mockResolvedValue(mockCreated);

        await service.createPayrollRun(runData, 'org-789', 'user-123');

        expect(payrollEmitters.emitPayrollRunCreated).toHaveBeenCalledWith(mockCreated, 'org-789');
      });
    });

    describe('calculatePayroll', () => {
      test('should calculate payroll for all active employees', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          status: 'draft',
          pay_period_start: '2024-01-01',
          pay_period_end: '2024-01-31',
          payment_date: '2024-02-05'
        };

        const mockEmployees = [
          { id: 'record-1', employee_id: 'emp-1', payment_method: 'ach', pay_frequency: 'monthly' },
          { id: 'record-2', employee_id: 'emp-2', payment_method: 'check', pay_frequency: 'monthly' }
        ];

        const mockCompensation = {
          compensation_type: 'salary',
          pay_rate: 60000
        };

        mockRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
        mockRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);
        mockRepository.findCurrentCompensation = jest.fn().mockResolvedValue(mockCompensation);
        mockRepository.findTimesheets = jest.fn().mockResolvedValue([]);
        mockRepository.createPaycheck = jest.fn().mockResolvedValue({ id: 'paycheck-123' });
        mockRepository.updatePayrollRunSummary = jest.fn().mockResolvedValue({});

        mockTaxService.calculateEmployeeTaxes = jest.fn().mockResolvedValue({
          totalTaxes: 500,
          federalTax: 300,
          stateTax: 200
        });

        const result = await service.calculatePayroll('run-123', 'org-789', 'user-123');

        expect(result).toBeDefined();
        expect(result.totalEmployees).toBe(2);
        expect(mockRepository.createPaycheck).toHaveBeenCalledTimes(2);
      });

      test('should only calculate for draft status', async () => {
        mockRepository.findPayrollRunById = jest.fn().mockResolvedValue({
          id: 'run-123',
          status: 'calculated'
        });

        await expect(
          service.calculatePayroll('run-123', 'org-789', 'user-123')
        ).rejects.toThrow(/cannot calculate/i);
      });

      test('should throw NotFoundError if payroll run not found', async () => {
        mockRepository.findPayrollRunById = jest.fn().mockResolvedValue(null);

        await expect(
          service.calculatePayroll('nonexistent', 'org-789', 'user-123')
        ).rejects.toThrow('not found');
      });

      test('should calculate overtime pay for hourly employees', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          status: 'draft',
          pay_period_start: '2024-01-01',
          pay_period_end: '2024-01-31',
          payment_date: '2024-02-05'
        };

        const mockEmployee = {
          id: 'record-1',
          pay_frequency: 'bi-weekly'
        };

        const mockCompensation = {
          compensation_type: 'hourly',
          pay_rate: 25
        };

        const mockTimesheets = [
          { regular_hours: 40, overtime_hours: 5, total_hours: 45 }
        ];

        mockRepository.findPayrollRunById = jest.fn().mockResolvedValue(mockPayrollRun);
        mockRepository.findByOrganization = jest.fn().mockResolvedValue([mockEmployee]);
        mockRepository.findCurrentCompensation = jest.fn().mockResolvedValue(mockCompensation);
        mockRepository.findTimesheets = jest.fn().mockResolvedValue(mockTimesheets);
        mockRepository.createPaycheck = jest.fn().mockResolvedValue({ id: 'paycheck-123' });
        mockRepository.updatePayrollRunSummary = jest.fn().mockResolvedValue({});

        mockTaxService.calculateEmployeeTaxes = jest.fn().mockResolvedValue({
          totalTaxes: 150
        });

        await service.calculatePayroll('run-123', 'org-789', 'user-123');

        const paycheckCall = mockRepository.createPaycheck.mock.calls[0][0];
        
        // Regular pay: 40 * 25 = 1000
        // Overtime pay: 5 * 25 * 1.5 = 187.5
        // Gross pay: 1187.5
        expect(paycheckCall.regularPay).toBe(1000);
        expect(paycheckCall.overtimePay).toBe(187.5);
        expect(paycheckCall.grossPay).toBe(1187.5);
      });

      test('should emit payroll.run.calculated event', async () => {
        const mockPayrollRun = {
          id: 'run-123',
          status: 'draft',
          pay_period_start: '2024-01-01',
          pay_period_end: '2024-01-31'
        };

        mockRepository.findPayrollRunById = jest.fn()
          .mockResolvedValueOnce(mockPayrollRun)
          .mockResolvedValueOnce({ ...mockPayrollRun, status: 'calculated' });
        mockRepository.findByOrganization = jest.fn().mockResolvedValue([]);
        mockRepository.updatePayrollRunSummary = jest.fn().mockResolvedValue({});

        await service.calculatePayroll('run-123', 'org-789', 'user-123');

        expect(payrollEmitters.emitPayrollRunCalculated).toHaveBeenCalled();
      });
    });
  });

  describe('Timesheet Management', () => {
    describe('createTimesheet', () => {
      test('should create timesheet with valid data', async () => {
        const timesheetData = {
          employeeRecordId: 'record-123',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-07',
          regularHours: 40,
          overtimeHours: 5,
          ptoHours: 0,
          sickHours: 0,
          holidayHours: 0,
          totalHours: 45,
          status: 'draft'
        };

        mockRepository.createTimesheet = jest.fn().mockResolvedValue({
          id: 'timesheet-456',
          ...timesheetData
        });

        const result = await service.createTimesheet(timesheetData, 'org-789', 'user-123');

        expect(result).toBeDefined();
        expect(result.total_hours).toBe(45);
      });

      test('should validate total hours equals sum of hour types', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-07',
          regularHours: 40,
          overtimeHours: 5,
          ptoHours: 0,
          sickHours: 0,
          holidayHours: 0,
          totalHours: 50, // Should be 45
          status: 'draft'
        };

        await expect(
          service.createTimesheet(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('approveTimesheet', () => {
      test('should approve timesheet', async () => {
        mockRepository.updateTimesheet = jest.fn().mockResolvedValue({
          id: 'timesheet-123',
          status: 'approved'
        });

        const result = await service.approveTimesheet('timesheet-123', 'org-789', 'user-123');

        expect(result.status).toBe('approved');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockRepository.createEmployeeRecord = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.createEmployeeRecord({
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'cash',
          status: 'active',
          startDate: '2024-01-15'
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database connection failed');
    });
  });
});
