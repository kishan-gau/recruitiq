/**
 * ScheduleHub Station Management Hooks
 * 
 * React Query hooks for managing stations in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stationsService } from '../services';
import { useToast } from '../../../contexts/ToastContext';
import { handleApiError } from '../../../utils/errorHandler';
import type { Station, CreateStationForm } from '../types';

// Query keys factory
export const stationKeys = {
  all: ['schedulehub', 'stations'] as const,
  lists: () => [...stationKeys.all, 'list'] as const,
  list: (filters?: any) => [...stationKeys.lists(), filters] as const,
  details: () => [...stationKeys.all, 'detail'] as const,
  detail: (id: string) => [...stationKeys.details(), id] as const,
  coverage: (id: string, date: string) => [...stationKeys.detail(id), 'coverage', date] as const,
};

/**
 * Hook to fetch all stations
 */
export function useStations(filters?: {
  location_id?: string;
  department_id?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: stationKeys.list(filters),
    queryFn: () => stationsService.listStations(filters),
  });
}

/**
 * Get a single station by ID
 */
export function useStation(id: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.detail(id),
    queryFn: () => stationsService.getStation(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to get station coverage analysis
 */
export function useStationCoverage(stationId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: stationKeys.coverage(stationId, date),
    queryFn: () => stationsService.getStationCoverage(stationId, date),
    enabled: enabled && !!stationId && !!date,
  });
}

/**
 * Hook to create a new station
 */
export function useCreateStation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateStationForm) => stationsService.createStation(data),
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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateStationForm> }) =>
      stationsService.updateStation(id, updates),
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
    mutationFn: (id: string) => stationsService.deleteStation(id),
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