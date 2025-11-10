/**
 * Departments API Service
 */

import { apiClient } from './api';
import type {
  Department,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  DepartmentFilters,
  DepartmentHierarchy,
} from '@/types/department.types';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const departmentsService = {
  list: async (filters?: DepartmentFilters): Promise<Department[]> => {
    const { data } = await apiClient.get<ApiResponse<Department[]>>('/departments', {
      params: filters,
    });
    return data.data;
  },

  get: async (id: string): Promise<Department> => {
    const { data } = await apiClient.get<ApiResponse<Department>>(`/departments/${id}`);
    return data.data;
  },

  create: async (department: CreateDepartmentDTO): Promise<Department> => {
    const { data } = await apiClient.post<ApiResponse<Department>>('/departments', department);
    return data.data;
  },

  update: async (id: string, updates: UpdateDepartmentDTO): Promise<Department> => {
    const { data} = await apiClient.patch<ApiResponse<Department>>(`/departments/${id}`, updates);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/departments/${id}`);
  },

  getHierarchy: async (id: string): Promise<DepartmentHierarchy> => {
    const { data } = await apiClient.get<ApiResponse<DepartmentHierarchy>>(`/departments/${id}/hierarchy`);
    return data.data;
  },

  getEmployees: async (id: string): Promise<unknown[]> => {
    const { data } = await apiClient.get<ApiResponse<unknown[]>>(`/departments/${id}/employees`);
    return data.data;
  },

  getOrganizationStructure: async (): Promise<DepartmentHierarchy[]> => {
    const { data } = await apiClient.get<ApiResponse<DepartmentHierarchy[]>>('/departments/structure/full');
    return data.data;
  },
};
