/**
 * EmployeeService Unit Tests
 * Tests business logic for employee management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mapEmployeeDbToApi, mapEmployeesDbToApi } from '../../../../src/products/nexus/dto/employeeDto.js';

// Mock dependencies BEFORE importing service
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service AFTER mocks
const { default: EmployeeService } = await import('../../../../src/products/nexus/services/employeeService.js');

describe('EmployeeService', () => {
  let service;
  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';
  const mockEmpId = 'emp-789';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeeService();
  });

  describe('createEmployee', () => {
    const validEmpData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      employee_number: 'EMP001'
    };

    it('should create employee successfully', async () => {
      const mockCreated = { id: mockEmpId, ...validEmpData };
      
      mockQuery.mockResolvedValueOnce({ rows: [] }) // Check email
        .mockResolvedValueOnce({ rows: [] }) // Check employee number
        .mockResolvedValueOnce({ rows: [mockCreated] }) // Insert employee
        .mockResolvedValueOnce({ rows: [] }); // Create payroll config

      const result = await service.createEmployee(validEmpData, mockOrgId, mockUserId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(mockCreated));
      expect(mockQuery).toHaveBeenCalledTimes(4); // email check + number check + insert + payroll config
    });

    it('should throw error if required fields missing', async () => {
      await expect(
        service.createEmployee({ first_name: 'John' }, mockOrgId, mockUserId)
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error if email format invalid', async () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email'
      };

      await expect(
        service.createEmployee(invalidData, mockOrgId, mockUserId)
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error if email already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-emp' }] });

      await expect(
        service.createEmployee(validEmpData, mockOrgId, mockUserId)
      ).rejects.toThrow('already exists');
    });

    it('should throw error if employee number already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }) // Email check passes
        .mockResolvedValueOnce({ rows: [{ id: 'existing-emp' }] }); // Number exists

      await expect(
        service.createEmployee(validEmpData, mockOrgId, mockUserId)
      ).rejects.toThrow('already exists');
    });

    it('should default employment_status to active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...validEmpData, employment_status: 'active' }] });

      await service.createEmployee(validEmpData, mockOrgId, mockUserId);

      const createCall = mockQuery.mock.calls[2];
      expect(createCall[1][10]).toBe('active'); // employment_status parameter
    });

    it('should default employment_type to full_time', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...validEmpData, employment_type: 'full_time' }] });

      await service.createEmployee(validEmpData, mockOrgId, mockUserId);

      const createCall = mockQuery.mock.calls[2];
      expect(createCall[1][11]).toBe('full_time'); // employment_type parameter
    });
  });

  describe('getEmployee', () => {
    it('should get employee with department and location', async () => {
      const mockEmp = {
        id: mockEmpId,
        first_name: 'John',
        last_name: 'Doe',
        department_name: 'Engineering',
        location_name: 'New York',
        manager_name: 'Jane Smith'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmp] });

      const result = await service.getEmployee(mockEmpId, mockOrgId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(mockEmp));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('department_name'),
        [mockEmpId, mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getEmployee('non-existent', mockOrgId)
      ).rejects.toThrow('not found');
    });

    it('should include manager name', async () => {
      const mockEmp = {
        id: mockEmpId,
        first_name: 'John',
        manager_name: 'Jane Smith'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmp] });

      const result = await service.getEmployee(mockEmpId, mockOrgId);

      // Expect DTO-transformed camelCase property
      expect(result.managerName).toBe('Jane Smith');
    });
  });

  describe('listEmployees', () => {
    const mockEmps = [
      { id: 'emp-1', first_name: 'John', last_name: 'Doe' },
      { id: 'emp-2', first_name: 'Jane', last_name: 'Smith' }
    ];

    it('should list all employees with pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.listEmployees({}, mockOrgId);

      // Expect DTO-transformed array
      expect(result.employees).toEqual(mapEmployeesDbToApi(mockEmps));
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should exclude terminated employees by default', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({}, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('employment_status != \'terminated\'');
    });

    it('should include terminated employees when specified', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({}, mockOrgId, { includeTerminated: true });

      expect(mockQuery.mock.calls[0][0]).not.toContain('employment_status != \'terminated\'');
    });

    it('should filter by departmentId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({ departmentId: 'dept-123' }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('e.department_id = $');
    });

    it('should filter by locationId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({ locationId: 'loc-456' }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('e.location_id = $');
    });

    it('should filter by employmentStatus', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({ employmentStatus: 'active' }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('e.employment_status = $');
    });

    it('should apply custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockEmps })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listEmployees({}, mockOrgId, { limit: 10, offset: 5 });

      expect(mockQuery.mock.calls[0][1]).toContain(10);
      expect(mockQuery.mock.calls[0][1]).toContain(5);
    });
  });

  describe('updateEmployee', () => {
    const existingEmp = {
      id: mockEmpId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com'
    };

    it('should update employee successfully', async () => {
      const updateData = { job_title: 'Senior Developer' };
      const mockUpdated = { ...existingEmp, ...updateData };

      mockQuery.mockResolvedValueOnce({ rows: [existingEmp] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await service.updateEmployee(mockEmpId, updateData, mockOrgId, mockUserId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(mockUpdated));
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateEmployee('non-existent', {}, mockOrgId, mockUserId)
      ).rejects.toThrow('not found');
    });

    it('should validate email uniqueness when changed', async () => {
      const updateData = { email: 'new.email@example.com' };

      mockQuery.mockResolvedValueOnce({ rows: [existingEmp] })
        .mockResolvedValueOnce({ rows: [{ id: 'other-emp' }] }); // Email exists

      await expect(
        service.updateEmployee(mockEmpId, updateData, mockOrgId, mockUserId)
      ).rejects.toThrow('already exists');
    });

    it('should not check email if unchanged', async () => {
      const updateData = { email: existingEmp.email, job_title: 'Developer' };

      mockQuery.mockResolvedValueOnce({ rows: [existingEmp] })
        .mockResolvedValueOnce({ rows: [{ ...existingEmp, ...updateData }] });

      await service.updateEmployee(mockEmpId, updateData, mockOrgId, mockUserId);

      // Should not call email check (only 2 queries: check exists + update)
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return existing employee if no updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [existingEmp] });

      const result = await service.updateEmployee(mockEmpId, {}, mockOrgId, mockUserId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(existingEmp));
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should update multiple fields', async () => {
      const updateData = {
        first_name: 'Jonathan',
        job_title: 'Senior Developer',
        employment_status: 'active'
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingEmp] })
        .mockResolvedValueOnce({ rows: [{ ...existingEmp, ...updateData }] });

      await service.updateEmployee(mockEmpId, updateData, mockOrgId, mockUserId);

      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('first_name = $');
      expect(updateCall[0]).toContain('job_title = $');
      expect(updateCall[0]).toContain('employment_status = $');
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete employee successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEmpId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteEmployee(mockEmpId, mockOrgId, mockUserId);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteEmployee('non-existent', mockOrgId, mockUserId)
      ).rejects.toThrow('not found');
    });

    it('should soft delete employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEmpId }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.deleteEmployee(mockEmpId, mockOrgId, mockUserId);

      // Check that the UPDATE query was called for soft delete
      const deleteCall = mockQuery.mock.calls[1];
      expect(deleteCall[0]).toContain('deleted_at');
      expect(deleteCall[0]).toContain('CURRENT_TIMESTAMP');
    });
  });

  describe('searchEmployees', () => {
    it('should search by first name', async () => {
      const mockEmps = [
        { id: 'emp-1', first_name: 'John', last_name: 'Doe' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEmps });

      const result = await service.searchEmployees('John', mockOrgId);

      // Expect DTO-transformed array
      expect(result).toEqual(mapEmployeesDbToApi(mockEmps));
      expect(mockQuery.mock.calls[0][1][1]).toBe('%John%');
    });

    it('should search by last name', async () => {
      const mockEmps = [
        { id: 'emp-1', first_name: 'John', last_name: 'Doe' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEmps });

      const result = await service.searchEmployees('Doe', mockOrgId);

      // Expect DTO-transformed array
      expect(result).toEqual(mapEmployeesDbToApi(mockEmps));
      expect(mockQuery.mock.calls[0][1][1]).toBe('%Doe%');
    });

    it('should search by last name', async () => {
      const mockEmps = [
        { id: 'emp-1', first_name: 'John', last_name: 'Doe' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEmps });

      await service.searchEmployees('Doe', mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('e.last_name ILIKE');
    });

    it('should search by email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.searchEmployees('john@', mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('e.email ILIKE');
    });

    it('should search by full name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.searchEmployees('John Doe', mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('CONCAT(e.first_name');
    });

    it('should apply pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.searchEmployees('test', mockOrgId, { limit: 10, offset: 5 });

      expect(mockQuery.mock.calls[0][1]).toContain(10);
      expect(mockQuery.mock.calls[0][1]).toContain(5);
    });
  });

  describe('getEmployeeByEmail', () => {
    it('should get employee by email', async () => {
      const mockEmp = {
        id: mockEmpId,
        email: 'john.doe@example.com',
        first_name: 'John'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmp] });

      const result = await service.getEmployeeByEmail('john.doe@example.com', mockOrgId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(mockEmp));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['john.doe@example.com', mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getEmployeeByEmail('notfound@example.com', mockOrgId)
      ).rejects.toThrow('not found');
    });
  });

  describe('getEmployeeByNumber', () => {
    it('should get employee by employee number', async () => {
      const mockEmp = {
        id: mockEmpId,
        employee_number: 'EMP001',
        first_name: 'John'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmp] });

      const result = await service.getEmployeeByNumber('EMP001', mockOrgId);

      // Expect DTO-transformed output
      expect(result).toEqual(mapEmployeeDbToApi(mockEmp));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_number = $1'),
        ['EMP001', mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getEmployeeByNumber('NOTFOUND', mockOrgId)
      ).rejects.toThrow('not found');
    });
  });

  describe('validateEmployeeData', () => {
    it('should validate required fields', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      expect(() => service.validateEmployeeData(validData)).not.toThrow();
    });

    it('should throw error for missing first_name', () => {
      const invalidData = {
        last_name: 'Doe',
        email: 'john@example.com'
      };

      expect(() => service.validateEmployeeData(invalidData)).toThrow('Missing required fields');
    });

    it('should throw error for missing last_name', () => {
      const invalidData = {
        first_name: 'John',
        email: 'john@example.com'
      };

      expect(() => service.validateEmployeeData(invalidData)).toThrow('Missing required fields');
    });

    it('should throw error for missing email', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe'
      };

      expect(() => service.validateEmployeeData(invalidData)).toThrow('Missing required fields');
    });

    it('should throw error for invalid email format', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email'
      };

      expect(() => service.validateEmployeeData(invalidData)).toThrow('Invalid email format');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(service.isValidEmail('john@example.com')).toBe(true);
      expect(service.isValidEmail('john.doe@company.co.uk')).toBe(true);
      expect(service.isValidEmail('john+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(service.isValidEmail('invalid')).toBe(false);
      expect(service.isValidEmail('invalid@')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
      expect(service.isValidEmail('invalid@.com')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createEmployee', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createEmployee({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        }, mockOrgId, mockUserId)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in searchEmployees', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.searchEmployees('test', mockOrgId)
      ).rejects.toThrow('Database error');
    });
  });
});




