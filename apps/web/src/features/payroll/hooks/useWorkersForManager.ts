/**
 * React Query hooks for Workers/Employees
 * Used for manager selection dropdowns
 */

import { useQuery } from '@tanstack/react-query';

import { usePaylinqAPI } from './usePaylinqAPI';

interface UseWorkersForManagerOptions {
  excludeId?: string; // Exclude this worker ID (prevent self-assignment as manager)
  status?: string;
}

/**
 * Hook to fetch active workers for manager selection dropdown
 * Excludes the current worker to prevent circular references
 */
export function useWorkersForManager(options: UseWorkersForManagerOptions = {}) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: ['workers', 'for-manager', options],
    queryFn: async () => {
      // Fetch all active workers
      const response = await paylinq.getWorkers({
        status: options.status || 'active',
      });

      const workers = response.data.workers || response.data || [];

      // Filter out the current worker (if excludeId provided)
      const filteredWorkers = options.excludeId
        ? workers.filter((w: any) => w.id !== options.excludeId)
        : workers;

      return filteredWorkers;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (managers may change frequently)
  });
}
