/**
 * Worker Types Hooks
 * 
 * Custom React Query hooks for worker type templates and assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError, getValidationErrors } from '@/utils/errorHandler';
import type {
  CreateWorkerTypeTemplateRequest,
  UpdateWorkerTypeTemplateRequest,
  CreateWorkerTypeAssignmentRequest,
  UpdateWorkerTypeAssignmentRequest,
  PaginationParams,
  UpgradeWorkersRequest,
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
      const response = await paylinq.getWorkerTypeTemplates(params);
      return response.workerTypes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus that overwrites cache updates
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
      // Extract resource-specific key: { success: true, workerType: {...} }
      return (apiResponse as any)?.workerType || null;
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
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkerTypeTemplateRequest) => {
      // APIClient.post() returns response.data directly
      const apiResponse = await paylinq.createWorkerTypeTemplate(data);
      // Extract resource-specific key: { success: true, workerType: {...} }
      return (apiResponse as any)?.workerType || apiResponse;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: WORKER_TYPE_TEMPLATES_KEY });
      if (data) {
        toast.success(`Worker type "${data.name}" created successfully`);
      }
    },
    onError: (err: any) => {
      // Check for validation errors first
      const validationErrors = getValidationErrors(err);
      if (validationErrors) {
        const fieldErrors = Object.entries(validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        toast.error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use centralized error handler
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to create worker type template',
        });
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
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkerTypeTemplateRequest }) => {
      // APIClient.put() returns response.data directly
      const apiResponse = await paylinq.updateWorkerTypeTemplate(id, data);
      // Extract resource-specific key: { success: true, workerType: {...} }
      return (apiResponse as any)?.workerType || apiResponse;
    },
    onSuccess: async (data: any) => {
      if (data) {
        console.log('✅ onSuccess received data:', data);
        console.log('   payStructureTemplateCode:', data.payStructureTemplateCode);
        
        // Update the single item cache directly for immediate UI update
        queryClient.setQueryData([...WORKER_TYPE_TEMPLATES_KEY, data.id], data);
        
        // Get all existing queries that match the list pattern
        const existingQueries = queryClient.getQueriesData({
          queryKey: [...WORKER_TYPE_TEMPLATES_KEY, 'list'],
          exact: false,
        });
        
        console.log('📋 Found', existingQueries.length, 'list queries to update');
        
        // Update each list query individually
        existingQueries.forEach(([queryKey, _]) => {
          console.log('   Updating query:', queryKey);
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData || !Array.isArray(oldData)) {
              console.log('   ⚠️ oldData is not an array:', oldData);
              return oldData;
            }
            const newData = oldData.map((item: any) => 
              item.id === data.id ? { ...data } : item
            );
            console.log('   ✅ Updated array, new item:', newData.find((item: any) => item.id === data.id));
            return newData;
          });
        });
        
        // Force refetch of upgrade status queries to immediately show upgrade availability
        // This is necessary because changing payStructureTemplateCode affects upgrade status
        await queryClient.invalidateQueries({ 
          queryKey: [...WORKER_TYPE_TEMPLATES_KEY, data.id, 'upgrade-status'],
          refetchType: 'active', // Only refetch queries that are currently being observed
        });
        
        // Also refetch the specific upgrade status query to ensure the banner appears
        await queryClient.refetchQueries({
          queryKey: [...WORKER_TYPE_TEMPLATES_KEY, data.id, 'upgrade-status'],
          exact: true,
        });
        
        toast.success(`Worker type "${data.name}" updated successfully`);
      }
    },
    onError: (err: any) => {
      // Check for validation errors first
      const validationErrors = getValidationErrors(err);
      if (validationErrors) {
        const fieldErrors = Object.entries(validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        toast.error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use centralized error handler
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to update worker type template',
        });
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
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteWorkerTypeTemplate(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKER_TYPE_TEMPLATES_KEY });
      toast.success('Worker type template deleted successfully');
    },
    onError: (err: any) => {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to delete worker type template',
      });
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
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkerTypeAssignmentRequest) => {
      const response = await paylinq.assignWorkerType(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      toast.success('Worker type assigned successfully');
    },
    onError: (err: any) => {
      // Check for validation errors first
      const validationErrors = getValidationErrors(err);
      if (validationErrors) {
        const fieldErrors = Object.entries(validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        toast.error(`Validation failed: ${fieldErrors}`);
      } else {
        // Use centralized error handler
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to assign worker type',
        });
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
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkerTypeAssignmentRequest }) => {
      const response = await paylinq.updateWorkerTypeAssignment(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      toast.success('Worker type assignment updated successfully');
    },
    onError: (err: any) => {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to update worker type assignment',
      });
    },
  });
}

/**
 * Hook to terminate a worker type assignment
 */
