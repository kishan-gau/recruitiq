import { useQuery } from '@tanstack/react-query';

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export function useDepartments(options?: { isActive?: boolean; search?: string }) {
  return useQuery({
    queryKey: ['nexus', 'departments', options],
    queryFn: async () => {
      const response = await nexusClient.listDepartments({
        isActive: options?.isActive,
        search: options?.search,
      });
      return response.data?.departments || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartment(id: string | null) {
  return useQuery({
    queryKey: ['nexus', 'department', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nexusClient.getDepartment(id);
      return response.data?.department || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
