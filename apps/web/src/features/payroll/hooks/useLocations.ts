import { useQuery } from '@tanstack/react-query';

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export function useLocations(options?: { isActive?: boolean; search?: string }) {
  return useQuery({
    queryKey: ['nexus', 'locations', options],
    queryFn: async () => {
      const response = await nexusClient.getLocations({
        isActive: options?.isActive,
        search: options?.search,
      });
      const data = response.data?.locations || response.data || [];
      // Return wrapped in locations property for component compatibility
      return { locations: Array.isArray(data) ? data : [data] };
    },
    select: (data) => data.locations, // Extract locations for direct access
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocation(id: string | null) {
  return useQuery({
    queryKey: ['nexus', 'location', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nexusClient.getLocation(id);
      const data = response.data?.location || response.data;
      // Return wrapped in location property for component compatibility
      return { location: data };
    },
    select: (data) => data?.location, // Extract location for direct access
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
