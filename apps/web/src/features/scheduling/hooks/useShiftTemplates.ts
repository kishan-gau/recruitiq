import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { handleApiError } from '@/utils/errorHandler';

import { templatesService } from '../services';
import type { 
  ShiftTemplate,
  ShiftTemplateDetails,
  ShiftTemplateFilters,
  ShiftTemplateUsage,
  CreateShiftTemplateRequest,
  UpdateShiftTemplateRequest,
  CloneShiftTemplateRequest,
  ValidationResult,
} from '../types';

/**
 * Normalizes time format to HH:MM (backend expects no seconds)
 */
const normalizeTimeFormat = (time: string): string => {
  if (!time) return time;
  
  // If time has seconds (HH:MM:SS), remove them
  if (time.includes(':') && time.split(':').length === 3) {
    return time.substring(0, 5); // Keep only HH:MM
  }
  
  return time;
};

/**
 * Transforms shift template data FROM API format (snake_case) to frontend format (camelCase)
 */
const transformShiftTemplateFromApi = (data: any): ShiftTemplate => {
  if (!data) return data;

  const transformed = {
    // Core fields
    id: data.id,
    templateName: data.template_name || data.templateName,
    description: data.description,
    
    // Timing fields
    startTime: data.start_time || data.startTime,
    endTime: data.end_time || data.endTime,
    breakDuration: data.break_duration || data.breakDuration,
    totalHours: data.total_hours || data.totalHours,
    
    // Flexibility fields
    isFlexible: data.is_flexible || data.isFlexible,
    flexibilityMinutes: data.flexibility_minutes || data.flexibilityMinutes,
    
    // Recurring fields
    isRecurring: data.is_recurring || data.isRecurring,
    recurrencePattern: data.recurrence_pattern || data.recurrencePattern,
    
    // Validity fields
    validityStartDate: data.validity_start_date || data.validityStartDate,
    validityEndDate: data.validity_end_date || data.validityEndDate,
    
    // Status and config
    priority: data.priority,
    isActive: data.is_active ?? data.isActive,
    stationId: data.station_id || data.stationId,
    stationIds: data.station_ids || data.stationIds,
    
    // Role requirements
    roleRequirements: data.role_requirements || data.roleRequirements || [],
    
    // Audit fields
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    createdBy: data.created_by || data.createdBy,
    updatedBy: data.updated_by || data.updatedBy,
  };

  return transformed;
};

/**
 * Transforms shift template data TO API format (camelCase to snake_case)
 */
