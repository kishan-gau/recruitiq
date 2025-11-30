/**
 * ScheduleHub Station Management Hooks
 * 
 * React Query hooks for managing stations in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';

// Query keys factory
export const stationKeys = {
  all: ['schedulehub', 'stations'] as const,
  lists: () => [...stationKeys.all, 'list'] as const,
  list: (filters?: any) => [...stationKeys.lists(), filters] as const,
  details: () => [...stationKeys.all, 'detail'] as const,
  detail: (id: string) => [...stationKeys.details(), id] as const,
  requirements: (id: string) => [...stationKeys.detail(id), 'requirements'] as const,
};

/**
 * Hook to fetch all stations
 */
export function useStations(filters?: any) {
  return useQuery({
    queryKey: stationKeys.list(filters),
    queryFn: async () => {
      const response = await schedulehubApi.stations.list(filters);
      return response.stations || response;
    },
  });
}

/**
 * Hook to fetch a single station by ID
 */
export function useStation(id: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.detail(id),
    queryFn: async () => {
      const response = await schedulehubApi.stations.get(id);
      return response.station || response;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch station requirements
 * Note: Requirements are included in the station details
 */
export function useStationRequirements(stationId: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.requirements(stationId),
    queryFn: async () => {
      const response = await schedulehubApi.stations.get(stationId);
      return response.station?.requirements || response.requirements || [];
    },
    enabled: enabled && !!stationId,
  });
}

/**
 * Hook to create a new station
 */
export function useCreateStation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await schedulehubApi.stations.create(data);
      return response.station || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      toast.success('Station created successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create station',
      });
    },
  });
}

/**
 * Hook to update a station
 */
export function useUpdateStation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await schedulehubApi.stations.update(id, updates);
      return response.station || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      toast.success('Station updated successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update station',
      });
    },
  });
}

/**
 * Hook to delete a station
 */
export function useDeleteStation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await schedulehubApi.stations.update(id, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.lists() });
      toast.success('Station deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete station',
      });
    },
  });
}

/**
 * Hook to add station requirement
 */
export function useAddStationRequirement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ stationId, data }: { stationId: string; data: any }) => {
      const response = await schedulehubApi.stations.addRequirement(stationId, data);
      return response.requirement || response;
    },
    onSuccess: (_, { stationId }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.requirements(stationId) });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(stationId) });
      toast.success('Station requirement added successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to add station requirement',
      });
    },
  });
}

/**
 * Hook to update station requirement
 */
export function useUpdateStationRequirement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ stationId, roleId, data }: { stationId: string; roleId: string; data: any }) => {
      const response = await schedulehubApi.stations.updateRequirement(stationId, roleId, data);
      return response.requirement || response;
    },
    onSuccess: (_, { stationId }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.requirements(stationId) });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(stationId) });
      toast.success('Station requirement updated successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update station requirement',
      });
    },
  });
}

/**
 * Hook to remove station requirement
 */
export function useRemoveStationRequirement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ stationId, roleId }: { stationId: string; roleId: string }) => {
      await schedulehubApi.stations.removeRequirement(stationId, roleId);
    },
    onSuccess: (_, { stationId }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.requirements(stationId) });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(stationId) });
      toast.success('Station requirement removed successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to remove station requirement',
      });
    },
  });
}
