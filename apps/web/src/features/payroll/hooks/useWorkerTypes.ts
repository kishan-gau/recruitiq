import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PaylinqClient, APIClient } from '@recruitiq/api-client';

import { useToast } from '@/contexts/ToastContext';
import { handleApiError, getValidationErrors } from '@/utils/errorHandler';

/**
 * ============================================================================
 * WORKER TYPE TEMPLATES
 * ============================================================================
 */

/**
 * Fetches all worker type templates
 */
export function useWorkerTypeTemplates() {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useQuery({
    queryKey: ['workerTypeTemplates'],
    queryFn: async () => {
      const response = await paylinqClient.getWorkerTypeTemplates();
      const data = response.data.templates || response.data;
      // Return wrapped in templates property for component compatibility
      return { templates: Array.isArray(data) ? data : [data] };
    },
    select: (data) => data.templates, // Extract templates for direct access
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches a single worker type template
 */
export function useWorkerTypeTemplate(templateId: string) {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useQuery({
    queryKey: ['workerTypeTemplate', templateId],
    queryFn: async () => {
      const response = await paylinqClient.getWorkerTypeTemplate(templateId);
      const data = response.data.template || response.data;
      // Return wrapped in template property for component compatibility
      return { template: data };
    },
    select: (data) => data.template, // Extract template for direct access
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Creates a new worker type template
 */
export function useCreateWorkerTypeTemplate() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await paylinqClient.createWorkerTypeTemplate(data);
        return response.data.template || response.data;
      } catch (error: any) {
        const validationErrors = getValidationErrors(error);
        if (validationErrors) {
          throw { validationErrors };
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerTypeTemplates'] });
      toast.success('Worker type template created successfully');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create worker type template',
      });
    },
  });
}

/**
 * Updates a worker type template
 */
export function useUpdateWorkerTypeTemplate() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: any }) => {
      try {
        const response = await paylinqClient.updateWorkerTypeTemplate(templateId, data);
        return response.data.template || response.data;
      } catch (error: any) {
        const validationErrors = getValidationErrors(error);
        if (validationErrors) {
          throw { validationErrors };
        }
        throw error;
      }
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['workerTypeTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['workerTypeTemplate', templateId] });
      toast.success('Worker type template updated successfully');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update worker type template',
      });
    },
  });
}

/**
 * Deletes a worker type template
 */
export function useDeleteWorkerTypeTemplate() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await paylinqClient.deleteWorkerTypeTemplate(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerTypeTemplates'] });
      toast.success('Worker type template deleted successfully');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete worker type template',
      });
    },
  });
}

/**
 * ============================================================================
 * WORKER TYPE ASSIGNMENTS
 * ============================================================================
 */

/**
 * Fetches worker type assignments for an employee
 */
export function useEmployeeWorkerTypeAssignments(_employeeId: string) {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useQuery({
    queryKey: ['employeeWorkerTypeAssignments', employeeId],
    queryFn: async () => {
      const response = await paylinqClient.getEmployeeWorkerTypeAssignments(_employeeId);
      return response.data.assignments || response.data;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Assigns a worker type to an employee
 */
export function useAssignWorkerType() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      workerTypeId,
      effectiveDate,
      config,
    }: {
      employeeId: string;
      workerTypeId: string;
      effectiveDate: string;
      config?: any;
    }) => {
      const response = await paylinqClient.assignWorkerType(employeeId, {
        workerTypeId,
        effectiveDate,
        config,
      });
      return response.data;
    },
    onSuccess: (_, { _employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeWorkerTypeAssignments', employeeId],
      });
      toast.success('Worker type assigned successfully');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to assign worker type',
      });
    },
  });
}

/**
 * Terminates a worker type assignment
 */
export function useTerminateWorkerTypeAssignment() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      assignmentId,
      terminationDate,
    }: {
      employeeId: string;
      assignmentId: string;
      terminationDate: string;
    }) => {
      const response = await paylinqClient.terminateWorkerTypeAssignment(
        employeeId,
        assignmentId,
        terminationDate
      );
      return response.data;
    },
    onSuccess: (_, { _employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeWorkerTypeAssignments', employeeId],
      });
      toast.success('Worker type assignment terminated');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to terminate worker type assignment',
      });
    },
  });
}