const transformShiftTemplateToApi = (data: any): any => {
  if (!data) return data;

  const transformed: any = {};

  // Core fields
  if (data.templateName !== undefined) {
    transformed.templateName = data.templateName;
  }
  if (data.description !== undefined) {
    transformed.description = data.description;
  }
  if (data.startTime !== undefined) {
    // Normalize time format to HH:MM (backend expects no seconds)
    transformed.startTime = normalizeTimeFormat(data.startTime);
  }
  if (data.endTime !== undefined) {
    // Normalize time format to HH:MM (backend expects no seconds)
    transformed.endTime = normalizeTimeFormat(data.endTime);
  }
  
  // Duration and timing fields
  if (data.breakDuration !== undefined) {
    transformed.breakDuration = data.breakDuration;
  }
  if (data.totalHours !== undefined) {
    transformed.totalHours = data.totalHours;
  }
  if (data.shiftDuration !== undefined) {
    // Convert minutes to hours for totalHours if not explicitly set
    if (data.totalHours === undefined) {
      transformed.totalHours = data.shiftDuration / 60;
    }
  }
  
  // Flexibility fields  
  if (data.isFlexible !== undefined) {
    transformed.isFlexible = data.isFlexible;
  }
  if (data.isFlexibleTiming !== undefined) {
    transformed.isFlexible = data.isFlexibleTiming; // Map form field to API field
  }
  if (data.flexibilityMinutes !== undefined) {
    transformed.flexibilityMinutes = data.flexibilityMinutes;
  }
  
  // Recurring fields
  if (data.isRecurring !== undefined) {
    transformed.isRecurring = data.isRecurring;
  }
  if (data.recurrencePattern !== undefined) {
    transformed.recurrencePattern = data.recurrencePattern;
  }
  
  // Validity fields
  if (data.validityStartDate !== undefined) {
    transformed.validityStartDate = data.validityStartDate;
  }
  if (data.validityEndDate !== undefined) {
    transformed.validityEndDate = data.validityEndDate;
  }
  
  // Other fields
  if (data.priority !== undefined) {
    transformed.priority = data.priority;
  }
  if (data.isActive !== undefined) {
    transformed.isActive = data.isActive;
  }
  if (data.stationId !== undefined) {
    transformed.stationId = data.stationId;
  }
  if (data.stationIds !== undefined) {
    transformed.stationIds = data.stationIds;
  }
  
  // Role requirements (rename from 'roles' to 'roleRequirements')
  if (data.roles !== undefined) {
    transformed.roleRequirements = data.roles.map((role: any) => ({
      roleId: role.roleId,
      quantity: role.quantity,
      minimumProficiency: role.minimumProficiency,
      preferredProficiency: role.preferredProficiency,
      isPrimaryRole: role.isPrimaryRole,
      priority: role.priority,
      isFlexible: role.isFlexible
    }));
  }
  if (data.roleRequirements !== undefined) {
    transformed.roleRequirements = data.roleRequirements;
  }
  
  // Audit fields
  if (data.createdAt !== undefined) {
    transformed.createdAt = data.createdAt;
  }
  if (data.updatedAt !== undefined) {
    transformed.updatedAt = data.updatedAt;
  }
  if (data.createdBy !== undefined) {
    transformed.createdBy = data.createdBy;
  }
  if (data.updatedBy !== undefined) {
    transformed.updatedBy = data.updatedBy;
  }
  
  return transformed;
};

// Query keys factory
export const shiftTemplateKeys = {
  all: ['schedulehub', 'shiftTemplates'] as const,
  lists: () => [...shiftTemplateKeys.all, 'list'] as const,
  list: (filters?: ShiftTemplateFilters) => [...shiftTemplateKeys.lists(), filters] as const,
  details: () => [...shiftTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...shiftTemplateKeys.details(), id] as const,
  summaries: () => [...shiftTemplateKeys.all, 'summaries'] as const,
  usage: (id: string) => [...shiftTemplateKeys.detail(id), 'usage'] as const,
  validation: (data: any) => [...shiftTemplateKeys.all, 'validation', data] as const,
};

/**
 * Hook to fetch all shift templates
 */
export function useShiftTemplates(filters?: ShiftTemplateFilters) {
  return useQuery({
    queryKey: shiftTemplateKeys.list(filters),
    queryFn: async () => {
      const response = await templatesService.getShiftTemplates(filters);
      const templates = response.shiftTemplates || response.templates || response;
      
      // Transform array of templates
      if (Array.isArray(templates)) {
        return {
          ...response,
          templates: templates.map(transformShiftTemplateFromApi),
        };
      }
      
      return response;
    },
  });
}

/**
 * Get a single shift template by ID
 */
