import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services';

/**
 * All API calls now use the centralized api service
 * which handles authentication, token refresh, and error handling
 */

/**
 * Custom hook for flow templates management
 */
export function useFlowTemplates(options = {}) {
  const { workspaceId, category, isGlobal, enabled = true } = options;
  const queryClient = useQueryClient();

  // Fetch flow templates
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['flowTemplates', { workspaceId, category, isGlobal }],
    queryFn: async () => {
      const params = {};
      if (workspaceId) params.workspaceId = workspaceId;
      if (category) params.category = category;
      if (isGlobal !== undefined) params.isGlobal = isGlobal;
      
      const response = await api.getFlowTemplates(params);
      return response.flowTemplates || [];
    },
    enabled: enabled && !!workspaceId, // Only fetch if enabled and workspaceId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (flowTemplateData) => {
      const response = await api.createFlowTemplate(flowTemplateData);
      return response.flowTemplate;
    },
    onSuccess: (data) => {
      // Invalidate and refetch flow templates
      queryClient.invalidateQueries(['flowTemplates']);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: flowTemplateData }) => {
      const response = await api.updateFlowTemplate(id, flowTemplateData);
      return response.flowTemplate;
    },
    onMutate: async ({ id, data: flowTemplateData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['flowTemplates']);
      
      // Snapshot previous value
      const previousFlowTemplates = queryClient.getQueryData(['flowTemplates', { workspaceId, category, isGlobal }]);
      
      // Optimistically update
      queryClient.setQueryData(['flowTemplates', { workspaceId, category, isGlobal }], old => {
        if (!old) return old;
        return old.map(ft => ft.id === id ? { ...ft, ...flowTemplateData } : ft);
      });
      
      return { previousFlowTemplates };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFlowTemplates) {
        queryClient.setQueryData(['flowTemplates', { workspaceId, category, isGlobal }], context.previousFlowTemplates);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['flowTemplates']);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteFlowTemplate(id);
      return id;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['flowTemplates']);
      
      // Snapshot previous value
      const previousFlowTemplates = queryClient.getQueryData(['flowTemplates', { workspaceId, category, isGlobal }]);
      
      // Optimistically remove
      queryClient.setQueryData(['flowTemplates', { workspaceId, category, isGlobal }], old => {
        if (!old) return old;
        return old.filter(ft => ft.id !== id);
      });
      
      return { previousFlowTemplates };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFlowTemplates) {
        queryClient.setQueryData(['flowTemplates', { workspaceId, category, isGlobal }], context.previousFlowTemplates);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['flowTemplates']);
    }
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.cloneFlowTemplate(id);
      return response.flowTemplate;
    },
    onSuccess: () => {
      // Refetch to show new cloned template
      queryClient.invalidateQueries(['flowTemplates']);
    }
  });

  return {
    flowTemplates: data || [],
    isLoading,
    error,
    refetch,
    createFlowTemplate: createMutation.mutateAsync,
    isCreating: createMutation.isLoading,
    createError: createMutation.error,
    updateFlowTemplate: updateMutation.mutateAsync,
    isUpdating: updateMutation.isLoading,
    updateError: updateMutation.error,
    deleteFlowTemplate: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isLoading,
    deleteError: deleteMutation.error,
    cloneFlowTemplate: cloneMutation.mutateAsync,
    isCloning: cloneMutation.isLoading,
    cloneError: cloneMutation.error
  };
}

/**
 * Custom hook for fetching a single flow template
 */
export function useFlowTemplate(id) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['flowTemplate', id],
    queryFn: async () => {
      const response = await api.getFlowTemplate(id);
      return response.flowTemplate;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  });

  return {
    flowTemplate: data,
    isLoading,
    error,
    refetch
  };
}
