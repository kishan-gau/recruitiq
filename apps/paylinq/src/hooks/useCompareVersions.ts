import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

export const useCompareVersions = (fromId: number, toId: number) => {
  const api = usePaylinqAPI();
  
  const query = useQuery({
    queryKey: ['compareVersions', fromId, toId],
    queryFn: async () => {
      const response = await api.paylinq.compareTemplateVersions(fromId, toId);
      return response;
    },
    enabled: !!fromId && !!toId,
  });

  return {
    comparison: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
