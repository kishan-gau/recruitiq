/**
 * Payroll Repository Tests
 * 
 * Unit tests for PayrollRepository CRUD operations.
 */

import { jest } from '@jest/globals';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';
import db from '../../../../src/config/database.js';

// Mock database

describe('PayrollRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    repository = new PayrollRepository();
    mockDb = db;
    jest.clearAllMocks();
  });

  describe('Employee Records', () => {
    describe('createEmployeeRecord', () => {
      test('should create employee record successfully', async () => {
        const employeeData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'ach',
          currency: 'SRD',
          status: 'active',
          startDate: '2024-01-15'
        };

        const mockCreated = {
          id: 'record-456',
          ...employeeData,
          organization_id: 'org-789',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createEmployeeRecord(
          employeeData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(mockDb).toHaveBeenCalledWith('paylinq_employee_records');
      });

      test('should include organizationId in created record', async () => {
        const employeeData = {
          employeeId: 'emp-123',
          employeeNumber: 'EMP-001',
          payFrequency: 'monthly',
          paymentMethod: 'ach',
          status: 'active',
          startDate: '2024-01-15'
        };

        let insertedData;
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            insertedData = data;
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'record-123', ...data }])
            };
          })
        });

        await repository.createEmployeeRecord(employeeData, 'org-specific', 'user-123');

        expect(insertedData.organization_id).toBe('org-specific');
      });

      test('should handle database errors', async () => {
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockRejectedValue(new Error('Unique constraint violation'))
        });

        await expect(
          repository.createEmployeeRecord({}, 'org-123', 'user-123')
        ).rejects.toThrow('Unique constraint violation');
      });
    });

    describe('findByEmployeeId', () => {
      test('should find employee by employeeId', async () => {
        const mockEmployee = {
          id: 'record-123',
          employee_id: 'emp-456',
          status: 'active',
          organization_id: 'org-789'
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockEmployee)
        });

        const result = await repository.findByEmployeeId('emp-456', 'org-789');

        expect(result).toEqual(mockEmployee);
        expect(mockDb).toHaveBeenCalledWith('paylinq_employee_records');
      });

      test('should return null if not found', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null)
        });

        const result = await repository.findByEmployeeId('nonexistent', 'org-123');

        expect(result).toBeNull();
      });

      test('should enforce tenant isolation', async () => {
        let whereClauses = [];
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockImplementation((clause) => {
            whereClauses.push(clause);
            return {
              andWhere: jest.fn().mockImplementation((andClause) => {
                whereClauses.push(andClause);
                return {
                  first: jest.fn().mockResolvedValue(null)
                };
              })
            };
          })
        });

        await repository.findByEmployeeId('emp-123', 'org-specific');

        expect(whereClauses).toContainEqual(
          expect.objectContaining({ organization_id: 'org-specific' })
        );
      });
    });

    describe('updateEmployeeRecord', () => {
      test('should update employee record', async () => {
        const updates = {
          status: 'inactive',
          paymentMethod: 'check'
        };

        const mockUpdated = {
          id: 'record-123',
          status: 'inactive',
          payment_method: 'check',
          updated_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockUpdated])
        });

        const result = await repository.updateEmployeeRecord(
          'record-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockUpdated);
      });

      test('should include updatedAt timestamp', async () => {
        let updateData;
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockImplementation((data) => {
            updateData = data;
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'record-123', ...data }])
            };
          })
        });

        await repository.updateEmployeeRecord('record-123', { status: 'active' }, 'org-123', 'user-123');

        expect(updateData.updated_at).toBeDefined();
        expect(updateData.updated_by).toBe('user-123');
      });
    });

    describe('findByOrganization', () => {
      test('should find all employees for organization', async () => {
        const mockEmployees = [
          { id: 'record-1', employee_id: 'emp-1', status: 'active' },
          { id: 'record-2', employee_id: 'emp-2', status: 'active' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockResolvedValue(mockEmployees)
        });

        const result = await repository.findByOrganization('org-123');

        expect(result).toEqual(mockEmployees);
        expect(result).toHaveLength(2);
      });

      test('should filter by status if provided', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue([])
        });

        await repository.findByOrganization('org-123', { status: 'active' });

        expect(mockDb).toHaveBeenCalledWith('paylinq_employee_records');
      });
    });
  });

  describe('Compensation', () => {
    describe('createCompensation', () => {
      test('should create compensation record', async () => {
        const compensationData = {
          employeeRecordId: 'record-123',
          compensationType: 'salary',
          payRate: 75000,
          payPeriod: 'month',
          effectiveFrom: '2024-01-01',
          isCurrent: true
        };

        const mockCreated = {
          id: 'comp-456',
          ...compensationData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createCompensation(
          compensationData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.pay_rate).toBe(75000);
      });
    });

    describe('findCurrentCompensation', () => {
      test('should find current compensation for employee', async () => {
        const mockCompensation = {
          id: 'comp-123',
          employee_id: 'record-456',
          compensation_type: 'salary',
          pay_rate: 80000,
          is_current: true
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockCompensation)
        });

        const result = await repository.findCurrentCompensation('record-456', 'org-789');

        expect(result).toEqual(mockCompensation);
        expect(result.is_current).toBe(true);
      });

      test('should return null if no current compensation', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null)
        });

        const result = await repository.findCurrentCompensation('record-123', 'org-789');

        expect(result).toBeNull();
      });
    });
  });

  describe('Payroll Runs', () => {
    describe('createPayrollRun', () => {
      test('should create payroll run', async () => {
        const runData = {
          runNumber: 'PR-2024-001',
          runName: 'January 2024 Payroll',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          paymentDate: '2024-02-05',
          status: 'draft'
        };

        const mockCreated = {
          id: 'run-123',
          ...runData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createPayrollRun(runData, 'org-789', 'user-123');

        expect(result).toEqual(mockCreated);
        expect(result.status).toBe('draft');
      });
    });

    describe('findPayrollRunById', () => {
      test('should find payroll run by ID', async () => {
        const mockRun = {
          id: 'run-123',
          run_number: 'PR-2024-001',
          status: 'calculated',
          organization_id: 'org-789'
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockRun)
        });

        const result = await repository.findPayrollRunById('run-123', 'org-789');

        expect(result).toEqual(mockRun);
      });

      test('should enforce tenant isolation for payroll runs', async () => {
        let whereClauses = [];
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockImplementation((clause) => {
            whereClauses.push(clause);
            return {
              andWhere: jest.fn().mockImplementation((andClause) => {
                whereClauses.push(andClause);
                return {
                  first: jest.fn().mockResolvedValue(null)
                };
              })
            };
          })
        });

        await repository.findPayrollRunById('run-123', 'org-specific');

        expect(whereClauses).toContainEqual(
          expect.objectContaining({ organization_id: 'org-specific' })
        );
      });
    });

    describe('updatePayrollRunSummary', () => {
      test('should update payroll run summary', async () => {
        const summary = {
          totalEmployees: 50,
          totalGrossPay: 250000,
          totalNetPay: 200000,
          totalTaxes: 50000,
          status: 'calculated',
          calculatedAt: new Date()
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 'run-123', ...summary }])
        });

        const result = await repository.updatePayrollRunSummary(
          'run-123',
          summary,
          'org-789',
          'user-123'
        );

        expect(result.status).toBe('calculated');
        expect(result.total_employees).toBe(50);
      });
    });
  });

  describe('Paychecks', () => {
    describe('createPaycheck', () => {
      test('should create paycheck', async () => {
        const paycheckData = {
          payrollRunId: 'run-123',
          employeeRecordId: 'record-456',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          paymentDate: '2024-02-05',
          grossPay: 5000,
          netPay: 4000,
          paymentMethod: 'ach',
          paymentStatus: 'pending'
        };

        const mockCreated = {
          id: 'paycheck-789',
          ...paycheckData,
          check_number: 'CHK-001',
          organization_id: 'org-123',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createPaycheck(paycheckData, 'org-123', 'user-123');

        expect(result).toEqual(mockCreated);
        expect(result.gross_pay).toBe(5000);
        expect(result.net_pay).toBe(4000);
      });

      test('should generate check number', async () => {
        let insertedData;
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            insertedData = data;
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'paycheck-123', ...data }])
            };
          })
        });

        await repository.createPaycheck({}, 'org-123', 'user-123');

        expect(insertedData.check_number).toMatch(/^CHK-\d+$/);
      });
    });

    describe('findPaychecks', () => {
      test('should find paychecks by payroll run', async () => {
        const mockPaychecks = [
          { id: 'paycheck-1', gross_pay: 5000, net_pay: 4000 },
          { id: 'paycheck-2', gross_pay: 6000, net_pay: 4800 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockPaychecks)
        });

        const result = await repository.findPaychecks(
          { payrollRunId: 'run-123' },
          'org-789'
        );

        expect(result).toEqual(mockPaychecks);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Timesheets', () => {
    describe('createTimesheet', () => {
      test('should create timesheet', async () => {
        const timesheetData = {
          employeeRecordId: 'record-123',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-07',
          regularHours: 40,
          overtimeHours: 5,
          totalHours: 45,
          status: 'submitted'
        };

        const mockCreated = {
          id: 'timesheet-456',
          ...timesheetData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createTimesheet(timesheetData, 'org-789', 'user-123');

        expect(result).toEqual(mockCreated);
        expect(result.total_hours).toBe(45);
      });
    });

    describe('findTimesheets', () => {
      test('should find timesheets for employee', async () => {
        const mockTimesheets = [
          { id: 'ts-1', total_hours: 40, status: 'approved' },
          { id: 'ts-2', total_hours: 42, status: 'approved' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockTimesheets)
        });

        const result = await repository.findTimesheets(
          { employeeRecordId: 'record-123', status: 'approved' },
          'org-789'
        );

        expect(result).toEqual(mockTimesheets);
      });
    });
  });

  describe('Tenant Isolation', () => {
    test('should always include organizationId in queries', async () => {
      const methods = [
        'findByEmployeeId',
        'findPayrollRunById',
        'findCurrentCompensation'
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
                  first: jest.fn().mockResolvedValue(null),
                  orderBy: jest.fn().mockReturnThis()
                };
              })
            };
          })
        });

        if (method === 'findByEmployeeId') {
          await repository[method]('emp-123', 'org-test');
        } else if (method === 'findPayrollRunById') {
          await repository[method]('run-123', 'org-test');
        } else if (method === 'findCurrentCompensation') {
          await repository[method]('record-123', 'org-test');
        }

        const hasOrgFilter = whereClauses.some(clause => 
          clause && clause.organization_id === 'org-test'
        );

        expect(hasOrgFilter).toBe(true);
      }
    });
  });
});
