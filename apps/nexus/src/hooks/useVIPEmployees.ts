/**
 * Custom React hooks for VIP Employee data fetching and mutations
 * Uses TanStack Query for optimal caching and synchronization
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { vipEmployeesService } from '@/services/vipEmployees.service';
import { employeeKeys } from './useEmployees';
import type {
  VIPEmployee,
  VIPStatus,
  VIPAccessControl,
  VIPAccessLog,
  MarkAsVIPDTO,
  UpdateAccessControlDTO,
  VIPEmployeeFilters,
  VIPCount,
  VIPAccessCheck,
  VIPAuditLogFilters,
} from '@/types/vipEmployee.types';
import type { ApiError, PaginatedResponse } from '@/types/common.types';

// Query keys for VIP employees
export const vipEmployeeKeys = {
  all: ['vipEmployees'] as const,
  lists: () => [...vipEmployeeKeys.all, 'list'] as const,
  list: (filters?: VIPEmployeeFilters) => [...vipEmployeeKeys.lists(), filters] as const,
  count: () => [...vipEmployeeKeys.all, 'count'] as const,
  details: () => [...vipEmployeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...vipEmployeeKeys.details(), id] as const,
  auditLog: (id: string, filters?: VIPAuditLogFilters) => [...vipEmployeeKeys.detail(id), 'auditLog', filters] as const,
  accessCheck: (id: string, accessType?: string) => [...vipEmployeeKeys.detail(id), 'accessCheck', accessType] as const,
};

/**
 * Fetch list of VIP employees
 */
export function useVIPEmployees(
  filters?: VIPEmployeeFilters,
  options?: Omit<UseQueryOptions<{ vipEmployees: VIPEmployee[], pagination: PaginatedResponse<VIPEmployee>['pagination'] }, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ vipEmployees: VIPEmployee[], pagination: PaginatedResponse<VIPEmployee>['pagination'] }, ApiError>({
    queryKey: vipEmployeeKeys.list(filters),
    queryFn: () => vipEmployeesService.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch VIP employee count statistics
 */
export function useVIPCount(
  options?: Omit<UseQueryOptions<VIPCount, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VIPCount, ApiError>({
    queryKey: vipEmployeeKeys.count(),
    queryFn: () => vipEmployeesService.getCount(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch VIP status for a specific employee
 */
export function useVIPStatus(
  employeeId: string,
  options?: Omit<UseQueryOptions<VIPStatus, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VIPStatus, ApiError>({
    queryKey: vipEmployeeKeys.detail(employeeId),
    queryFn: () => vipEmployeesService.getStatus(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Mark employee as VIP
 */
export function useMarkAsVIP() {
  const queryClient = useQueryClient();

  return useMutation<VIPEmployee, ApiError, { employeeId: string; data: MarkAsVIPDTO }>({
    mutationFn: ({ employeeId, data }) => vipEmployeesService.markAsVIP(employeeId, data),
    onSuccess: (data, { employeeId }) => {
      // Update VIP status cache
      queryClient.setQueryData(vipEmployeeKeys.detail(employeeId), data);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.count() });
      // Also invalidate employee data since VIP status is part of employee
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

/**
 * Update VIP status settings
 */
export function useUpdateVIPStatus() {
  const queryClient = useQueryClient();

  return useMutation<VIPEmployee, ApiError, { employeeId: string; data: MarkAsVIPDTO }>({
    mutationFn: ({ employeeId, data }) => vipEmployeesService.updateStatus(employeeId, data),
    onSuccess: (data, { employeeId }) => {
      queryClient.setQueryData(vipEmployeeKeys.detail(employeeId), data);
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.count() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

/**
 * Update access control rules
 */
export function useUpdateAccessControl() {
  const queryClient = useQueryClient();

  return useMutation<VIPAccessControl, ApiError, { employeeId: string; data: UpdateAccessControlDTO }>({
    mutationFn: ({ employeeId, data }) => vipEmployeesService.updateAccessControl(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.detail(employeeId) });
    },
  });
}

/**
 * Remove VIP status
 */
export function useRemoveVIPStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (employeeId) => vipEmployeesService.removeVIPStatus(employeeId),
    onSuccess: (_, employeeId) => {
      queryClient.removeQueries({ queryKey: vipEmployeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.count() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

/**
 * Fetch audit log for VIP employee
 */
export function useVIPAuditLog(
  employeeId: string,
  filters?: VIPAuditLogFilters,
  options?: Omit<UseQueryOptions<{ auditLog: VIPAccessLog[], pagination: PaginatedResponse<VIPAccessLog>['pagination'] }, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ auditLog: VIPAccessLog[], pagination: PaginatedResponse<VIPAccessLog>['pagination'] }, ApiError>({
    queryKey: vipEmployeeKeys.auditLog(employeeId, filters),
    queryFn: () => vipEmployeesService.getAuditLog(employeeId, filters),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutes for audit log
    ...options,
  });
}

/**
 * Check access to VIP employee
 */
export function useVIPAccessCheck(
  employeeId: string,
  accessType?: string,
  options?: Omit<UseQueryOptions<VIPAccessCheck, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VIPAccessCheck, ApiError>({
    queryKey: vipEmployeeKeys.accessCheck(employeeId, accessType),
    queryFn: () => vipEmployeesService.checkAccess(employeeId, accessType),
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000, // 1 minute for access checks
    ...options,
  });
}
