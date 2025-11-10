import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

const WORKERS_QUERY_KEY = ['workers'];

/**
 * Hook to fetch all workers
 */
export function useWorkers() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: WORKERS_QUERY_KEY,
    queryFn: async () => {
      const response = await paylinq.getWorkers();
      return response.data || response.employees || [];
    },
  });
}
