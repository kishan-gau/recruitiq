import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook for fetching all roles
 */
export function useRoles(params?: any) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: () => schedulehubApi.roles.list(params),
  });
}

/**
 * Hook for fetching a single role
 */
export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => schedulehubApi.roles.get(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: any) => schedulehubApi.roles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create role');
    },
  });
}

/**
 * Hook for updating a role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      schedulehubApi.roles.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update role');
    },
  });
}

/**
 * Hook for deleting a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => schedulehubApi.roles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    },
  });
}

/**
 * Hook for assigning a role to a worker
 */
export function useAssignRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ workerId, roleId }: { workerId: string; roleId: string }) =>
      schedulehubApi.roles.addWorker(roleId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign role');
    },
  });
}

/**
 * Hook for unassigning a role from a worker
 */
export function useUnassignRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ workerId, roleId }: { workerId: string; roleId: string }) =>
      schedulehubApi.roles.removeWorker(roleId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });
      toast.success('Role unassigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unassign role');
    },
  });
}

/**
 * Hook for assigning a worker to a role
 */
export function useAssignWorkerToRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: any }) =>
      schedulehubApi.roles.assignWorker(roleId, data),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', roleId, 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['roles', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Worker assigned to role successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign worker');
    },
  });
}

/**
 * Hook for updating a worker's role assignment
 */
export function useUpdateWorkerRoleAssignment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ roleId, workerId, data }: { roleId: string; workerId: string; data: any }) =>
      schedulehubApi.roles.updateWorkerRole(roleId, workerId, data),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', roleId, 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['roles', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Worker role assignment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    },
  });
}

/**
 * Hook for removing a worker from a role
 */
export function useRemoveWorkerFromRole() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ roleId, workerId }: { roleId: string; workerId: string }) =>
      schedulehubApi.roles.removeWorker(roleId, workerId),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', roleId, 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['roles', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Worker removed from role successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove worker');
    },
  });
}

/**
 * Hook for fetching workers assigned to a role
 */
export function useRoleWorkers(roleId: string) {
  return useQuery({
    queryKey: ['roles', roleId, 'workers'],
    queryFn: () => schedulehubApi.roles.getWorkers(roleId),
    enabled: !!roleId,
  });
}
