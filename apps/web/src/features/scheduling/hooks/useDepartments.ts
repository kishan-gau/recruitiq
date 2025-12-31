import { useQuery } from '@tanstack/react-query';

/**
 * Hook for fetching departments
 * TODO: Implement actual API call
 */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      // TODO: Implement actual API call
      return [];
    },
  });
}
