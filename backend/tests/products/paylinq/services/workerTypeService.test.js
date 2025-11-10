/**
 * Worker Type Service Tests
 * 
 * Unit tests for WorkerTypeService business logic.
 */

import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock dependencies

describe('WorkerTypeService', () => {
  let service;
  let mockPayrollRepository;

  beforeEach(() => {
    service = new WorkerTypeService();
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Worker Classification', () => {
    describe('classifyWorker', () => {
      test('should classify as W-2 employee', async () => {
        const workerData = {
          employeeRecordId: 'record-123',
          workerType: 'w2_employee',
          controlLevel: 'high',
          financialControl: 'employer',
          relationshipType: 'continuing'
        };

        mockPayrollRepository.updateEmployeeWorkerType = jest.fn().mockResolvedValue({
          id: 'record-123',
          worker_type: 'w2_employee'
        });

        const result = await service.classifyWorker(workerData, 'org-789', 'user-123');

        expect(result.worker_type).toBe('w2_employee');
      });

      test('should classify as 1099 contractor', async () => {
        const workerData = {
          employeeRecordId: 'record-456',
          workerType: '1099_contractor',
          controlLevel: 'low',
          financialControl: 'self',
          relationshipType: 'project_based'
        };

        mockPayrollRepository.updateEmployeeWorkerType = jest.fn().mockResolvedValue({
          id: 'record-456',
          worker_type: '1099_contractor'
        });

        const result = await service.classifyWorker(workerData, 'org-789', 'user-123');

        expect(result.worker_type).toBe('1099_contractor');
      });

      test('should validate worker type enum', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          workerType: 'invalid_type'
        };

        await expect(
          service.classifyWorker(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('reclassifyWorker', () => {
      test('should reclassify contractor to employee', async () => {
        const mockCurrentClassification = {
          worker_type: '1099_contractor'
        };

        mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockCurrentClassification);
        mockPayrollRepository.updateEmployeeWorkerType = jest.fn().mockResolvedValue({
          id: 'record-123',
          worker_type: 'w2_employee',
          reclassification_date: '2024-06-01'
        });

        const result = await service.reclassifyWorker(
          'record-123',
          'w2_employee',
          '2024-06-01',
          'org-789',
          'user-123'
        );

        expect(result.worker_type).toBe('w2_employee');
        expect(result.reclassification_date).toBeDefined();
      });
    });
  });

  describe('Full-Time vs Part-Time', () => {
    describe('classifyEmploymentStatus', () => {
      test('should classify as full-time based on hours', () => {
        const averageWeeklyHours = 40;
        const result = service.classifyEmploymentStatus(averageWeeklyHours);
        expect(result).toBe('full_time');
      });

      test('should classify as part-time based on hours', () => {
        const averageWeeklyHours = 20;
        const result = service.classifyEmploymentStatus(averageWeeklyHours);
        expect(result).toBe('part_time');
      });

      test('should handle threshold case (30 hours)', () => {
        const averageWeeklyHours = 30;
        const result = service.classifyEmploymentStatus(averageWeeklyHours);
        expect(['full_time', 'part_time']).toContain(result);
      });
    });

    describe('calculateAverageWeeklyHours', () => {
      test('should calculate average from timesheets', async () => {
        const mockTimesheets = [
          { total_hours: 40 },
          { total_hours: 38 },
          { total_hours: 42 },
          { total_hours: 40 }
        ];

        mockPayrollRepository.findTimesheets = jest.fn().mockResolvedValue(mockTimesheets);

        const result = await service.calculateAverageWeeklyHours(
          'record-123',
          '2024-01-01',
          '2024-03-31',
          'org-789'
        );

        expect(result).toBe(40); // Average of 40, 38, 42, 40
      });
    });
  });

  describe('Exempt vs Non-Exempt', () => {
    describe('determineExemptStatus', () => {
      test('should classify as exempt based on salary and duties', () => {
        const employeeData = {
          payType: 'salary',
          annualSalary: 70000,
          duties: 'executive',
          hasAutonomy: true
        };

        const result = service.determineExemptStatus(employeeData);

        expect(result).toBe('exempt');
      });

      test('should classify as non-exempt for hourly workers', () => {
        const employeeData = {
          payType: 'hourly',
          hourlyRate: 25.0
        };

        const result = service.determineExemptStatus(employeeData);

        expect(result).toBe('non_exempt');
      });

      test('should classify as non-exempt if salary below threshold', () => {
        const employeeData = {
          payType: 'salary',
          annualSalary: 40000, // Below $43,888 threshold (2024)
          duties: 'administrative'
        };

        const result = service.determineExemptStatus(employeeData);

        expect(result).toBe('non_exempt');
      });
    });
  });

  describe('Worker Benefits Eligibility', () => {
    describe('checkBenefitsEligibility', () => {
      test('should determine W-2 employee eligible for benefits', async () => {
        const mockEmployee = {
          worker_type: 'w2_employee',
          employment_status: 'full_time',
          hire_date: '2023-06-01' // Over 90 days
        };

        mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockEmployee);

        const result = await service.checkBenefitsEligibility(
          'record-123',
          new Date('2024-01-01'),
          'org-789'
        );

        expect(result.eligible).toBe(true);
        expect(result.healthInsurance).toBe(true);
        expect(result.retirement).toBe(true);
      });

      test('should determine contractor not eligible', async () => {
        const mockEmployee = {
          worker_type: '1099_contractor'
        };

        mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockEmployee);

        const result = await service.checkBenefitsEligibility(
          'record-456',
          new Date('2024-01-01'),
          'org-789'
        );

        expect(result.eligible).toBe(false);
      });

      test('should check waiting period for new hires', async () => {
        const mockEmployee = {
          worker_type: 'w2_employee',
          employment_status: 'full_time',
          hire_date: '2023-12-15' // Less than 90 days
        };

        mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockEmployee);

        const result = await service.checkBenefitsEligibility(
          'record-123',
          new Date('2024-01-01'),
          'org-789'
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('waiting period');
      });

      test('should check part-time employee eligibility', async () => {
        const mockEmployee = {
          worker_type: 'w2_employee',
          employment_status: 'part_time',
          hire_date: '2023-01-01'
        };

        mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockEmployee);

        const result = await service.checkBenefitsEligibility(
          'record-123',
          new Date('2024-01-01'),
          'org-789'
        );

        expect(result.healthInsurance).toBeDefined();
        // Part-time may have limited benefits
      });
    });
  });

  describe('Overtime Eligibility', () => {
    describe('isOvertimeEligible', () => {
      test('should determine non-exempt eligible for OT', () => {
        const employeeData = {
          worker_type: 'w2_employee',
          exempt_status: 'non_exempt'
        };

        const result = service.isOvertimeEligible(employeeData);

        expect(result).toBe(true);
      });

      test('should determine exempt not eligible for OT', () => {
        const employeeData = {
          worker_type: 'w2_employee',
          exempt_status: 'exempt'
        };

        const result = service.isOvertimeEligible(employeeData);

        expect(result).toBe(false);
      });

      test('should determine contractor not eligible for OT', () => {
        const employeeData = {
          worker_type: '1099_contractor'
        };

        const result = service.isOvertimeEligible(employeeData);

        expect(result).toBe(false);
      });
    });
  });

  describe('Worker Compensation Rules', () => {
    describe('getCompensationRules', () => {
      test('should return W-2 employee rules', () => {
        const rules = service.getCompensationRules('w2_employee', 'non_exempt');

        expect(rules.overtimeEligible).toBe(true);
        expect(rules.minimumWage).toBe(true);
        expect(rules.taxWithholding).toBe(true);
        expect(rules.payrollTaxes).toBe(true);
      });

      test('should return contractor rules', () => {
        const rules = service.getCompensationRules('1099_contractor');

        expect(rules.overtimeEligible).toBe(false);
        expect(rules.minimumWage).toBe(false);
        expect(rules.taxWithholding).toBe(false);
        expect(rules.payrollTaxes).toBe(false);
      });

      test('should return exempt employee rules', () => {
        const rules = service.getCompensationRules('w2_employee', 'exempt');

        expect(rules.overtimeEligible).toBe(false);
        expect(rules.minimumWage).toBe(true);
        expect(rules.taxWithholding).toBe(true);
      });
    });
  });

  describe('Compliance Checks', () => {
    describe('validateWorkerClassification', () => {
      test('should validate legitimate contractor classification', () => {
        const classificationData = {
          workerType: '1099_contractor',
          controlLevel: 'low',
          financialControl: 'self',
          relationshipType: 'project_based',
          hasOwnBusiness: true,
          providesOwnTools: true
        };

        const result = service.validateWorkerClassification(classificationData);

        expect(result.isValid).toBe(true);
        expect(result.riskLevel).toBe('low');
      });

      test('should flag potential misclassification', () => {
        const classificationData = {
          workerType: '1099_contractor',
          controlLevel: 'high', // Red flag
          financialControl: 'employer', // Red flag
          relationshipType: 'continuing', // Red flag
          hasOwnBusiness: false,
          providesOwnTools: false
        };

        const result = service.validateWorkerClassification(classificationData);

        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
        expect(result.warnings).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Worker Statistics', () => {
    describe('getWorkerTypeDistribution', () => {
      test('should calculate worker type breakdown', async () => {
        const mockEmployees = [
          { worker_type: 'w2_employee', employment_status: 'full_time' },
          { worker_type: 'w2_employee', employment_status: 'full_time' },
          { worker_type: 'w2_employee', employment_status: 'part_time' },
          { worker_type: '1099_contractor' }
        ];

        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);

        const result = await service.getWorkerTypeDistribution('org-789');

        expect(result.w2_employee.count).toBe(3);
        expect(result.w2_employee.full_time).toBe(2);
        expect(result.w2_employee.part_time).toBe(1);
        expect(result['1099_contractor'].count).toBe(1);
        expect(result.total).toBe(4);
      });
    });

    describe('getExemptStatusDistribution', () => {
      test('should calculate exempt vs non-exempt breakdown', async () => {
        const mockEmployees = [
          { exempt_status: 'exempt' },
          { exempt_status: 'exempt' },
          { exempt_status: 'non_exempt' },
          { exempt_status: 'non_exempt' },
          { exempt_status: 'non_exempt' }
        ];

        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);

        const result = await service.getExemptStatusDistribution('org-789');

        expect(result.exempt).toBe(2);
        expect(result.non_exempt).toBe(3);
        expect(result.exemptPercentage).toBeCloseTo(40, 0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.updateEmployeeWorkerType = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.classifyWorker({
          employeeRecordId: 'record-123',
          workerType: 'w2_employee'
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle employee not found', async () => {
      mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(null);

      await expect(
        service.checkBenefitsEligibility('nonexistent', new Date(), 'org-789')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle seasonal workers', async () => {
      const mockEmployee = {
        worker_type: 'w2_employee',
        employment_status: 'seasonal',
        hire_date: '2023-11-01'
      };

      mockPayrollRepository.findEmployeeRecordById = jest.fn().mockResolvedValue(mockEmployee);

      const result = await service.checkBenefitsEligibility(
        'record-123',
        new Date('2024-01-01'),
        'org-789'
      );

      expect(result.eligible).toBeDefined();
    });

    test('should handle interns and temporary workers', () => {
      const internData = {
          worker_type: 'intern',
        payType: 'hourly'
      };

      const rules = service.getCompensationRules('intern');

      expect(rules).toBeDefined();
    });

    test('should handle zero hours for average calculation', async () => {
      mockPayrollRepository.findTimesheets = jest.fn().mockResolvedValue([]);

      const result = await service.calculateAverageWeeklyHours(
        'record-123',
        '2024-01-01',
        '2024-03-31',
        'org-789'
      );

      expect(result).toBe(0);
    });
  });
});
