/**
 * ScheduleHub Station Management Hooks
 * 
 * React Query hooks for managing stations in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';

// Helper function to transform station data from API format (snake_case) to UI format (camelCase)
function transformStationFromApi(station: any) {
  if (!station) return null;
  
  return {
    ...station,
    isActive: station.is_active, // Transform snake_case to camelCase
    stationName: station.name, // Backend returns 'name', form expects 'stationName'
    stationCode: station.stationCode, // Ensure this is available
    locationId: station.locationId, // Ensure this is available
  };
}

// Helper function to transform station data from UI format to API format
function transformStationToApi(data: any) {
  if (!data) return null;
  
  // Return data as-is since backend expects camelCase field names
  return { ...data };
}

// Query keys factory
export const stationKeys = {
  all: ['schedulehub', 'stations'] as const,
  lists: () => [...stationKeys.all, 'list'] as const,
  list: (filters?: any) => [...stationKeys.lists(), filters] as const,
  details: () => [...stationKeys.all, 'detail'] as const,
  detail: (id: string) => [...stationKeys.details(), id] as const,
  requirements: (id: string) => [...stationKeys.detail(id), 'requirements'] as const,
  assignments: (id: string) => [...stationKeys.detail(id), 'assignments'] as const,
};

/**
 * Hook to fetch all stations
 */
export function useStations(filters?: any) {
  return useQuery({
    queryKey: stationKeys.list(filters),
    queryFn: async () => {
      const response = await schedulehubApi.stations.list(filters);
      const stations = response.stations || response;
      
      // Transform array of stations
      if (Array.isArray(stations)) {
        return stations.map(transformStationFromApi);
      }
      
      return stations;
    },
  });
}

/**
 * Get a single station by ID
 */
export function useStation(id: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.detail(id),
    queryFn: async () => {
      const response = await schedulehubApi.stations.get(id);
      const station = response.station || response;
      return transformStationFromApi(station);
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch station requirements
 * Uses the dedicated requirements endpoint
 */
export function useStationRequirements(stationId: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.requirements(stationId),
    queryFn: async () => {
      const response = await schedulehubApi.stations.getRequirements(stationId);
      return response || [];
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
      const apiData = transformStationToApi(data);
      const response = await schedulehubApi.stations.create(apiData);
      const station = response.station || response;
      return transformStationFromApi(station);
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
      const apiUpdates = transformStationToApi(updates);
      const response = await schedulehubApi.stations.update(id, apiUpdates);
      const station = response.station || response;
      return transformStationFromApi(station);
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
      const apiUpdates = transformStationToApi({ isActive: false });
      await schedulehubApi.stations.update(id, apiUpdates);
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

/**
 * Hook to fetch station assignments
 */
export function useStationAssignments(stationId: string) {
  return useQuery({
    queryKey: stationKeys.assignments(stationId),
    queryFn: async () => {
      const response = await schedulehubApi.stations.getAssignments(stationId);
      // API returns { success: true, assignments: [...] }
      // Extract the assignments array for React Query's data property
      return response.assignments || [];
    },
    enabled: !!stationId,
  });
}

/**
 * Hook to assign an employee to a station
 */
export function useAssignEmployee() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: { stationId: string; employeeId: string; notes?: string }) =>
      schedulehubApi.stations.assignEmployee(data),
    onSuccess: (_, { stationId }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.assignments(stationId) });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(stationId) });
      toast.success('Employee assigned to station successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to assign employee to station',
      });
    },
  });
}

/**
 * Hook to unassign an employee from a station
 */
export function useUnassignEmployee() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ stationId, assignmentId }: { stationId: string; assignmentId: string }) =>
      schedulehubApi.stations.unassignEmployee(stationId, assignmentId),
    onSuccess: (_, { stationId }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.assignments(stationId) });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(stationId) });
      toast.success('Employee unassigned from station successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to unassign employee from station',
      });
    },
  });
}
