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
