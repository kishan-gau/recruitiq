import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { taxService } from '../services/tax.service';

export function useTaxRules(filters?: any) {
  return useQuery({
    queryKey: ['tax-rules', filters],
    queryFn: () => taxService.getTaxRules(filters),
  });
}

export function useTaxRule(id: string) {
  return useQuery({
    queryKey: ['tax-rules', id],
    queryFn: () => taxService.getTaxRule(id),
    enabled: !!id,
  });
}

export function useCreateTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taxService.createTaxRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    },
  });
}

export function useUpdateTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taxService.updateTaxRule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', id] });
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    },
  });
}

export function useDeleteTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taxService.deleteTaxRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    },
  });
}

/**
 * Combined tax management hook
 * Provides all tax-related functionality in a single hook for convenience
 */
export function useTax(filters?: any) {
  const taxRulesQuery = useTaxRules(filters);
  const createMutation = useCreateTaxRule();
  const updateMutation = useUpdateTaxRule();
  const deleteMutation = useDeleteTaxRule();

  return {
    taxRules: taxRulesQuery.data,
    isLoadingRules: taxRulesQuery.isLoading,
    isErrorRules: taxRulesQuery.isError,
    errorRules: taxRulesQuery.error,
    createTaxRule: createMutation.mutate,
    updateTaxRule: updateMutation.mutate,
    deleteTaxRule: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
