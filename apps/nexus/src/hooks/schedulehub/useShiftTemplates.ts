/**
 * ScheduleHub Shift Template Management Hooks
 * 
 * React Query hooks for managing shift templates in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import {
  ShiftTemplate,
  ShiftTemplateDetails,
  ShiftTemplateUsage,
  ValidationResult,
  CreateShiftTemplateRequest,
  UpdateShiftTemplateRequest,
  CloneShiftTemplateRequest,
  ShiftTemplateFilters,
} from '@/types/shift-templates';

// Helper function to transform shift template data from API format to UI format
// NOTE: Backend DTO already converts to camelCase, so we mainly just pass through
function transformShiftTemplateFromApi(template: any): ShiftTemplate | null {
  if (!template) return null;
  
  console.log('🔍 [Frontend Transform] Raw template data:', template);
  console.log('🔍 [Frontend Transform] template.stationIds:', template.stationIds);
  console.log('🔍 [Frontend Transform] template.roleRequirements:', template.roleRequirements);
  console.log('🔍 [Frontend Transform] template.roles:', template.roles);
  console.log('🔍 [Frontend Transform] typeof roleRequirements:', typeof template.roleRequirements);
  console.log('🔍 [Frontend Transform] Array.isArray(roleRequirements):', Array.isArray(template.roleRequirements));
  if (template.roleRequirements) {
    console.log('🔍 [Frontend Transform] roleRequirements length:', template.roleRequirements.length);
    template.roleRequirements.forEach((role, idx) => {
      console.log(`🔍 [Frontend Transform] Role ${idx}:`, role);
    });
  }
  
  const transformed = {
    ...template,
    // Backend DTO already provides camelCase, so use those directly
    startTime: template.startTime,
    endTime: template.endTime,
    isActive: template.isActive,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    createdBy: template.createdBy,
    updatedBy: template.updatedBy,
    deletedAt: template.deletedAt,
    totalPositions: template.totalWorkers, // Map from backend field name
    // Preserve stationIds from API response
    stationIds: template.stationIds || [],
    // Map roleRequirements to roles for form compatibility
    roles: template.roleRequirements || template.roles || [],
  };
  
  console.log('🔍 Transformed template with stationIds:', transformed.stationIds);
  console.log('🔍 Transformed template with roles:', transformed.roles);
  return transformed;
}

// Helper function to normalize time format to HH:MM (removes seconds if present)
function normalizeTimeFormat(time: string): string {
  if (!time) return time;
  
  // If time includes seconds (HH:MM:SS), remove them
  if (time.length > 5 && time.includes(':')) {
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
  }
  
  return time;
}

// Helper function to transform shift template data from UI format (camelCase) to API format (snake_case)
function transformShiftTemplateToApi(data: any) {
  // SECURITY: Validate data exists before transformation
  // Returning null causes HTTP client to send literal "null" string, causing JSON parse errors
  // Instead, throw early to prevent malformed requests
  if (!data) {
    throw new Error('Cannot transform null or undefined data to API format');
  }
  
  // FIXED: Complete DTO transformation to match backend expectations
  // The backend expects camelCase field names, so we don't need snake_case conversion here
  // The backend DTO (mapShiftTemplateApiToDb) handles camelCase → snake_case conversion
  
  const transformed: any = {};
  
  // Core template fields (required)
  if (data.templateName !== undefined) {
    transformed.templateName = data.templateName;
  }
  if (data.description !== undefined) {
    transformed.description = data.description;
  }
  if (data.startTime !== undefined) {
    // FIXED: Normalize time format to HH:MM (backend expects no seconds)
    transformed.startTime = normalizeTimeFormat(data.startTime);
  }
  if (data.endTime !== undefined) {
    // FIXED: Normalize time format to HH:MM (backend expects no seconds)
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
    console.log('🔍 [Transform API] Mapping stationIds:', data.stationIds);
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
  
  console.log('✅ [Transform Complete] Final payload to API:', {
    hasStationIds: !!transformed.stationIds,
    stationIds: transformed.stationIds,
    templateName: transformed.templateName
  });
  
  return transformed;
}

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
      const response = await schedulehubApi.shiftTemplates.getAll(filters);
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
export function useShiftTemplate(id: string, enabled = true): any {
  return useQuery({
    queryKey: shiftTemplateKeys.detail(id),
    queryFn: async (): Promise<ShiftTemplateDetails> => {
      const response = await schedulehubApi.shiftTemplates.getById(id);
      console.log('🔍 useShiftTemplate - Full API response:', response);
      console.log('🔍 useShiftTemplate - response.shiftTemplate:', response.shiftTemplate);
      console.log('🔍 useShiftTemplate - response.template:', response.template);
      const template = response.shiftTemplate || response.template || response;
      console.log('🔍 useShiftTemplate - Extracted template:', template);
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
      const response = await schedulehubApi.shiftTemplates.getSummaries(filters);
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
 */
export function useShiftTemplateUsage(id: string, enabled = true) {
  return useQuery({
    queryKey: shiftTemplateKeys.usage(id),
    queryFn: async (): Promise<ShiftTemplateUsage> => {
      const response = await schedulehubApi.shiftTemplates.getUsageStats(id);
      const usage = response.usage || response;
      
      return {
        ...usage,
        lastUsed: usage.last_used,
        createdShifts: usage.created_shifts,
        upcomingShifts: usage.upcoming_shifts,
        totalHours: usage.total_hours,
        averageFillRate: usage.average_fill_rate,
      };
    },
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
      const response = await schedulehubApi.shiftTemplates.create(apiData);
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
      // VALIDATION: Ensure updates object has at least one field
      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided for shift template');
      }
      
      const apiUpdates = transformShiftTemplateToApi(updates);
      
      // SECURITY: Ensure transformed data is not empty after processing
      if (!apiUpdates || Object.keys(apiUpdates).length === 0) {
        throw new Error('Transformed update data is empty - cannot send empty request');
      }
      
      const response = await schedulehubApi.shiftTemplates.update(id, apiUpdates);
      const template = response.shiftTemplate || response.template || response;
      return transformShiftTemplateFromApi(template) as ShiftTemplate;
    },
    onSuccess: (_, variables) => {
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
      await schedulehubApi.shiftTemplates.delete(id);
    },
    onSuccess: (_, id) => {
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
      const response = await schedulehubApi.shiftTemplates.duplicate(data.id, { name: data.name });
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
      const response = await schedulehubApi.shiftTemplates.validate(apiData);
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
          const response = await schedulehubApi.shiftTemplates.getById(id);
          const template = response.shiftTemplate || response.template || response;
          return transformShiftTemplateFromApi(template);
        },
      });
    },
    prefetchUsage: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: shiftTemplateKeys.usage(id),
        queryFn: () => schedulehubApi.shiftTemplates.getUsageStats(id),
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
      const response = await schedulehubApi.shiftTemplates.update(id, { isActive });
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
      const promises = ids.map(id => schedulehubApi.shiftTemplates.delete(id));
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
        schedulehubApi.shiftTemplates.update(id, { isActive: true })
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
        schedulehubApi.shiftTemplates.update(id, { isActive: false })
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