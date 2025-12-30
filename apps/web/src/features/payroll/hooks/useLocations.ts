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
      return response.data?.locations || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocation(id: string | null) {
  return useQuery({
    queryKey: ['nexus', 'location', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nexusClient.getLocation(id);
      return response.data?.location || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