/**
 * ============================================================================
 * WORKER TYPE UPGRADES
 * ============================================================================
 */

/**
 * Previews a worker type upgrade
 */
/**
 * Query hook to preview worker type upgrade
 * For use when you need to fetch preview data automatically
 */
export function useWorkerTypeUpgradePreview(workerTypeId: string, enabled: boolean = true) {
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useQuery({
    queryKey: ['worker-type-upgrade-preview', workerTypeId],
    queryFn: async () => {
      if (!workerTypeId) return null;
      // This would need actual employee/target IDs in real implementation
      // For now, return stub data
      return {
        workerTypeId,
        fromTemplate: { id: '', code: '', version: 1, name: '' },
        toTemplate: { id: '', code: '', version: 2, name: '' },
        componentChanges: [],
        affectedWorkersCount: 0,
        affectedWorkers: [],
        componentsAdded: [],
        componentsRemoved: [],
        componentsModified: [],
        changes: [],
      };
    },
    enabled: enabled && Boolean(workerTypeId),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation hook to preview worker type upgrade
 * For use when you want to manually trigger the preview
 */
export function usePreviewWorkerTypeUpgrade() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);

  return useMutation({
    mutationFn: async ({
      employeeId,
      currentWorkerTypeId,
      targetWorkerTypeId,
      effectiveDate,
    }: {
      employeeId: string;
      currentWorkerTypeId: string;
      targetWorkerTypeId: string;
      effectiveDate: string;
    }) => {
      const response = await paylinqClient.previewWorkerTypeUpgrade(employeeId, {
        currentWorkerTypeId,
        targetWorkerTypeId,
        effectiveDate,
      });
      return response.data;
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to preview upgrade',
      });
    },
  });
}

/**
 * Executes a worker type upgrade
 */
export function useExecuteWorkerTypeUpgrade() {
  const toast = useToast();
  const apiClient = new APIClient();
  const paylinqClient = new PaylinqClient(apiClient);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      currentWorkerTypeId,
      targetWorkerTypeId,
      effectiveDate,
    }: {
      employeeId: string;
      currentWorkerTypeId: string;
      targetWorkerTypeId: string;
      effectiveDate: string;
    }) => {
      try {
        const response = await paylinqClient.executeWorkerTypeUpgrade(employeeId, {
          currentWorkerTypeId,
          targetWorkerTypeId,
          effectiveDate,
        });
        return response.data;
      } catch (error: any) {
        const validationErrors = getValidationErrors(error);
        if (validationErrors) {
          throw { validationErrors };
        }
        throw error;
      }
    },
    onSuccess: (_, { _employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employeeWorkerTypeAssignments', employeeId],
      });
      toast.success('Worker type upgraded successfully');
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to upgrade worker type',
      });
    },
  });
}

/**
 * Hook to compare two worker type templates
 */
export function useCompareTemplates(template1Id: string, template2Id: string) {
  return useQuery({
    queryKey: ['worker-type-templates', 'compare', template1Id, template2Id],
    queryFn: async () => 
      // TODO: Implement template comparison API
       ({
        template1: {},
        template2: {},
        differences: [],
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        componentsAdded: [],
        componentsRemoved: [],
        componentsModified: [],
      })
    ,
    enabled: Boolean(template1Id && template2Id),
  });
}

/**
 * Hook to get worker type upgrade status
 */
export function useWorkerTypeUpgradeStatus(workerId: string) {
  return useQuery({
    queryKey: ['worker-type-upgrade-status', workerId],
    queryFn: async () => 
      // TODO: Implement upgrade status API
       ({
        canUpgrade: false,
        currentTemplate: null,
        availableUpgrades: [],
        needsUpgrade: false,
        latestTemplateVersion: '1.0.0',
        latestTemplateName: '',
        workersNeedingUpgrade: 0,
      })
    ,
    enabled: Boolean(workerId),
  });
}
