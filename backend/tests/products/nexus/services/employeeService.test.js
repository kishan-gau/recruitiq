/**
 * EmployeeService Unit Tests
 */

import { jest } from '@jest/globals';

// Mock dependencies before importing service
const mockEmployeeRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByEmployeeNumber: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  terminate: jest.fn(),
  delete: jest.fn(),
  getOrgChartData: jest.fn(),
  search: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

jest.unstable_mockModule('../../../src/products/nexus/repositories/employeeRepository.js', () => ({
  default: jest.fn(() => mockEmployeeRepository)
}));

jest.unstable_mockModule('../../../src/shared/events/eventBus.js', () => ({
  default: mockEventBus
}));

const { default: EmployeeService } = await import('../../../src/products/nexus/services/employeeService.js');

describe('EmployeeService', () => {
  let service;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new EmployeeService();
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    const validEmployeeData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employeeNumber: 'EMP001',
      departmentId: 'dept-123',
      locationId: 'loc-123',
      jobTitle: 'Software Engineer',
      employmentType: 'full_time',
      hireDate: new Date('2024-01-01')
    };

    it('should create employee successfully', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(null);
      mockEmployeeRepository.findByEmployeeNumber.mockResolvedValue(null);
      mockEmployeeRepository.create.mockResolvedValue({
        id: 'emp-new',
        ...validEmployeeData
      });

      const result = await service.createEmployee(validEmployeeData, organizationId, userId);

      expect(mockEmployeeRepository.findByEmail).toHaveBeenCalledWith('john@example.com', organizationId);
      expect(mockEmployeeRepository.findByEmployeeNumber).toHaveBeenCalledWith('EMP001', organizationId);
      expect(mockEmployeeRepository.create).toHaveBeenCalledWith(validEmployeeData, organizationId, userId);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.employee.created',
        expect.objectContaining({
          employeeId: 'emp-new',
          organizationId,
          email: 'john@example.com'
        })
      );
      expect(result.id).toBe('emp-new');
    });

    it('should throw error if validation fails', async () => {
      const invalidData = { firstName: 'John' }; // Missing required fields

      await expect(
        service.createEmployee(invalidData, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should throw error if email already exists', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue({ id: 'existing-emp' });

      await expect(
        service.createEmployee(validEmployeeData, organizationId, userId)
      ).rejects.toThrow('Employee with this email already exists');
    });

    it('should throw error if employee number already exists', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(null);
      mockEmployeeRepository.findByEmployeeNumber.mockResolvedValue({ id: 'existing-emp' });

      await expect(
        service.createEmployee(validEmployeeData, organizationId, userId)
      ).rejects.toThrow('Employee number already exists');
    });
  });

  describe('getEmployee', () => {
    it('should retrieve employee by ID', async () => {
      const mockEmployee = { id: 'emp-1', firstName: 'John', lastName: 'Doe' };
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployee('emp-1', organizationId);

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('emp-1', organizationId);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw error if employee not found', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEmployee('emp-999', organizationId)
      ).rejects.toThrow('Employee not found');
    });
  });

  describe('listEmployees', () => {
    it('should list employees with pagination', async () => {
      const mockEmployees = [
        { id: 'emp-1', firstName: 'John' },
        { id: 'emp-2', firstName: 'Jane' }
      ];
      mockEmployeeRepository.findAll.mockResolvedValue(mockEmployees);
      mockEmployeeRepository.count.mockResolvedValue(25);

      const filters = { departmentId: 'dept-1' };
      const options = { limit: 10, offset: 0 };

      const result = await service.listEmployees(filters, organizationId, options);

      expect(mockEmployeeRepository.findAll).toHaveBeenCalledWith(filters, organizationId, options);
      expect(mockEmployeeRepository.count).toHaveBeenCalledWith(filters, organizationId);
      expect(result.employees).toEqual(mockEmployees);
      expect(result.total).toBe(25);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      const existingEmployee = {
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      const updates = { jobTitle: 'Senior Engineer' };

      mockEmployeeRepository.findById.mockResolvedValue(existingEmployee);
      mockEmployeeRepository.update.mockResolvedValue({
        ...existingEmployee,
        ...updates
      });

      const result = await service.updateEmployee('emp-1', updates, organizationId, userId);

      expect(mockEmployeeRepository.update).toHaveBeenCalledWith('emp-1', updates, organizationId, userId);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.employee.updated',
        expect.objectContaining({
          employeeId: 'emp-1',
          organizationId,
          changes: updates
        })
      );
      expect(result.jobTitle).toBe('Senior Engineer');
    });

    it('should check for email conflicts when updating', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({
        id: 'emp-1',
        email: 'john@example.com'
      });
      mockEmployeeRepository.findByEmail.mockResolvedValue({ id: 'emp-2' });

      await expect(
        service.updateEmployee('emp-1', { email: 'jane@example.com' }, organizationId, userId)
      ).rejects.toThrow('Email already in use by another employee');
    });
  });

  describe('terminateEmployee', () => {
    it('should terminate employee successfully', async () => {
      const employee = {
        id: 'emp-1',
        firstName: 'John',
        employmentStatus: 'active'
      };
      const terminationData = {
        terminationDate: '2024-06-30',
        terminationReason: 'Resignation',
        terminationNotes: 'Two weeks notice'
      };

      mockEmployeeRepository.findById.mockResolvedValue(employee);
      mockEmployeeRepository.terminate.mockResolvedValue({
        ...employee,
        employmentStatus: 'terminated',
        terminationDate: terminationData.terminationDate
      });

      const result = await service.terminateEmployee('emp-1', terminationData, organizationId, userId);

      expect(mockEmployeeRepository.terminate).toHaveBeenCalledWith(
        'emp-1',
        terminationData.terminationDate,
        terminationData.terminationReason,
        terminationData.terminationNotes,
        organizationId,
        userId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.employee.terminated',
        expect.objectContaining({
          employeeId: 'emp-1',
          organizationId
        })
      );
      expect(result.employmentStatus).toBe('terminated');
    });

    it('should throw error if termination date is missing', async () => {
      await expect(
        service.terminateEmployee('emp-1', {}, organizationId, userId)
      ).rejects.toThrow('Termination date is required');
    });

    it('should throw error if employee already terminated', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({
        id: 'emp-1',
        employmentStatus: 'terminated'
      });

      await expect(
        service.terminateEmployee('emp-1', { terminationDate: '2024-06-30' }, organizationId, userId)
      ).rejects.toThrow('Employee is already terminated');
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete employee', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({ id: 'emp-1' });
      mockEmployeeRepository.delete.mockResolvedValue({ id: 'emp-1', deletedAt: new Date() });

      const result = await service.deleteEmployee('emp-1', organizationId, userId);

      expect(mockEmployeeRepository.delete).toHaveBeenCalledWith('emp-1', organizationId, userId);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.employee.deleted',
        expect.objectContaining({ employeeId: 'emp-1' })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getOrgChart', () => {
    it('should retrieve organization chart', async () => {
      const mockOrgChart = [
        { id: 'emp-1', managerId: null, level: 1 },
        { id: 'emp-2', managerId: 'emp-1', level: 2 }
      ];
      mockEmployeeRepository.getOrgChartData.mockResolvedValue(mockOrgChart);

      const result = await service.getOrgChart(organizationId);

      expect(mockEmployeeRepository.getOrgChartData).toHaveBeenCalledWith(organizationId);
      expect(result).toEqual(mockOrgChart);
    });
  });

  describe('searchEmployees', () => {
    it('should search employees by term', async () => {
      const mockResults = [{ id: 'emp-1', firstName: 'John' }];
      mockEmployeeRepository.search.mockResolvedValue(mockResults);

      const result = await service.searchEmployees('john', organizationId, { limit: 20 });

      expect(mockEmployeeRepository.search).toHaveBeenCalledWith('john', organizationId, { limit: 20 });
      expect(result).toEqual(mockResults);
    });
  });
});
