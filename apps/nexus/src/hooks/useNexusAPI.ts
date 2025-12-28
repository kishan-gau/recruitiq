/**
 * Nexus API Hook
 * 
 * React hook for accessing Nexus + ScheduleHub API clients
 * Provides access to all Nexus endpoints and ScheduleHub features
 * 
 * BACKWARD COMPATIBILITY: Includes shift template wrapper for migrated components
 */

import { RecruitIQPlatformAPI } from '@recruitiq/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Create singleton instance
// ARCHITECTURE: Use default /api baseURL
// - Core APIs: /api/auth/*, /api/csrf-token
// - Product APIs: /api/products/nexus/* and /api/products/schedulehub/*
// Vite proxy forwards /api/* to backend
const api = new RecruitIQPlatformAPI({
  // baseURL defaults to '/api' in APIClient
  timeout: 30000,
});

/**
 * Custom hook for shift template mutations
 * Creates React Query mutations for toggleStatus and bulk operations
 * 
 * These mutations are compatible with migrated component expectations:
 * - toggleStatus() → React Query mutation for updating isActive status
 * - bulkOperations() → Object with .bulkActivate, .bulkDeactivate, .bulkDelete sub-mutations
 * 
 * @returns Object with shift template mutations
 */
function useShiftTemplateMutations() {
  const queryClient = useQueryClient();

  // Toggle status mutation
  // Maps: toggleStatusMutation.mutateAsync({ id, isActive })
  // To: api.schedulehub.updateShiftTemplate(id, { isActive })
  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api.schedulehub.updateShiftTemplate(id, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });

  // Bulk activate mutation
  // Maps: bulkActivate.mutateAsync(templateIds)
  // To: api.schedulehub.bulkUpdateShiftTemplates({ action: 'activate', templateIds })
  const bulkActivate = useMutation({
    mutationFn: async (templateIds: string[]) => {
      return api.schedulehub.bulkUpdateShiftTemplates({
        action: 'activate',
        templateIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });

  // Bulk deactivate mutation
  // Maps: bulkDeactivate.mutateAsync(templateIds)
  // To: api.schedulehub.bulkUpdateShiftTemplates({ action: 'deactivate', templateIds })
  const bulkDeactivate = useMutation({
    mutationFn: async (templateIds: string[]) => {
      return api.schedulehub.bulkUpdateShiftTemplates({
        action: 'deactivate',
        templateIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });

  // Bulk delete mutation
  // Maps: bulkDelete.mutateAsync(templateIds)
  // To: api.schedulehub.bulkUpdateShiftTemplates({ action: 'delete', templateIds })
  const bulkDelete = useMutation({
    mutationFn: async (templateIds: string[]) => {
      return api.schedulehub.bulkUpdateShiftTemplates({
        action: 'delete',
        templateIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });

  return {
    toggleStatus,
    bulkActivate,
    bulkDeactivate,
    bulkDelete,
  };
}

/**
 * Hook to access Nexus + ScheduleHub API
 *
 * Returns API clients and backward-compatibility shift template wrapper
 * 
 * BACKWARD COMPATIBILITY:
 * The shiftTemplates wrapper maps old method names to new ScheduleHubClient methods.
 * This allows migrated components to work without modification:
 * - nexusAPI.shiftTemplates.list() → api.schedulehub.getShiftTemplates()
 * - nexusAPI.shiftTemplates.getById() → api.schedulehub.getShiftTemplate()
 * - nexusAPI.shiftTemplates.toggleStatus() → React Query mutation for updateShiftTemplate
 * - nexusAPI.shiftTemplates.bulkOperations() → Object with sub-mutations
 *
 * @example
 * const { nexus, schedulehub, shiftTemplates } = useNexusAPI();
 * 
 * // Direct API access
 * const locations = await nexus.listLocations();
 * const shifts = await schedulehub.getShiftTemplates({ date: '2025-01-15' });
 * 
 * // Backward compatibility wrapper for migrated components
 * const toggleMutation = shiftTemplates.toggleStatus();
 * const bulkOps = shiftTemplates.bulkOperations();
 */
export const useNexusAPI = () => {
  const queryClient = useQueryClient();
  const mutations = useShiftTemplateMutations();

  /**
   * Shift templates wrapper for backward compatibility
   * Maps old method names to new ScheduleHubClient API
   */
  const shiftTemplates = {
    // Query methods (direct API calls, not mutations)
    list: (filters?: any) => api.schedulehub.getShiftTemplates(filters),
    getById: (id: string) => api.schedulehub.getShiftTemplate(id),
    validate: (data: any) => api.schedulehub.validateShiftTemplate(data),
    duplicate: (id: string, name?: string) => api.schedulehub.duplicateShiftTemplate(id, name),

    // Mutation methods (return React Query mutations)
    // Components call: const mut = shiftTemplates.create(); then mut.mutateAsync(data)
    create: () =>
      useMutation({
        mutationFn: (data: any) => api.schedulehub.createShiftTemplate(data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
        },
      }),
    
    update: () =>
      useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
          api.schedulehub.updateShiftTemplate(id, data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
        },
      }),
    
    delete: () =>
      useMutation({
        mutationFn: (id: string) => api.schedulehub.deleteShiftTemplate(id),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
        },
      }),

    // Toggle status mutation
    // Components call: const mut = shiftTemplates.toggleStatus(); then mut.mutateAsync({ id, isActive })
    toggleStatus: () => mutations.toggleStatus,

    // Bulk operations mutations
    // Components call: const mut = shiftTemplates.bulkOperations();
    // Then: mut.bulkActivate.mutateAsync(ids), mut.bulkDeactivate.mutateAsync(ids), etc.
    bulkOperations: () => ({
      bulkActivate: mutations.bulkActivate,
      bulkDeactivate: mutations.bulkDeactivate,
      bulkDelete: mutations.bulkDelete,
    }),
  };

  return {
    nexus: api.nexus,
    schedulehub: api.schedulehub,
    shiftTemplates, // Backward compatibility wrapper
    auth: api.auth,
    client: api.getClient(),
  };
};

// Export for non-hook usage
export const nexusAPI = api.nexus;
export const scheduleHubAPI = api.schedulehub;
export const authAPI = api.auth;

export default api;
