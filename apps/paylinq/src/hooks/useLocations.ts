/**
 * React Query hooks for Nexus Location Management
 * Used by PayLinQ for organizational structure
 */

import { useQuery } from '@tanstack/react-query';
import { NexusClient, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

interface UseLocationsOptions {
  isActive?: boolean;
  search?: string;
}

/**
 * Hook to fetch all locations
 */
export function useLocations(options: UseLocationsOptions = {}) {
  return useQuery({
    queryKey: ['nexus', 'locations', options],
    queryFn: async () => {
      const response = await nexusClient.getLocations({
        isActive: options.isActive,
        search: options.search,
      });
      return response.data.locations || response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single location
 */
export function useLocation(id: string | null) {
  return useQuery({
    queryKey: ['nexus', 'locations', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nexusClient.getLocation(id);
      return response.data.location || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
