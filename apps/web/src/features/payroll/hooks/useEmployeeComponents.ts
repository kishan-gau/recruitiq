import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PaylinqClient, APIClient } from '@recruitiq/api-client';

/**
 * Hook to fetch employee's component assignments
 */
export function useEmployeeComponentAssignments(employeeId: string) {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useQuery({
    queryKey: ['employeeComponentAssignments', employeeId],
    queryFn: async () => {
      const response = await paylinqClient.getEmployeeComponentAssignments(employeeId);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to assign a component to an employee
 */
export function useAssignComponent() {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      componentId,
      forFaitairConfig,
    }: {
      employeeId: string;
      componentId: string;
      forFaitairConfig?: any;
    }) => {
      const response = await paylinqClient.assignComponentToEmployee(employeeId, {
        componentId,
        forFaitairConfig,
      });
      return response.data;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeComponentAssignments', employeeId],
      });
    },
  });
}

/**
 * Hook to update an employee's component assignment
 */
export function useUpdateComponentAssignment() {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      assignmentId,
      updates,
    }: {
      employeeId: string;
      assignmentId: string;
      updates: any;
    }) => {
      const response = await paylinqClient.updateComponentAssignment(employeeId, assignmentId, updates);
      return response.data;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeComponentAssignments', employeeId],
      });
    },
  });
}

/**
 * Hook to remove a component assignment from an employee
 */
export function useRemoveComponentAssignment() {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      assignmentId,
    }: {
      employeeId: string;
      assignmentId: string;
    }) => {
      await paylinqClient.removeComponentAssignment(employeeId, assignmentId);
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeComponentAssignments', employeeId],
      });
    },
  });
}