export function useShiftTemplate(id: string, enabled = true) {
  return useQuery({
    queryKey: shiftTemplateKeys.detail(id),
    queryFn: async (): Promise<ShiftTemplateDetails> => {
      const response = await templatesService.getShiftTemplate(id);
      const template = response.shiftTemplate || response.template || response;
      return transformShiftTemplateFromApi(template) as ShiftTemplateDetails;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch shift template summaries
 */
export function useShiftTemplateSummaries(filters?: ShiftTemplateFilters) {
  return useQuery({
    queryKey: shiftTemplateKeys.summaries(),
    queryFn: async () => {
      const response = await templatesService.getShiftTemplates(filters);
      const summaries = response.summaries || response;
      
      if (Array.isArray(summaries)) {
        return summaries.map((summary: any) => ({
          ...summary,
          createdAt: summary.created_at,
          isActive: summary.is_active,
          totalPositions: summary.total_positions,
          startTime: summary.start_time,
          endTime: summary.end_time,
        }));
      }
      
      return summaries;
    },
  });
}

/**
 * Hook to fetch shift template usage statistics
 * 
 * NOTE: This returns stub data until backend getUsageStats() is implemented
 */
export function useShiftTemplateUsage(id: string, enabled = true) {
  return useQuery({
    queryKey: shiftTemplateKeys.usage(id),
    queryFn: async (): Promise<ShiftTemplateUsage> => 
      // Return placeholder data structure matching expected ShiftTemplateUsage type
      // TODO: Implement getUsageStats() in backend and ScheduleHubClient
       ({
        lastUsed: null,
        createdShifts: 0,
        upcomingShifts: 0,
        totalHours: 0,
        averageFillRate: 0,
      })
    ,
    enabled: enabled && !!id,
  });
}

/**
 * Hook to create a new shift template
 */
export function useCreateShiftTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateShiftTemplateRequest): Promise<ShiftTemplate> => {
      const apiData = transformShiftTemplateToApi(data);
      const response = await templatesService.createShiftTemplate(apiData);
      const template = response.shiftTemplate || response.template || response;
      return transformShiftTemplateFromApi(template) as ShiftTemplate;
    },
    onSuccess: () => {
      // Invalidate all list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.all });
      toast.success('Shift template created successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create shift template',
      });
    },
  });
}

/**
 * Hook to update a shift template
 */
export function useUpdateShiftTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: UpdateShiftTemplateRequest 
    }): Promise<ShiftTemplate> => {
      // Validation: Ensure updates object has at least one field
      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided for shift template');
      }
      
      const apiUpdates = transformShiftTemplateToApi(updates);
      
      // Security: Ensure transformed data is not empty after processing
      if (!apiUpdates || Object.keys(apiUpdates).length === 0) {
        throw new Error('Transformed update data is empty - cannot send empty request');
      }
      
      const response = await templatesService.updateShiftTemplate(id, apiUpdates);
      const template = response.shiftTemplate || response.template || response;
      return transformShiftTemplateFromApi(template) as ShiftTemplate;
    },
    onSuccess: () => {
      // Invalidate all queries related to this template and lists
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.all });
      toast.success('Shift template updated successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update shift template',
      });
    },
  });
}

/**
 * Hook to delete a shift template (soft delete)
 */
export function useDeleteShiftTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await templatesService.deleteShiftTemplate(id);
    },
    onSuccess: () => {
      // Invalidate all shift template queries
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.all });
      toast.success('Shift template deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete shift template',
      });
    },
  });
}

/**
 * Hook to clone a shift template
 */
export function useCloneShiftTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CloneShiftTemplateRequest): Promise<ShiftTemplate> => {
      const response = await templatesService.duplicateShiftTemplate(data.id, data.name);
      const template = response.shiftTemplate || response.template || response;
      return transformShiftTemplateFromApi(template) as ShiftTemplate;
    },
    onSuccess: () => {
      // Invalidate all shift template queries
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.all });
      toast.success('Shift template cloned successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to clone shift template',
      });
    },
  });
}

/**
 * Hook to validate a shift template
 */
export function useValidateShiftTemplate() {
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateShiftTemplateRequest | UpdateShiftTemplateRequest): Promise<ValidationResult> => {
      const apiData = transformShiftTemplateToApi(data);
      const response = await templatesService.validateShiftTemplate(apiData);
      return response.validation || response;
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to validate shift template',
      });
    },
  });
}

// Convenience hooks for specific use cases

/**
 * Hook to search shift templates
 */
export function useSearchShiftTemplates(query: string, filters?: ShiftTemplateFilters) {
  const searchFilters = {
    ...filters,
    search: query,
  };
  
  return useShiftTemplates(searchFilters);
}

/**
 * Hook to get active shift templates only
 */
export function useActiveShiftTemplates(filters?: Omit<ShiftTemplateFilters, 'isActive'>) {
  const activeFilters = {
    ...filters,
    isActive: true,
  };
  
  return useShiftTemplates(activeFilters);
}

