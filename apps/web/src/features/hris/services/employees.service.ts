/**
 * Employees API Service
 * Handles all employee-related API calls
 * USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

import type { PaginatedResponse } from '@/types/common.types';
import type {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  TerminateEmployeeDTO,
  EmployeeFilters,
  EmployeeListItem,
  OrgChartNode,
  RehireEmployeeDTO,
  RehireResult,
  EmploymentHistoryEntry,
  RehireEligibility,
} from '@/types/employee.types';

// Create singleton instance for service-level usage
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Permission metadata for RBAC
export const employeesServicePermissions = {
  list: 'nexus.employees.view',
  view: 'nexus.employees.view',
  create: 'nexus.employees.create',
  update: 'nexus.employees.update',
  delete: 'nexus.employees.delete',
  terminate: 'nexus.employees.terminate',
  export: 'nexus.employees.export',
};

export const employeesService = {
  /**
   * List all employees with optional filters
   */
  list: async (filters?: EmployeeFilters): Promise<EmployeeListItem[]> => {
    const response = await nexusClient.listEmployees(filters);
    // APIClient.get() extracts response.data automatically
    // Backend returns { success: true, employees: [...], total, limit, offset }
    return ((response as any).employees || []) as EmployeeListItem[];
  },

  /**
   * Get paginated list of employees
   */
  listPaginated: async (
    filters?: EmployeeFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<EmployeeListItem>> => {
    const response = await nexusClient.listEmployeesPaginated(filters, page, limit);
    return response as any as PaginatedResponse<EmployeeListItem>;
  },

  /**
   * Get single employee by ID
   */
  get: async (id: string): Promise<Employee> => {
    const response = await nexusClient.getEmployee(id);
    return (response as any).employee as Employee;
  },

  /**
   * Create new employee
   */
  create: async (employee: CreateEmployeeDTO): Promise<Employee> => {
    const response = await nexusClient.createEmployee(employee);
    return (response as any).employee as Employee;
  },

  /**
   * Update existing employee
   */
  update: async (id: string, updates: UpdateEmployeeDTO): Promise<Employee> => {
    const response = await nexusClient.updateEmployee(id, updates);
    return response.employee as Employee;
  },

  /**
   * Terminate employee
   */
  terminate: async (id: string, terminationData: TerminateEmployeeDTO): Promise<Employee> => {
    const response = await nexusClient.terminateEmployee(id, terminationData);
    return response.employee as Employee;
  },

  /**
   * Rehire employee
   */
  rehire: async (id: string, rehireData: RehireEmployeeDTO): Promise<RehireResult> => {
    const response = await nexusClient.rehireEmployee(id, rehireData);
    const payload = (response.rehire || response) as Partial<RehireResult>;

    if (!payload.employee) {
      throw new Error('Missing employee data in rehire response');
    }

    return {
      employee: payload.employee as Employee,
      employmentHistory: payload.employmentHistory as EmploymentHistoryEntry | undefined,
    };
  },

  /**
   * Get employment history for employee
   */
  getEmploymentHistory: async (id: string): Promise<EmploymentHistoryEntry[]> => {
    const response = await nexusClient.getEmploymentHistory(id);
    return response.employmentHistory as EmploymentHistoryEntry[];
  },

  /**
   * Check if employee can be rehired
   */
  checkRehireEligibility: async (id: string): Promise<RehireEligibility> => {
    const response = await nexusClient.checkRehireEligibility(id);
    return response.eligibility as RehireEligibility;
  },

  /**
   * Soft delete employee
   */
  delete: async (id: string): Promise<void> => {
    await nexusClient.deleteEmployee(id);
  },

  /**
   * Search employees by query
   */
  search: async (query: string): Promise<EmployeeListItem[]> => {
    const response = await nexusClient.searchEmployees(query);
    return response.employees as EmployeeListItem[];
  },

  /**
   * Get organization chart data
   */
  getOrgChart: async (): Promise<OrgChartNode[]> => {
    const response = await nexusClient.getOrgChart();
    return response.orgChart as OrgChartNode[];
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
    const response = await nexusClient.grantSystemAccess(employeeId, accessData);
    return response;
  },

  /**
   * Get employee's user account status
   */
  getUserAccountStatus: async (employeeId: string): Promise<any> => {
    const response = await nexusClient.getUserAccountStatus(employeeId);
    return response;
  },

  /**
   * Revoke system access from an employee
   */
  revokeSystemAccess: async (employeeId: string): Promise<void> => {
    await nexusClient.revokeSystemAccess(employeeId);
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
    const response = await nexusClient.updateUserAccess(employeeId, updates);
    return response;
  },
};
