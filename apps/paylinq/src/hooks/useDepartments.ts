/**
 * React Query hooks for Nexus Department Management
 * Used by PayLinQ for organizational structure
 */

import { useQuery } from '@tanstack/react-query';
import { NexusClient, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

interface UseDepartmentsOptions {
  isActive?: boolean;
  search?: string;
}

/**
 * Hook to fetch all departments
 */
export function useDepartments(options: UseDepartmentsOptions = {}) {
  return useQuery({
    queryKey: ['nexus', 'departments', options],
    queryFn: async () => {
      const response = await nexusClient.listDepartments({
        isActive: options.isActive,
        search: options.search,
      });
      return response.departments || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single department
 */
export function useDepartment(id: string | null) {
  return useQuery({
    queryKey: ['nexus', 'departments', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nexusClient.getDepartment(id);
      return response.department;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
