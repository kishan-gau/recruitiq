import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { employeesService } from '../../src/services/employees.service';
import { Employee, CreateEmployeeDTO } from '../../src/types/employee.types';

const mockEmployee: Employee = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  organizationId: 'org-123',
  employeeNumber: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  hireDate: '2024-01-15',
  employmentStatus: 'active',
  employmentType: 'full_time',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const server = setupServer(
  // Search and org-chart must come before /:id pattern to avoid mismatching
  http.get('/api/nexus/employees/search', () => {
    return HttpResponse.json({ data: [mockEmployee] });
  }),
  http.get('/api/nexus/employees/org-chart', () => {
    return HttpResponse.json([{
      id: mockEmployee.id,
      firstName: mockEmployee.firstName,
      lastName: mockEmployee.lastName,
      jobTitle: 'CEO',
      directReports: [],
    }]);
  }),
  http.get('/api/nexus/employees', () => {
    return HttpResponse.json({
      data: [mockEmployee],
      total: 1,
      page: 1,
      limit: 50,
    });
  }),
  http.get('/api/nexus/employees/:id', ({ params }) => {
    return HttpResponse.json(mockEmployee);
  }),
  http.post('/api/nexus/employees', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockEmployee, ...(body as any) });
  }),
  http.patch('/api/nexus/employees/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockEmployee, ...(body as any) });
  }),
  http.post('/api/nexus/employees/:id/terminate', () => {
    return HttpResponse.json({ ...mockEmployee, employmentStatus: 'terminated' });
  }),
  http.delete('/api/nexus/employees/:id', () => {
    return new HttpResponse(null, { status: 204 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('employeesService', () => {
  describe('list', () => {
    it('should fetch all employees with default pagination', async () => {
      const result = await employeesService.list();
      expect(result).toEqual([mockEmployee]);
    });

    it('should fetch employees with filters', async () => {
      const result = await employeesService.list({
        employmentStatus: 'active',
        departmentId: 'dept-123',
      });
      expect(result).toEqual([mockEmployee]);
    });
  });

  describe('listPaginated', () => {
    it('should fetch paginated employees', async () => {
      const result = await employeesService.listPaginated({}, 2, 25);
      expect(result.data).toEqual([mockEmployee]);
      expect(result.total).toBe(1);
    });
  });

  describe('get', () => {
    it('should fetch a single employee by id', async () => {
      const result = await employeesService.get(mockEmployee.id);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const newEmployee: CreateEmployeeDTO = {
        employeeNumber: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2024-02-01',
        employmentType: 'full_time',
      };

      const result = await employeesService.create(newEmployee);
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('update', () => {
    it('should update an existing employee', async () => {
      const updates = {
        jobTitle: 'Senior Developer',
      };

      const result = await employeesService.update(mockEmployee.id, updates);
      expect(result.jobTitle).toBe('Senior Developer');
    });
  });

  describe('terminate', () => {
    it('should terminate an employee', async () => {
      const terminationData = {
        terminationDate: '2024-03-01',
      };

      const result = await employeesService.terminate(mockEmployee.id, terminationData);
      expect(result.employmentStatus).toBe('terminated');
    });
  });

  describe('delete', () => {
    it('should delete an employee', async () => {
      await expect(employeesService.delete(mockEmployee.id)).resolves.not.toThrow();
    });
  });

  describe('search', () => {
    it('should search employees by query', async () => {
      const result = await employeesService.search('John');
      expect(result).toEqual([mockEmployee]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOrgChart', () => {
    it('should fetch organization chart', async () => {
      const result = await employeesService.getOrgChart();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe(mockEmployee.id);
      expect(result[0].directReports).toEqual([]);
    });
  });
});
