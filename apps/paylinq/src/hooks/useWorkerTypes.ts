/**
 * Worker Types Hooks
 * 
 * Custom React Query hooks for worker type templates and assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  CreateWorkerTypeTemplateRequest,
  UpdateWorkerTypeTemplateRequest,
  CreateWorkerTypeAssignmentRequest,
  UpdateWorkerTypeAssignmentRequest,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const WORKER_TYPE_TEMPLATES_KEY = ['workerTypeTemplates'];
const WORKER_TYPE_ASSIGNMENTS_KEY = ['workerTypeAssignments'];

// ============================================================================
// Worker Type Templates
// ============================================================================

/**
 * Hook to fetch all worker type templates
 */
export function useWorkerTypeTemplates(params?: PaginationParams & { status?: string }) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_TEMPLATES_KEY, 'list', params],
    queryFn: async () => {
      // APIClient.get() returns response.data directly, not the full axios response
      // So 'response' here is already { success: true, workerTypeTemplates: [...], pagination: {...} }
      const apiResponse = await paylinq.getWorkerTypeTemplates(params);
      
      // Extract resource-specific key from API response
      const templates = (apiResponse as any)?.workerTypeTemplates || [];
      
      return templates;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single worker type template by ID
 */
export function useWorkerTypeTemplate(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_TEMPLATES_KEY, id],
    queryFn: async () => {
      // APIClient.get() returns response.data directly
      const apiResponse = await paylinq.getWorkerTypeTemplate(id);
      // Extract resource-specific key: { success: true, workerTypeTemplate: {...} }
      return (apiResponse as any)?.workerTypeTemplate || null;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new worker type template
 */
export function useCreateWorkerTypeTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkerTypeTemplateRequest) => {
      // APIClient.post() returns response.data directly
      const apiResponse = await paylinq.createWorkerTypeTemplate(data);
      // Extract resource-specific key: { success: true, workerTypeTemplate: {...} }
      return (apiResponse as any)?.workerTypeTemplate || apiResponse;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: WORKER_TYPE_TEMPLATES_KEY });
      if (data) {
        success(`Worker type "${data.name}" created successfully`);
      }
    },
    onError: (err: any) => {
      const errorData = err?.response?.data;
      
      // Handle validation errors with detailed field-level messages
      if (errorData?.errorCode === 'VALIDATION_ERROR' && errorData?.details?.errors) {
        const fieldErrors = errorData.details.errors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(', ');
        error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use error message from response, fallback to generic
        error(errorData?.error || errorData?.message || 'Failed to create worker type template');
      }
    },
  });
}

/**
 * Hook to update a worker type template
 */
export function useUpdateWorkerTypeTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkerTypeTemplateRequest }) => {
      // APIClient.put() returns response.data directly
      const apiResponse = await paylinq.updateWorkerTypeTemplate(id, data);
      // Extract resource-specific key: { success: true, workerTypeTemplate: {...} }
      return (apiResponse as any)?.workerTypeTemplate || apiResponse;
    },
    onSuccess: (data: any) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: WORKER_TYPE_TEMPLATES_KEY });
        queryClient.invalidateQueries({ queryKey: [...WORKER_TYPE_TEMPLATES_KEY, data.id] });
        success(`Worker type "${data.name}" updated successfully`);
      }
    },
    onError: (err: any) => {
      const errorData = err?.response?.data;
      
      // Handle validation errors with detailed field-level messages
      if (errorData?.errorCode === 'VALIDATION_ERROR' && errorData?.details?.errors) {
        const fieldErrors = errorData.details.errors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(', ');
        error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use error message from response, fallback to generic
        error(errorData?.error || errorData?.message || 'Failed to update worker type template');
      }
    },
  });
}

/**
 * Hook to delete a worker type template
 */
export function useDeleteWorkerTypeTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteWorkerTypeTemplate(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKER_TYPE_TEMPLATES_KEY });
      success('Worker type template deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete worker type template');
    },
  });
}

// ============================================================================
// Worker Type Assignments
// ============================================================================

/**
 * Hook to fetch worker type assignments for an employee
 */
export function useEmployeeWorkerTypes(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', employeeId],
    queryFn: async () => {
      const response = await paylinq.getEmployeeWorkerTypes(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch current worker type assignment for an employee
 */
export function useCurrentWorkerType(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', employeeId, 'current'],
    queryFn: async () => {
      const response = await paylinq.getCurrentWorkerType(employeeId);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch worker type assignment history for an employee
 */
export function useWorkerTypeHistory(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', employeeId, 'history'],
    queryFn: async () => {
      const response = await paylinq.getWorkerTypeHistory(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to assign a worker type to an employee
 */
export function useAssignWorkerType() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkerTypeAssignmentRequest) => {
      const response = await paylinq.assignWorkerType(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      success('Worker type assigned successfully');
    },
    onError: (err: any) => {
      const errorData = err?.response?.data;
      
      // Handle validation errors with detailed field-level messages
      if (errorData?.errorCode === 'VALIDATION_ERROR' && errorData?.details?.errors) {
        const fieldErrors = errorData.details.errors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(', ');
        error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use error message from response, fallback to generic
        error(errorData?.error || errorData?.message || 'Failed to assign worker type');
      }
    },
  });
}

/**
 * Hook to update a worker type assignment
 */
export function useUpdateWorkerTypeAssignment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkerTypeAssignmentRequest }) => {
      const response = await paylinq.updateWorkerTypeAssignment(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      success('Worker type assignment updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update worker type assignment');
    },
  });
}

/**
 * Hook to terminate a worker type assignment
 */
export function useTerminateWorkerTypeAssignment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, effectiveTo }: { id: string; effectiveTo: string }) => {
      const response = await paylinq.terminateWorkerTypeAssignment(id, effectiveTo);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      success('Worker type assignment terminated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to terminate worker type assignment');
    },
  });
}

/**
 * Hook to fetch active worker type templates only
 */
export function useActiveWorkerTypeTemplates() {
  return useWorkerTypeTemplates({ status: 'active' });
}

