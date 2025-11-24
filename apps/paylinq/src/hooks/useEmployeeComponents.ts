/**
 * React Query hooks for employee pay component management
 * Formula-based component assignment system with forfaitair benefits
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const paylinqClient = new PaylinqClient(apiClient);

// ==================== COMPONENT ASSIGNMENTS ====================

/**
 * Fetch employee's component assignments (with forfaitair benefits)
 */
export function useEmployeeComponentAssignments(employeeId: string | undefined, filters?: any) {
  return useQuery({
    queryKey: ['employee-component-assignments', employeeId, filters],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required');
      const response = await paylinqClient.getEmployeeComponentAssignments(employeeId, filters);
      // API returns array directly
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Assign a component to an employee (with optional forfaitair configuration)
 */
export function useAssignComponent(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  console.log('[useAssignComponent] Hook initialized with employeeId:', employeeId);
  return useMutation({
    mutationFn: async (data: any) => {
      console.log('[useAssignComponent] Mutation called with:', { employeeId, data });
      if (!employeeId) throw new Error('Employee ID is required');
      const response = await paylinqClient.assignComponentToEmployee(employeeId, data);
      console.log('[useAssignComponent] Response:', response);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-component-assignments', employeeId] });
    },
  });
}

/**
 * Update an existing component assignment
 */
export function useUpdateComponentAssignment(employeeId: string | undefined, assignmentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!employeeId || !assignmentId) throw new Error('Employee ID and Assignment ID are required');
      const response = await paylinqClient.updateEmployeeComponentAssignment(employeeId, assignmentId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-component-assignments', employeeId] });
    },
  });
}

/**
 * Remove a component assignment from an employee
 */
export function useRemoveComponentAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, assignmentId }: { employeeId: string; assignmentId: string }) => {
      const response = await paylinqClient.removeEmployeeComponentAssignment(employeeId, assignmentId);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-component-assignments', variables.employeeId] });
    },
  });
}
