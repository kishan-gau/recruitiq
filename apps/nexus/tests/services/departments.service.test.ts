import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { departmentsService } from '../../src/services/departments.service';
import type { Department, DepartmentHierarchy } from '../../src/types/department.types';

// Mock data
const mockDepartment: Department = {
  id: 'dept-1',
  organizationId: 'org-1',
  departmentCode: 'ENG',
  departmentName: 'Engineering',
  description: 'Engineering department',
  parentDepartmentId: undefined,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

const mockDepartments: Department[] = [
  mockDepartment,
  {
    id: 'dept-2',
    organizationId: 'org-1',
    departmentCode: 'HR',
    departmentName: 'Human Resources',
    description: 'HR department',
    parentDepartmentId: undefined,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'dept-3',
    organizationId: 'org-1',
    departmentCode: 'FE',
    departmentName: 'Frontend',
    description: 'Frontend team',
    parentDepartmentId: 'dept-1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
];

const mockHierarchy: DepartmentHierarchy[] = [
  {
    ...mockDepartment,
    children: [
      {
        id: 'dept-3',
        organizationId: 'org-1',
        departmentCode: 'FE',
        departmentName: 'Frontend',
        description: 'Frontend team',
        parentDepartmentId: 'dept-1',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        children: [],
        employeeCount: 5,
      },
    ],
    employeeCount: 10,
  },
];

// MSW server setup
const server = setupServer(
  http.get('*/api/nexus/departments', () => {
    return HttpResponse.json({ success: true, data: mockDepartments });
  }),

  http.get('*/api/nexus/departments/structure/full', () => {
    return HttpResponse.json({ success: true, data: mockHierarchy });
  }),

  http.get('*/api/nexus/departments/:id/hierarchy', ({ params }) => {
    const department = mockDepartments.find((d) => d.id === params.id);
    if (department) {
      const hierarchyItem = mockHierarchy.find((h) => h.id === params.id);
      return HttpResponse.json({ success: true, data: hierarchyItem || { ...department, children: [], employeeCount: 0 } });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('*/api/nexus/departments/:id/employees', ({ params }) => {
    const department = mockDepartments.find((d) => d.id === params.id);
    if (department) {
      // Return empty array for simplicity
      return HttpResponse.json({ success: true, data: [] });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('*/api/nexus/departments/:id', ({ params }) => {
    const department = mockDepartments.find((d) => d.id === params.id);
    if (department) {
      return HttpResponse.json({ success: true, data: department });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.post('*/api/nexus/departments', async ({ request }) => {
    const body = await request.json();
    const newDepartment: Department = {
      id: 'new-dept',
      organizationId: 'org-1',
      ...(body as any),
      isActive: (body as any).isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };
    return HttpResponse.json({ success: true, data: newDepartment }, { status: 201 });
  }),

  http.patch('*/api/nexus/departments/:id', async ({ request, params }) => {
    const body = await request.json();
    const department = mockDepartments.find((d) => d.id === params.id);
    if (department) {
      const updated: Department = {
        ...department,
        ...(body as any),
        updatedAt: new Date().toISOString(),
      };
      return HttpResponse.json({ success: true, data: updated });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('*/api/nexus/departments/:id', ({ params }) => {
    const department = mockDepartments.find((d) => d.id === params.id);
    if (department) {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('departmentsService', () => {
  describe('list', () => {
    it('should fetch all departments', async () => {
      const departments = await departmentsService.list();

      expect(departments).toHaveLength(3);
      expect(departments[0]).toMatchObject({
        id: 'dept-1',
        departmentCode: 'ENG',
        departmentName: 'Engineering',
      });
    });

    it('should fetch departments with search filter', async () => {
      server.use(
        http.get('*/api/nexus/departments', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');
          
          if (search) {
            const filtered = mockDepartments.filter((d) =>
              d.departmentName.toLowerCase().includes(search.toLowerCase())
            );
            return HttpResponse.json({ success: true, data: filtered });
          }
          return HttpResponse.json({ success: true, data: mockDepartments });
        })
      );

      const departments = await departmentsService.list({ search: 'Engineering' });

      expect(departments).toHaveLength(1);
      expect(departments[0].departmentName).toBe('Engineering');
    });

    it('should fetch active departments only', async () => {
      server.use(
        http.get('*/api/nexus/departments', ({ request }) => {
          const url = new URL(request.url);
          const isActive = url.searchParams.get('isActive');
          
          if (isActive === 'true') {
            const filtered = mockDepartments.filter((d) => d.isActive);
            return HttpResponse.json({ success: true, data: filtered });
          }
          return HttpResponse.json({ success: true, data: mockDepartments });
        })
      );

      const departments = await departmentsService.list({ isActive: true });

      expect(departments.length).toBeGreaterThan(0);
      expect(departments.every((d: Department) => d.isActive)).toBe(true);
    });
  });

  describe('getOrganizationStructure', () => {
    it('should fetch department hierarchy', async () => {
      const hierarchy = await departmentsService.getOrganizationStructure();

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].departmentName).toBe('Engineering');
      expect(hierarchy[0].children).toBeDefined();
      expect(hierarchy[0].children?.length).toBe(1);
      expect(hierarchy[0].employeeCount).toBe(10);
    });
  });

  describe('get', () => {
    it('should fetch a department by ID', async () => {
      const department = await departmentsService.get('dept-1');

      expect(department).toMatchObject({
        id: 'dept-1',
        departmentCode: 'ENG',
        departmentName: 'Engineering',
      });
    });

    it('should throw error for non-existent department', async () => {
      await expect(departmentsService.get('non-existent')).rejects.toThrow();
    });
  });

  describe('getHierarchy', () => {
    it('should fetch hierarchy for a specific department', async () => {
      const hierarchy = await departmentsService.getHierarchy('dept-1');

      expect(hierarchy.id).toBe('dept-1');
      expect(hierarchy.children).toBeDefined();
    });
  });

  describe('getEmployees', () => {
    it('should fetch employees for a department', async () => {
      const employees = await departmentsService.getEmployees('dept-1');

      expect(Array.isArray(employees)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new department', async () => {
      const newDepartment = {
        departmentCode: 'SALES',
        departmentName: 'Sales',
        description: 'Sales department',
        isActive: true,
      };

      const created = await departmentsService.create(newDepartment);

      expect(created).toMatchObject({
        id: 'new-dept',
        departmentCode: 'SALES',
        departmentName: 'Sales',
      });
      expect(created.createdAt).toBeDefined();
    });

    it('should create department with parent', async () => {
      const newDepartment = {
        departmentCode: 'BE',
        departmentName: 'Backend',
        description: 'Backend team',
        parentDepartmentId: 'dept-1',
        isActive: true,
      };

      const created = await departmentsService.create(newDepartment);

      expect(created.parentDepartmentId).toBe('dept-1');
    });
  });

  describe('update', () => {
    it('should update an existing department', async () => {
      const updates = {
        departmentName: 'Engineering & Technology',
        description: 'Updated description',
      };

      const updated = await departmentsService.update('dept-1', updates);

      expect(updated.departmentName).toBe('Engineering & Technology');
      expect(updated.description).toBe('Updated description');
    });

    it('should throw error when updating non-existent department', async () => {
      await expect(
        departmentsService.update('non-existent', { departmentName: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a department', async () => {
      await expect(departmentsService.delete('dept-2')).resolves.not.toThrow();
    });

    it('should throw error when deleting non-existent department', async () => {
      await expect(departmentsService.delete('non-existent')).rejects.toThrow();
    });
  });
});
