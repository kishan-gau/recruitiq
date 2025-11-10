/**
 * LocationsService - Handles all location-related API operations
 * Uses TanStack Query for data fetching, caching, and state management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Location, CreateLocationDTO, UpdateLocationDTO, LocationFilters } from '../types/location.types';

const API_BASE = '/api/nexus/locations';

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
 * API Functions
 */
async function fetchLocations(filters?: LocationFilters): Promise<Location[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.locationType) params.append('locationType', filters.locationType);
  if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
  if (filters?.country) params.append('country', filters.country);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result; // Extract data array from response
}

async function fetchLocationById(id: string): Promise<Location> {
  const response = await fetch(`${API_BASE}/${id}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Location not found');
    }
    throw new Error(`Failed to fetch location: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result; // Extract data from response
}

async function createLocation(data: CreateLocationDTO): Promise<Location> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create location: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result; // Extract data from response
}

async function updateLocation(id: string, data: UpdateLocationDTO): Promise<Location> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update location: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data || result; // Extract data from response
}

async function deleteLocation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete location: ${response.statusText}`);
  }
}

/**
 * Custom Hooks
 */

/**
 * Fetch all locations with optional filters
 */
export function useLocations(filters?: LocationFilters) {
  return useQuery({
    queryKey: locationKeys.list(filters),
    queryFn: () => fetchLocations(filters),
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
