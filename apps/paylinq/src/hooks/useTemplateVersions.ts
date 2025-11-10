import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

export const useTemplateVersions = (templateCode: string) => {
  const api = usePaylinqAPI();
  
  const query = useQuery({
    queryKey: ['templateVersions', templateCode],
    queryFn: async () => {
      const response = await api.paylinq.getTemplateVersions(templateCode);
      return response;
    },
    enabled: !!templateCode,
  });

  return {
    versions: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