export function useTerminateWorkerTypeAssignment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, effectiveTo }: { id: string; effectiveTo: string }) => {
      const response = await paylinq.terminateWorkerTypeAssignment(id, effectiveTo);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [...WORKER_TYPE_ASSIGNMENTS_KEY, 'employee', data?.employeeId] 
      });
      toast.success('Worker type assignment terminated successfully');
    },
    onError: (err: any) => {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to terminate worker type assignment',
      });
    },
  });
}

/**
 * Hook to fetch active worker type templates only
 */
export function useActiveWorkerTypeTemplates() {
  return useWorkerTypeTemplates({ status: 'active' });
}

// ============================================================================
// Worker Type Template Upgrades
// ============================================================================

/**
 * Hook to fetch upgrade status for a worker type template
 * Shows which workers need to be upgraded to the latest template version
 */
export function useWorkerTypeUpgradeStatus(workerTypeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_TEMPLATES_KEY, workerTypeId, 'upgrade-status'],
    queryFn: async () => {
      try {
        const apiResponse = await paylinq.getWorkerTypeUpgradeStatus(workerTypeId);
        console.log('🔍 Upgrade Status API Response:', apiResponse);
        // Extract resource-specific key: { success: true, upgradeStatus: {...} }
        const status = (apiResponse as any)?.upgradeStatus || null;
        console.log('🔍 Extracted upgrade status:', status);
        
        // Map backend response to frontend expectations
        if (status) {
          const mapped = {
            ...status,
            needsUpgrade: status.requiresUpgrade, // Map requiresUpgrade → needsUpgrade
            workersNeedingUpgrade: status.outdatedCount, // Map outdatedCount → workersNeedingUpgrade
          };
          console.log('🔍 Mapped upgrade status:', mapped);
          return mapped;
        }
        
        console.log('🔍 No upgrade status found, returning null');
        return null;
      } catch (error) {
        console.error('❌ Upgrade status query failed:', {
          workerTypeId,
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorResponse: (error as any)?.response?.data
        });
        throw error;
      }
    },
    enabled: !!workerTypeId,
    staleTime: 2 * 60 * 1000, // 2 minutes - upgrade status changes less frequently
  });
}

/**
 * Hook to preview template upgrade
 * Shows what will change when upgrading workers to the latest template
 */
export function usePreviewWorkerTypeUpgrade(workerTypeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_TYPE_TEMPLATES_KEY, workerTypeId, 'preview-upgrade'],
    queryFn: async () => {
      const apiResponse = await paylinq.previewWorkerTypeUpgrade(workerTypeId);
      // Extract resource-specific key: { success: true, preview: {...} }
      return (apiResponse as any)?.preview || null;
    },
    enabled: !!workerTypeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to upgrade workers to latest template version
 */
export function useUpgradeWorkersToTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ workerTypeId, data }: { workerTypeId: string; data: UpgradeWorkersRequest }) => {
      const apiResponse = await paylinq.upgradeWorkersToTemplate(workerTypeId, data);
      // Extract resource-specific key: { success: true, result: {...} }
      return (apiResponse as any)?.result || apiResponse;
    },
    onSuccess: (result: any, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [...WORKER_TYPE_TEMPLATES_KEY, variables.workerTypeId] });
      queryClient.invalidateQueries({ queryKey: [...WORKER_TYPE_TEMPLATES_KEY, variables.workerTypeId, 'upgrade-status'] });
      queryClient.invalidateQueries({ queryKey: WORKER_TYPE_ASSIGNMENTS_KEY });
      
      // Show success message with details
      const upgradedCount = result?.upgradedCount || 0;
      const failedCount = result?.failedCount || 0;
      
      if (failedCount > 0) {
        toast.warning(`${upgradedCount} workers upgraded successfully, ${failedCount} failed`);
      } else {
        toast.success(`${upgradedCount} worker${upgradedCount !== 1 ? 's' : ''} upgraded successfully`);
      }
    },
    onError: (err: any) => {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to upgrade workers',
      });
    },
  });
}

/**
 * Hook to compare two pay structure templates
 * Shows differences between template versions
 */
export function useCompareTemplates(fromTemplateCode?: string, toTemplateCode?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: ['templates', 'compare', fromTemplateCode, toTemplateCode],
    queryFn: async () => {
      if (!fromTemplateCode || !toTemplateCode) {
        return null;
      }
      const apiResponse = await paylinq.compareTemplates(fromTemplateCode, toTemplateCode);
      // Extract resource-specific key: { success: true, comparison: {...} }
      return (apiResponse as any)?.comparison || null;
    },
    enabled: !!fromTemplateCode && !!toTemplateCode,
    staleTime: 5 * 60 * 1000, // 5 minutes - template comparisons don't change often
  });
}

