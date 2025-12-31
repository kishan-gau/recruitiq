/**
 * ScheduleHub Role Management Hooks
 * 
 * React Query hooks for managing roles in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../../contexts/ToastContext';
import { handleApiError } from '../../../utils/errorHandler';
import { rolesService, workersService } from '../services';
import type { Role, CreateRoleForm } from '../types';

// Query keys factory
export const roleKeys = {
  all: ['schedulehub', 'roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters?: any) => [...roleKeys.lists(), filters] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};

/**
 * Hook to fetch all roles
 */
export function useRoles(filters?: { is_active?: boolean }) {
  return useQuery({
    queryKey: roleKeys.list(filters),
    queryFn: () => rolesService.listRoles(filters),
  });
}

/**
 * Hook to get a single role by ID
 */
export function useRole(id: string, enabled = true) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesService.getRole(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateRoleForm) => rolesService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create role',
      });
    },
  });
}

/**
 * Hook to update a role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateRoleForm> }) =>
      rolesService.updateRole(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update role',
      });
    },
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => rolesService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete role',
      });
    },
  });
}

/**
 * Hook to assign roles to a worker
 */
export function useAssignWorkerRoles() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ workerId, roleIds }: { workerId: string; roleIds: string[] }) =>
      workersService.assignRoles(workerId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Roles assigned successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to assign roles',
      });
    },
  });
}

/**
 * Alias for useAssignWorkerRoles
 */
export { useAssignWorkerRoles as useAssignRole };

/**
 * Hook to unassign a worker from a role
 */
export function useUnassignRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ workerId, roleId }: { workerId: string; roleId: string }) => {
      // TODO: Implement unassign role API endpoint
      throw new Error('Unassign role not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role unassigned successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to unassign role',
      });
    },
  });
}