/**
 * Hook to get shift templates by department
 */
export function useShiftTemplatesByDepartment(
  departmentId: string, 
  filters?: Omit<ShiftTemplateFilters, 'departmentId'>
) {
  const departmentFilters = {
    ...filters,
    departmentId,
  };
  
  return useShiftTemplates(departmentFilters);
}

/**
 * Hook to get shift templates by station
 */
export function useShiftTemplatesByStation(
  stationId: string, 
  filters?: Omit<ShiftTemplateFilters, 'stationId'>
) {
  const stationFilters = {
    ...filters,
    stationId,
  };
  
  return useShiftTemplates(stationFilters);
}

/**
 * Hook for optimistic updates when updating template roles
 */
export function useOptimisticShiftTemplateUpdate() {
  const queryClient = useQueryClient();
  
  return {
    updateOptimistic: (templateId: string, updates: Partial<ShiftTemplate>) => {
      queryClient.setQueryData(
        shiftTemplateKeys.detail(templateId),
        (old: ShiftTemplateDetails | undefined) => 
          old ? { ...old, ...updates } : old
      );
    },
    rollback: (templateId: string) => {
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.detail(templateId) });
    },
  };
}

/**
 * Hook to prefetch shift template data for better UX
 */
export function usePrefetchShiftTemplate() {
  const queryClient = useQueryClient();
  
  return {
    prefetchTemplate: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: shiftTemplateKeys.detail(id),
        queryFn: async () => {
          const response = await templatesService.getShiftTemplate(id);
          const template = response.shiftTemplate || response.template || response;
          return transformShiftTemplateFromApi(template);
        },
      });
    },
    prefetchUsage: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: shiftTemplateKeys.usage(id),
        queryFn: async (): Promise<ShiftTemplateUsage> => 
          // Stub implementation until backend getUsageStats() is implemented
           ({
            lastUsed: null,
            createdShifts: 0,
            upcomingShifts: 0,
            totalHours: 0,
            averageFillRate: 0,
          })
        ,
      });
    },
  };
}

/**
 * Hook for toggling shift template status
 */
export function useToggleShiftTemplateStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await templatesService.updateShiftTemplate(id, { isActive });
      return response.shiftTemplate || response.template || response;
    },
    onSuccess: (data, variables) => {
      toast.success(
        `Shift template ${variables.isActive ? 'activated' : 'deactivated'} successfully`
      );
      
      // Update the template in cache
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.lists() });
      
      if (data?.id) {
        queryClient.setQueryData(
          shiftTemplateKeys.detail(data.id),
          transformShiftTemplateFromApi(data)
        );
      }
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to toggle template status',
      });
    },
  });
}

/**
 * Hook for bulk operations on shift templates
 */
export function useBulkShiftTemplateOperations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => templatesService.deleteShiftTemplate(id));
      return Promise.all(promises);
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} template${ids.length === 1 ? '' : 's'} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.lists() });
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete templates',
      });
    },
  });

  const bulkActivate = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => 
        templatesService.updateShiftTemplate(id, { isActive: true })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} template${ids.length === 1 ? '' : 's'} activated successfully`);
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.lists() });
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to activate templates',
      });
    },
  });

  const bulkDeactivate = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => 
        templatesService.updateShiftTemplate(id, { isActive: false })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} template${ids.length === 1 ? '' : 's'} deactivated successfully`);
      queryClient.invalidateQueries({ queryKey: shiftTemplateKeys.lists() });
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to deactivate templates',
      });
    },
  });

  return {
    bulkDelete,
    bulkActivate,
    bulkDeactivate,
  };
}
/**
 * Hook to get shift template usage statistics
 */
export function useShiftTemplateUsage(templateId: string) {
  return useQuery({
    queryKey: shiftTemplateKeys.template(templateId, "usage"),
    queryFn: async () => {
      // This would call an API endpoint to get usage stats
      // For now, return mock data
      return {
        totalShifts: 0,
        activeShifts: 0,
        upcomingShifts: 0,
        completedShifts: 0,
      };
    },
    enabled: !!templateId,
  });
}

