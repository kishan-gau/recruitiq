/**
 * Employees API Service
 * Handles all employee-related API calls
 */

import { apiClient } from './api';
import type {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  TerminateEmployeeDTO,
  EmployeeFilters,
  EmployeeListItem,
  OrgChartNode,
} from '@/types/employee.types';
import type { PaginatedResponse } from '@/types/common.types';

export const employeesService = {
  /**
   * Get list of employees with optional filters
   */
  list: async (filters?: EmployeeFilters): Promise<EmployeeListItem[]> => {
    const result = await apiClient.get<EmployeeListItem[]>('/employees', {
      params: { page: 1, limit: 50, ...filters },
    });
    return result;
  },

  /**
   * Get paginated list of employees
   */
  listPaginated: async (
    filters?: EmployeeFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<EmployeeListItem>> => {
    return await apiClient.get<PaginatedResponse<EmployeeListItem>>('/employees', {
      params: { ...filters, page, limit },
    });
  },

  /**
   * Get single employee by ID
   */
  get: async (id: string): Promise<Employee> => {
    return await apiClient.get<Employee>(`/employees/${id}`);
  },

  /**
   * Create new employee
   */
  create: async (employee: CreateEmployeeDTO): Promise<Employee> => {
    return await apiClient.post<Employee>('/employees', employee);
  },

  /**
   * Update existing employee
   */
  update: async (id: string, updates: UpdateEmployeeDTO): Promise<Employee> => {
    return await apiClient.patch<Employee>(`/employees/${id}`, updates);
  },

  /**
   * Terminate employee
   */
  terminate: async (id: string, terminationData: TerminateEmployeeDTO): Promise<Employee> => {
    return await apiClient.post<Employee>(`/employees/${id}/terminate`, terminationData);
  },

  /**
   * Rehire employee
   */
  rehire: async (id: string, rehireData: any): Promise<any> => {
    return await apiClient.post<any>(`/employees/${id}/rehire`, rehireData);
  },

  /**
   * Get employment history for employee
   */
  getEmploymentHistory: async (id: string): Promise<any[]> => {
    return await apiClient.get<any[]>(`/employees/${id}/employment-history`);
  },

  /**
   * Check if employee can be rehired
   */
  checkRehireEligibility: async (id: string): Promise<any> => {
    return await apiClient.get<any>(`/employees/${id}/rehire-eligibility`);
  },

  /**
   * Soft delete employee
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },

  /**
   * Search employees by query
   */
  search: async (query: string): Promise<EmployeeListItem[]> => {
    return await apiClient.get<EmployeeListItem[]>('/employees/search', {
      params: { q: query },
    });
  },

  /**
   * Get organization chart data
   */
  getOrgChart: async (): Promise<OrgChartNode[]> => {
    return await apiClient.get<OrgChartNode[]>('/employees/org-chart');
  },

  /**
   * User Access Management
   */

  /**
   * Grant system access to an employee
   */
  grantSystemAccess: async (
    employeeId: string,
    accessData: {
      email?: string;
      password?: string;
      sendEmail?: boolean;
    }
  ): Promise<any> => {
    const { data } = await apiClient.post<any>(
      `/employees/${employeeId}/user-access/grant`,
      accessData
    );
    return data;
  },

  /**
   * Get employee's user account status
   */
  getUserAccountStatus: async (employeeId: string): Promise<any> => {
    const { data } = await apiClient.get<any>(`/employees/${employeeId}/user-access`);
    return data;
  },

  /**
   * Revoke system access from an employee
   */
  revokeSystemAccess: async (employeeId: string): Promise<void> => {
    await apiClient.delete(`/employees/${employeeId}/user-access`);
  },

  /**
   * Update employee's user account
   */
  updateUserAccess: async (
    employeeId: string,
    updates: {
      email?: string;
      password?: string;
      status?: string;
    }
  ): Promise<any> => {
    const { data } = await apiClient.patch<any>(
      `/employees/${employeeId}/user-access`,
      updates
    );
    return data;
  },
};
