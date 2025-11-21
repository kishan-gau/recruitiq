/**
 * Tests for EmployeeController
 * 
 * Controller Layer: HTTP request/response handling
 * Tests verify:
 * - Request parsing (params, query, body)
 * - Service method calls with correct arguments
 * - Response formatting with appropriate status codes
 * - Error handling and status code logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock services BEFORE importing controller
class MockEmployeeService {
  createEmployee = jest.fn();
  getEmployee = jest.fn();
  listEmployees = jest.fn();
  updateEmployee = jest.fn();
  terminateEmployee = jest.fn();
  deleteEmployee = jest.fn();
  getOrgChart = jest.fn();
  searchEmployees = jest.fn();
}

class MockEmploymentHistoryService {
  rehireEmployee = jest.fn();
  getEmploymentHistory = jest.fn();
  checkRehireEligibility = jest.fn();
}

jest.unstable_mockModule('../../../../src/products/nexus/services/employeeService.js', () => ({
  default: MockEmployeeService
}));

jest.unstable_mockModule('../../../../src/products/nexus/services/employmentHistoryService.js', () => ({
  default: MockEmploymentHistoryService
}));

// Import controller AFTER mocking
const { default: EmployeeController } = await import('../../../../src/products/nexus/controllers/employeeController.js');

describe('EmployeeController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new EmployeeController();
    
    mockReq = {
      user: {
        organization_id: 'org-123',
        id: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create an employee successfully', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        employeeNumber: 'EMP001'
      };

      mockReq.body = employeeData;

      controller.service.createEmployee.mockResolvedValue({
        id: 'emp-123',
        ...employeeData,
        organizationId: 'org-123'
      });

      await controller.createEmployee(mockReq, mockRes);

      expect(controller.service.createEmployee).toHaveBeenCalledWith(
        employeeData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employee: expect.objectContaining({
          id: 'emp-123',
          firstName: 'John'
        })
      });
    });

    it('should handle errors during employee creation', async () => {
      mockReq.body = { firstName: 'John' };

      controller.service.createEmployee.mockRejectedValue(
        new Error('Email is required')
      );

      await controller.createEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required'
      });
    });
  });

  describe('getEmployee', () => {
    it('should get an employee by ID successfully', async () => {
      mockReq.params = { id: 'emp-123' };

      const mockEmployee = {
        id: 'emp-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      controller.service.getEmployee.mockResolvedValue(mockEmployee);

      await controller.getEmployee(mockReq, mockRes);

      expect(controller.service.getEmployee).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employee: mockEmployee
      });
    });

    it('should return 404 when employee not found', async () => {
      mockReq.params = { id: 'emp-nonexistent' };

      controller.service.getEmployee.mockRejectedValue(
        new Error('Employee not found')
      );

      await controller.getEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'emp-123' };

      controller.service.getEmployee.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('listEmployees', () => {
    it('should list employees with filters', async () => {
      mockReq.query = {
        departmentId: 'dept-123',
        locationId: 'loc-123',
        employmentStatus: 'active',
        employmentType: 'full-time',
        search: 'John',
        limit: '20',
        offset: '0'
      };

      const mockResult = {
        employees: [
          { id: 'emp-1', firstName: 'John' },
          { id: 'emp-2', firstName: 'Jane' }
        ],
        total: 2
      };

      controller.service.listEmployees.mockResolvedValue(mockResult);

      await controller.listEmployees(mockReq, mockRes);

      expect(controller.service.listEmployees).toHaveBeenCalledWith(
        {
          departmentId: 'dept-123',
          locationId: 'loc-123',
          employmentStatus: 'active',
          employmentType: 'full-time',
          search: 'John'
        },
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employees: mockResult.employees,
        total: 2,
        limit: 20,
        offset: 0
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.query = {};

      controller.service.listEmployees.mockResolvedValue({
        employees: [],
        total: 0
      });

      await controller.listEmployees(mockReq, mockRes);

      expect(controller.service.listEmployees).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors when listing employees', async () => {
      mockReq.query = {};

      controller.service.listEmployees.mockRejectedValue(
        new Error('Database error')
      );

      await controller.listEmployees(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee successfully', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { firstName: 'Jane' };

      controller.service.updateEmployee.mockResolvedValue({
        id: 'emp-123',
        firstName: 'Jane'
      });

      await controller.updateEmployee(mockReq, mockRes);

      expect(controller.service.updateEmployee).toHaveBeenCalledWith(
        'emp-123',
        { firstName: 'Jane' },
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employee: expect.objectContaining({ id: 'emp-123' })
      });
    });

    it('should return 404 when employee not found', async () => {
      mockReq.params = { id: 'emp-nonexistent' };
      mockReq.body = { firstName: 'Jane' };

      controller.service.updateEmployee.mockRejectedValue(
        new Error('Employee not found')
      );

      await controller.updateEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { email: 'invalid-email' };

      controller.service.updateEmployee.mockRejectedValue(
        new Error('Invalid email format')
      );

      await controller.updateEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
    });
  });

  describe('terminateEmployee', () => {
    it('should terminate an employee successfully', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = {
        terminationDate: '2025-01-15',
        reason: 'Resignation'
      };

      controller.service.terminateEmployee.mockResolvedValue({
        id: 'emp-123',
        employmentStatus: 'terminated'
      });

      await controller.terminateEmployee(mockReq, mockRes);

      expect(controller.service.terminateEmployee).toHaveBeenCalledWith(
        'emp-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employee: expect.objectContaining({ employmentStatus: 'terminated' })
      });
    });

    it('should return 404 when employee not found', async () => {
      mockReq.params = { id: 'emp-nonexistent' };
      mockReq.body = { terminationDate: '2025-01-15' };

      controller.service.terminateEmployee.mockRejectedValue(
        new Error('Employee not found')
      );

      await controller.terminateEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = {};

      controller.service.terminateEmployee.mockRejectedValue(
        new Error('Termination date is required')
      );

      await controller.terminateEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rehireEmployee', () => {
    it('should rehire an employee successfully', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = {
        rehireDate: '2025-02-01',
        newDepartmentId: 'dept-456'
      };

      controller.employmentHistoryService.rehireEmployee.mockResolvedValue({
        id: 'emp-123',
        employmentStatus: 'active'
      });

      await controller.rehireEmployee(mockReq, mockRes);

      expect(controller.employmentHistoryService.rehireEmployee).toHaveBeenCalledWith(
        'emp-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        rehire: expect.objectContaining({ employmentStatus: 'active' })
      });
    });

    it('should return 404 when employee not found', async () => {
      mockReq.params = { id: 'emp-nonexistent' };
      mockReq.body = { rehireDate: '2025-02-01' };

      controller.employmentHistoryService.rehireEmployee.mockRejectedValue(
        new Error('Employee not found')
      );

      await controller.rehireEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when employee not terminated', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { rehireDate: '2025-02-01' };

      controller.employmentHistoryService.rehireEmployee.mockRejectedValue(
        new Error('Employee is not terminated')
      );

      await controller.rehireEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when employee not eligible for rehire', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { rehireDate: '2025-02-01' };

      controller.employmentHistoryService.rehireEmployee.mockRejectedValue(
        new Error('Employee is not eligible for rehire')
      );

      await controller.rehireEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { rehireDate: '2025-02-01' };

      controller.employmentHistoryService.rehireEmployee.mockRejectedValue(
        new Error('Database error')
      );

      await controller.rehireEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEmploymentHistory', () => {
    it('should get employment history successfully', async () => {
      mockReq.params = { id: 'emp-123' };

      const mockHistory = [
        { periodStart: '2020-01-01', periodEnd: '2023-12-31', reason: 'Resignation' },
        { periodStart: '2024-01-01', periodEnd: null, reason: null }
      ];

      controller.employmentHistoryService.getEmploymentHistory.mockResolvedValue(mockHistory);

      await controller.getEmploymentHistory(mockReq, mockRes);

      expect(controller.employmentHistoryService.getEmploymentHistory).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employmentHistory: mockHistory
      });
    });

    it('should handle errors when getting employment history', async () => {
      mockReq.params = { id: 'emp-123' };

      controller.employmentHistoryService.getEmploymentHistory.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getEmploymentHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('checkRehireEligibility', () => {
    it('should check rehire eligibility successfully', async () => {
      mockReq.params = { id: 'emp-123' };

      const mockEligibility = {
        eligible: true,
        reason: null
      };

      controller.employmentHistoryService.checkRehireEligibility.mockResolvedValue(mockEligibility);

      await controller.checkRehireEligibility(mockReq, mockRes);

      expect(controller.employmentHistoryService.checkRehireEligibility).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        eligibility: mockEligibility
      });
    });

    it('should handle errors when checking eligibility', async () => {
      mockReq.params = { id: 'emp-123' };

      controller.employmentHistoryService.checkRehireEligibility.mockRejectedValue(
        new Error('Database error')
      );

      await controller.checkRehireEligibility(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('deleteEmployee', () => {
    it('should delete an employee successfully', async () => {
      mockReq.params = { id: 'emp-123' };

      controller.service.deleteEmployee.mockResolvedValue();

      await controller.deleteEmployee(mockReq, mockRes);

      expect(controller.service.deleteEmployee).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee deleted successfully'
      });
    });

    it('should return 404 when employee not found', async () => {
      mockReq.params = { id: 'emp-nonexistent' };

      controller.service.deleteEmployee.mockRejectedValue(
        new Error('Employee not found')
      );

      await controller.deleteEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'emp-123' };

      controller.service.deleteEmployee.mockRejectedValue(
        new Error('Database error')
      );

      await controller.deleteEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrgChart', () => {
    it('should get organization chart successfully', async () => {
      const mockOrgChart = [
        {
          id: 'emp-1',
          name: 'CEO',
          children: [
            { id: 'emp-2', name: 'CTO', children: [] }
          ]
        }
      ];

      controller.service.getOrgChart.mockResolvedValue(mockOrgChart);

      await controller.getOrgChart(mockReq, mockRes);

      expect(controller.service.getOrgChart).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        orgChart: mockOrgChart
      });
    });

    it('should handle errors when getting org chart', async () => {
      controller.service.getOrgChart.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getOrgChart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('searchEmployees', () => {
    it('should search employees successfully', async () => {
      mockReq.query = { q: 'John', limit: '10' };

      const mockResults = [
        { id: 'emp-1', firstName: 'John', lastName: 'Doe' },
        { id: 'emp-2', firstName: 'Johnny', lastName: 'Smith' }
      ];

      controller.service.searchEmployees.mockResolvedValue(mockResults);

      await controller.searchEmployees(mockReq, mockRes);

      expect(controller.service.searchEmployees).toHaveBeenCalledWith(
        'John',
        'org-123',
        { limit: 10 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        employees: mockResults
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = { q: 'John' };

      controller.service.searchEmployees.mockResolvedValue([]);

      await controller.searchEmployees(mockReq, mockRes);

      expect(controller.service.searchEmployees).toHaveBeenCalledWith(
        'John',
        'org-123',
        { limit: 20 }
      );
    });

    it('should return 400 when search query is missing', async () => {
      mockReq.query = {};

      await controller.searchEmployees(mockReq, mockRes);

      expect(controller.service.searchEmployees).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search query is required'
      });
    });

    it('should handle errors during search', async () => {
      mockReq.query = { q: 'John' };

      controller.service.searchEmployees.mockRejectedValue(
        new Error('Database error')
      );

      await controller.searchEmployees(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
