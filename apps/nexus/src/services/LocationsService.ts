/**
 * LocationsService - Handles all location-related API operations
 * Uses TanStack Query for data fetching, caching, and state management
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Location, CreateLocationDTO, UpdateLocationDTO, LocationFilters } from '../types/location.types';
import { NexusClient } from '@recruitiq/api-client';
import { APIClient } from '@recruitiq/api-client';

// Create singleton instance for service-level usage
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

/**
 * Query Keys for TanStack Query
 */
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters?: LocationFilters) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

/**
 * API Functions - Using @recruitiq/api-client
 */
async function fetchLocations(filters?: LocationFilters): Promise<Location[]> {
  console.log('🔍 fetchLocations called with filters:', filters);
  const response = await nexusClient.getLocations(filters);
  console.log('📦 Raw nexusClient response:', response);
  console.log('📦 Response.data:', response.data);
  console.log('📦 Response.data.locations:', response.data?.locations);
  const result = response.data.locations || response.data || [];
  console.log('✅ Final result returned from fetchLocations:', result);
  return result; // Handle apiClient response format
}

async function fetchLocationById(id: string): Promise<Location> {
  try {
    const response = await nexusClient.getLocation(id);
    
    // The APIClient.get() method returns response.data, which should be ApiResponse<Location>
    // Extract the location from the API response format
    return response?.location || response?.data?.location || response;
  } catch (error) {
    console.error('Error fetching location:', error);
    throw error;
  }
}

async function createLocation(data: CreateLocationDTO): Promise<Location> {
  const response = await nexusClient.createLocation(data);
  return response.data.location || response.data; // Handle apiClient response format
}

async function updateLocation(id: string, data: UpdateLocationDTO): Promise<Location> {
  const response = await nexusClient.updateLocation(id, data);
  return response.data.location || response.data; // Handle apiClient response format
}

async function deleteLocation(id: string): Promise<void> {
  await nexusClient.deleteLocation(id);
}

/**
 * Custom Hooks
 */

/**
 * Fetch all locations with optional filters
 */
export function useLocations(filters?: LocationFilters) {
  console.log('🎣 useLocations hook called with filters:', filters);
  return useQuery({
    queryKey: locationKeys.list(filters),
    queryFn: () => {
      console.log('🎣 React Query executing fetchLocations...');
      return fetchLocations(filters);
    },
    onSuccess: (data) => {
      console.log('🎣 React Query onSuccess - data received:', data);
    },
    onError: (error) => {
      console.error('🎣 React Query onError:', error);
    },
  });
}

/**
 * Fetch a single location by ID
 */
export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => fetchLocationById(id),
    enabled: !!id,
  });
}

/**
 * Create a new location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      // Invalidate all location list queries
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Update an existing location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationDTO }) =>
      updateLocation(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific location and all lists
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Delete a location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: (_, id) => {
      // Remove the location from cache and invalidate lists
      queryClient.removeQueries({ queryKey: locationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}
