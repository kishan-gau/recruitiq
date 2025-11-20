/**
 * Departments API Service
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
import type {
  Department,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  DepartmentFilters,
  DepartmentHierarchy,
} from '@/types/department.types';

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const departmentsService = {
  list: async (filters?: DepartmentFilters): Promise<Department[]> => {
    const response = await nexusClient.listDepartments(filters);
    // Backend returns { success: true, data: { departments: [...], total, limit, offset } }
    return response.data.departments as Department[];
  },

  get: async (id: string): Promise<Department> => {
    const response = await nexusClient.getDepartment(id);
    return response.data as Department;
  },

  create: async (department: CreateDepartmentDTO): Promise<Department> => {
    const response = await nexusClient.createDepartment(department);
    return response.data as Department;
  },

  update: async (id: string, updates: UpdateDepartmentDTO): Promise<Department> => {
    const response = await nexusClient.updateDepartment(id, updates);
    return response.data as Department;
  },

  delete: async (id: string): Promise<void> => {
    await nexusClient.deleteDepartment(id);
  },

  getHierarchy: async (id: string): Promise<DepartmentHierarchy> => {
    const response = await nexusClient.getDepartmentHierarchy(id);
    return response.data as DepartmentHierarchy;
  },

  getEmployees: async (id: string): Promise<unknown[]> => {
    const response = await nexusClient.getDepartmentEmployees(id);
    return response.data as unknown[];
  },

  getOrganizationStructure: async (): Promise<DepartmentHierarchy[]> => {
    const response = await nexusClient.getOrganizationStructure();
    return response.data as DepartmentHierarchy[];
  },
};
