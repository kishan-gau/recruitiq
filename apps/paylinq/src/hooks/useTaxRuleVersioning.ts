import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import type { CreateVersionRequest } from '@recruitiq/types';

export const useTaxRuleVersions = (ruleSetId?: string) => {
  const api = usePaylinqAPI();
  
  const query = useQuery({
    queryKey: ['taxRuleVersions', ruleSetId],
    queryFn: async () => {
      if (!ruleSetId) return null;
      const response = await api.paylinq.getTaxRuleVersions(ruleSetId);
      return response.data;
    },
    enabled: !!ruleSetId,
  });

  return {
    versions: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useTaxRuleVersion = (versionId?: string) => {
  const api = usePaylinqAPI();
  
  const query = useQuery({
    queryKey: ['taxRuleVersion', versionId],
    queryFn: async () => {
      if (!versionId) return null;
      const response = await api.paylinq.getTaxRuleVersion(versionId);
      return response.data;
    },
    enabled: !!versionId,
  });

  return {
    version: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useCompareTaxRuleVersions = (fromVersionId?: string, toVersionId?: string) => {
  const api = usePaylinqAPI();
  
  const query = useQuery({
    queryKey: ['compareTaxRuleVersions', fromVersionId, toVersionId],
    queryFn: async () => {
      if (!fromVersionId || !toVersionId) return null;
      const response = await api.paylinq.compareTaxRuleVersions(fromVersionId, toVersionId);
      return response.data;
    },
    enabled: !!fromVersionId && !!toVersionId,
  });

  return {
    comparison: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useCreateTaxRuleVersion = () => {
  const api = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { taxRuleSetId: string } & CreateVersionRequest) => {
      return await api.paylinq.createTaxRuleVersion(variables);
    },
    onSuccess: (_, variables) => {
      // Invalidate versions list for the rule set
      queryClient.invalidateQueries({ 
        queryKey: ['taxRuleVersions', variables.taxRuleSetId] 
      });
      // Invalidate tax rules list to reflect version changes
      queryClient.invalidateQueries({ 
        queryKey: ['taxRules'] 
      });
    },
  });
};

export const usePublishTaxRuleVersion = () => {
  const api = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      return await api.paylinq.publishTaxRuleVersion(versionId);
    },
    onSuccess: (_, versionId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ['taxRuleVersions'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['taxRuleVersion', versionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['taxRules'] 
      });
    },
  });
};