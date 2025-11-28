import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayrollService from '../../../src/products/paylinq/services/payrollService.js';
import PayrollRepository from '../../../src/products/paylinq/repositories/payrollRepository.js';

describe('PayrollService - Phase 1 PII Migration', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOrganization: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    // Inject mock into service
    service = new PayrollService(mockRepository);
  });

  describe('createEmployeeRecord - National ID Migration', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';

    it('should extract nationalId from metadata and store in tax_id', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: '2025-01-01',
        metadata: {
          nationalId: '123456789',
          department: 'Engineering'
        }
      };

      // Mock database query to simulate successful insertion
      jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid',
        tax_id: '123456789' // Should be stored here
      });

      const result = await service.createEmployeeRecord(employeeData, organizationId, userId);

      // Verify tax_id was extracted from metadata
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taxId: '123456789'
        })
      );

      // Verify metadata no longer contains nationalId
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({
            nationalId: expect.anything()
          })
        })
      );
    });

    it('should prefer root nationalId over metadata.nationalId', async () => {
      const employeeData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2025-01-01',
        nationalId: '987654321', // Root level (preferred)
        metadata: {
          nationalId: '123456789', // Should be ignored
          department: 'HR'
        }
      };

      jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid',
        tax_id: '987654321'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      // Should use root level nationalId
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taxId: '987654321'
        })
      );
    });

    it('should handle taxIdNumber as alternative field name', async () => {
      const employeeData = {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.j@example.com',
        hireDate: '2025-01-01',
        taxIdNumber: 'TAX-555', // Alternative field name
        metadata: {}
      };

      jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid',
        tax_id: 'TAX-555'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taxId: 'TAX-555'
        })
      );
    });
  });

  describe('createEmployeeRecord - Phone Migration', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';

    it('should extract phone from metadata and store in hris.employee', async () => {
      const employeeData = {
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice.b@example.com',
        hireDate: '2025-01-01',
        metadata: {
          phone: '+597-1234567',
          department: 'Sales'
        }
      };

      const mockInsertQuery = jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      // Check that phone was passed to employee INSERT
      const insertCall = mockInsertQuery.mock.calls.find(call => 
        call[0].includes('INSERT INTO hris.employee')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain('+597-1234567'); // Should be in values array

      // Verify metadata no longer contains phone
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({
            phone: expect.anything()
          })
        })
      );
    });

    it('should prefer root phone over metadata.phone', async () => {
      const employeeData = {
        firstName: 'Charlie',
        lastName: 'Davis',
        email: 'charlie.d@example.com',
        hireDate: '2025-01-01',
        phone: '+597-9999999', // Root level (preferred)
        metadata: {
          phone: '+597-1111111', // Should be ignored
          department: 'IT'
        }
      };

      const mockInsertQuery = jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      const insertCall = mockInsertQuery.mock.calls.find(call => 
        call[0].includes('INSERT INTO hris.employee')
      );
      expect(insertCall[1]).toContain('+597-9999999');
    });

    it('should validate phone format', async () => {
      const employeeData = {
        firstName: 'Invalid',
        lastName: 'Phone',
        email: 'invalid@example.com',
        hireDate: '2025-01-01',
        phone: 'not-a-phone-number' // Invalid format
      };

      // Should throw validation error
      await expect(
        service.createEmployeeRecord(employeeData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('createEmployeeRecord - Date of Birth Migration', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';

    it('should extract dateOfBirth from metadata and validate', async () => {
      const employeeData = {
        firstName: 'David',
        lastName: 'Miller',
        email: 'david.m@example.com',
        hireDate: '2025-01-01',
        metadata: {
          dateOfBirth: '1990-05-15',
          department: 'Finance'
        }
      };

      const mockInsertQuery = jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      // Check that DOB was passed to employee INSERT
      const insertCall = mockInsertQuery.mock.calls.find(call => 
        call[0].includes('INSERT INTO hris.employee')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain('1990-05-15');

      // Verify metadata no longer contains dateOfBirth
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({
            dateOfBirth: expect.anything()
          })
        })
      );
    });

    it('should prefer root dateOfBirth over metadata.dateOfBirth', async () => {
      const employeeData = {
        firstName: 'Eve',
        lastName: 'Wilson',
        email: 'eve.w@example.com',
        hireDate: '2025-01-01',
        dateOfBirth: '1985-12-25', // Root level (preferred)
        metadata: {
          dateOfBirth: '1995-06-30', // Should be ignored
          department: 'Marketing'
        }
      };

      const mockInsertQuery = jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      await service.createEmployeeRecord(employeeData, organizationId, userId);

      const insertCall = mockInsertQuery.mock.calls.find(call => 
        call[0].includes('INSERT INTO hris.employee')
      );
      expect(insertCall[1]).toContain('1985-12-25');
    });

    it('should reject future dates of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const employeeData = {
        firstName: 'Future',
        lastName: 'Person',
        email: 'future@example.com',
        hireDate: '2025-01-01',
        dateOfBirth: futureDate.toISOString().split('T')[0]
      };

      // Should throw validation error
      await expect(
        service.createEmployeeRecord(employeeData, organizationId, userId)
      ).rejects.toThrow();
    });

    it('should reject dates before 1900', async () => {
      const employeeData = {
        firstName: 'Old',
        lastName: 'Person',
        email: 'old@example.com',
        hireDate: '2025-01-01',
        dateOfBirth: '1899-01-01'
      };

      // Should throw validation error
      await expect(
        service.createEmployeeRecord(employeeData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';

    it('should handle employee data with no PII fields', async () => {
      const employeeData = {
        firstName: 'Minimal',
        lastName: 'Data',
        email: 'minimal@example.com',
        hireDate: '2025-01-01',
        metadata: {
          department: 'Operations'
        }
      };

      jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      // Should succeed with null values for PII
      await expect(
        service.createEmployeeRecord(employeeData, organizationId, userId)
      ).resolves.toBeDefined();
    });

    it('should handle employee data with empty metadata', async () => {
      const employeeData = {
        firstName: 'No',
        lastName: 'Metadata',
        email: 'no-meta@example.com',
        hireDate: '2025-01-01',
        metadata: null
      };

      jest.spyOn(service, 'query').mockResolvedValue({
        rows: [{ id: 'employee-uuid' }]
      });

      mockRepository.create.mockResolvedValue({
        id: 'payroll-config-uuid',
        employee_id: 'employee-uuid'
      });

      await expect(
        service.createEmployeeRecord(employeeData, organizationId, userId)
      ).resolves.toBeDefined();

      // Metadata should be null, not an empty object
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null
        })
      );
    });
  });
});
