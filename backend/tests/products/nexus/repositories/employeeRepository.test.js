/**
 * EmployeeRepository Unit Tests
 */

import { jest } from '@jest/globals';
import EmployeeRepository from '../../../src/products/nexus/repositories/employeeRepository.js';

// Mock dependencies
const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/shared/database/query.js', () => ({
  query: mockQuery
}));

describe('EmployeeRepository', () => {
  let repository;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    repository = new EmployeeRepository();
    mockQuery.mockClear();
  });

  describe('findById', () => {
    it('should find employee by ID with joined data', async () => {
      const mockEmployee = {
        id: 'emp-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        employee_number: 'EMP001',
        job_title: 'Software Engineer',
        department_name: 'Engineering',
        location_name: 'New York Office',
        manager_name: 'Jane Smith'
      };

      mockQuery.mockResolvedValue({ rows: [mockEmployee] });

      const result = await repository.findById('emp-1', organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT e.*'),
        ['emp-1', organizationId],
        organizationId
      );
      expect(result).toEqual({
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        employeeNumber: 'EMP001',
        jobTitle: 'Software Engineer',
        departmentName: 'Engineering',
        locationName: 'New York Office',
        managerName: 'Jane Smith'
      });
    });

    it('should return null if employee not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('emp-999', organizationId);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('emp-1', organizationId)).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create new employee', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        employeeNumber: 'EMP001',
        departmentId: 'dept-1',
        locationId: 'loc-1',
        jobTitle: 'Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01'
      };

      const mockCreated = {
        id: 'emp-new',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        employee_number: 'EMP001'
      };

      mockQuery.mockResolvedValue({ rows: [mockCreated] });

      const result = await repository.create(employeeData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([organizationId, 'John', 'Doe', 'john@example.com']),
        organizationId
      );
      expect(result.id).toBe('emp-new');
      expect(result.firstName).toBe('John');
    });
  });

  describe('findAll', () => {
    it('should find all employees with filters', async () => {
      const filters = {
        departmentId: 'dept-1',
        employmentStatus: 'active'
      };

      const mockEmployees = [
        { id: 'emp-1', first_name: 'John', last_name: 'Doe' },
        { id: 'emp-2', first_name: 'Jane', last_name: 'Smith' }
      ];

      mockQuery.mockResolvedValue({ rows: mockEmployees });

      const result = await repository.findAll(filters, organizationId, { limit: 50, offset: 0 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.organization_id'),
        expect.arrayContaining([organizationId, 'dept-1', 'active']),
        organizationId
      );
      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe('John');
    });

    it('should handle search filter', async () => {
      const filters = { search: 'john' };
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findAll(filters, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%john%']),
        organizationId
      );
    });
  });

  describe('count', () => {
    it('should count employees with filters', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await repository.count({}, organizationId);

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.any(Array),
        organizationId
      );
    });
  });

  describe('update', () => {
    it('should update employee fields', async () => {
      const updates = {
        jobTitle: 'Senior Engineer',
        departmentId: 'dept-2'
      };

      const mockUpdated = {
        id: 'emp-1',
        job_title: 'Senior Engineer',
        department_id: 'dept-2'
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdated] });

      const result = await repository.update('emp-1', updates, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['Senior Engineer', 'dept-2', userId, 'emp-1', organizationId]),
        organizationId
      );
      expect(result.jobTitle).toBe('Senior Engineer');
    });
  });

  describe('terminate', () => {
    it('should terminate employee with termination details', async () => {
      const terminationDate = '2024-06-30';
      const reason = 'Resignation';
      const notes = 'Two weeks notice provided';

      const mockTerminated = {
        id: 'emp-1',
        employment_status: 'terminated',
        termination_date: terminationDate
      };

      mockQuery.mockResolvedValue({ rows: [mockTerminated] });

      const result = await repository.terminate('emp-1', terminationDate, reason, notes, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('employment_status = \'terminated\''),
        [terminationDate, reason, notes, userId, 'emp-1', organizationId],
        organizationId
      );
      expect(result.employmentStatus).toBe('terminated');
    });
  });

  describe('delete', () => {
    it('should soft delete employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'emp-1', deleted_at: new Date() }] });

      const result = await repository.delete('emp-1', organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        [userId, 'emp-1', organizationId],
        organizationId
      );
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('getOrgChartData', () => {
    it('should retrieve hierarchical org chart', async () => {
      const mockOrgData = [
        { id: 'emp-1', first_name: 'CEO', manager_id: null, level: 1 },
        { id: 'emp-2', first_name: 'Manager', manager_id: 'emp-1', level: 2 }
      ];

      mockQuery.mockResolvedValue({ rows: mockOrgData });

      const result = await repository.getOrgChartData(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        [organizationId],
        organizationId
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('should search employees by name or email', async () => {
      const mockResults = [
        { id: 'emp-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      ];

      mockQuery.mockResolvedValue({ rows: mockResults });

      const result = await repository.search('john', organizationId, { limit: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%john%', organizationId, 20]),
        organizationId
      );
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });
  });
});
