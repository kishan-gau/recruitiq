/**
 * Custom React hooks for Employee data fetching and mutations
 * Uses TanStack Query for optimal caching and synchronization
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import type { ApiError } from '@/types/common.types';
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

import { employeesService } from '../services/employees.service';

// Query keys for employees
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters?: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  search: (query: string) => [...employeeKeys.all, 'search', query] as const,
  orgChart: () => [...employeeKeys.all, 'org-chart'] as const,
};

/**
 * Fetch list of employees
 */
export function useEmployees(
  filters?: EmployeeFilters,
  options?: Omit<UseQueryOptions<EmployeeListItem[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EmployeeListItem[], ApiError>({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeesService.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch single employee by ID
 */
export function useEmployee(
  id: string,
  options?: Omit<UseQueryOptions<Employee, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Employee, ApiError>({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Search employees
 */
export function useEmployeeSearch(
  query: string,
  options?: Omit<UseQueryOptions<EmployeeListItem[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EmployeeListItem[], ApiError>({
    queryKey: employeeKeys.search(query),
    queryFn: () => employeesService.search(query),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch organization chart
 */
export function useOrgChart(
  options?: Omit<UseQueryOptions<OrgChartNode[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrgChartNode[], ApiError>({
    queryKey: employeeKeys.orgChart(),
    queryFn: () => employeesService.getOrgChart(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Create new employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, ApiError, CreateEmployeeDTO>({
    mutationFn: (data) => employeesService.create(data),
    onSuccess: () => {
      // Invalidate and refetch employee lists
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.orgChart() });
    },
  });
}

/**
 * Update existing employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<
    Employee,
    ApiError,
    { id: string; data: UpdateEmployeeDTO },
    { previousEmployee?: Employee }
  >({
    mutationFn: ({ id, data }) => employeesService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) });

      // Snapshot previous value
      const previousEmployee = queryClient.getQueryData<Employee>(employeeKeys.detail(id));

      // Optimistically update
      if (previousEmployee) {
        queryClient.setQueryData<Employee>(employeeKeys.detail(id), {
          ...previousEmployee,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousEmployee };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(employeeKeys.detail(id), context.previousEmployee);
      }
    },
    onSuccess: (data, { id }) => {
      // Update cache with server response
      queryClient.setQueryData(employeeKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.orgChart() });
    },
  });
}

/**
 * Terminate employee
 */
export function useTerminateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, ApiError, { id: string; data: TerminateEmployeeDTO }>({
    mutationFn: ({ id, data }) => employeesService.terminate(id, data),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(employeeKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.orgChart() });
    },
  });
}

/**
 * Rehire employee
 */
export function useRehireEmployee() {
  const queryClient = useQueryClient();

  return useMutation<RehireResult, ApiError, { id: string; data: RehireEmployeeDTO }>({
    mutationFn: ({ id, data }) => employeesService.rehire(id, data),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(employeeKeys.detail(id), data.employee);
      queryClient.setQueryData([...employeeKeys.detail(id), 'employment-history'], (current) => {
        if (!data.employmentHistory) return current as EmploymentHistoryEntry[] | undefined;
        if (!current) return [data.employmentHistory];
        // Prepend latest history entry
        return [data.employmentHistory, ...(current as EmploymentHistoryEntry[])];
      });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.orgChart() });
    },
  });
}

/**
 * Get employment history for employee
 */
export function useEmploymentHistory(id: string) {
  return useQuery<EmploymentHistoryEntry[], ApiError>({
    queryKey: [...employeeKeys.detail(id), 'employment-history'],
    queryFn: () => employeesService.getEmploymentHistory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if employee can be rehired
 */
export function useRehireEligibility(id: string) {
  return useQuery<RehireEligibility, ApiError>({
    queryKey: [...employeeKeys.detail(id), 'rehire-eligibility'],
    queryFn: () => employeesService.checkRehireEligibility(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Delete employee (soft delete)
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => employeesService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.orgChart() });
    },
  });
}
