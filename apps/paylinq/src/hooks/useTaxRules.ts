/**
 * Tax Rules Query Hooks
 * 
 * TanStack Query hooks for tax rule operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

/**
 * Query Keys
 */
export const taxRuleKeys = {
  all: ['tax-rules'] as const,
  lists: () => [...taxRuleKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...taxRuleKeys.lists(), filters] as const,
  details: () => [...taxRuleKeys.all, 'detail'] as const,
  detail: (id: string) => [...taxRuleKeys.details(), id] as const,
};

/**
 * Fetch all tax rules
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTaxRules({ status: 'active' });
 * ```
 */
export const useTaxRules = (filters?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}) => {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: taxRuleKeys.list(filters || {}),
    queryFn: async () => {
      const response = await paylinq.getTaxRules(filters);
      console.log('🔍 Tax Rules API Response:', response);
      console.log('🔍 Tax Rules count:', response.taxRules?.length);
      if (response.taxRules?.length > 0) {
        console.log('🔍 First tax rule:', response.taxRules[0]);
      }
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch tax rules');
      }
      return response.taxRules || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - tax rules change infrequently
  });
};

/**
 * Fetch single tax rule by ID
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useTaxRule('rule-123');
 * ```
 */
export const useTaxRule = (id: string) => {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: taxRuleKeys.detail(id),
    queryFn: async () => {
      const response = await paylinq.getTaxRule(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch tax rule');
      }
      return response.taxRule;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Create new tax rule
 * 
 * @example
 * ```tsx
 * const createMutation = useCreateTaxRule();
 * 
 * await createMutation.mutateAsync({
 *   name: 'Wage Tax 2025',
 *   type: 'wage-tax',
 *   brackets: [...]
 * });
 * ```
 */
export const useCreateTaxRule = () => {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await paylinq.createTaxRule(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create tax rule');
      }
      return response.taxRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.lists() });
    },
  });
};

/**
 * Update existing tax rule
 * 
 * @example
 * ```tsx
 * const updateMutation = useUpdateTaxRule('rule-123');
 * 
 * await updateMutation.mutateAsync({
 *   status: 'inactive'
 * });
 * ```
 */
export const useUpdateTaxRule = (id: string) => {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await paylinq.updateTaxRule(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update tax rule');
      }
      return response.taxRule;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(taxRuleKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.lists() });
    },
  });
};

/**
 * Delete tax rule
 * 
 * @example
 * ```tsx
 * const deleteMutation = useDeleteTaxRule();
 * 
 * await deleteMutation.mutateAsync('rule-123');
 * ```
 */
export const useDeleteTaxRule = () => {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.deleteTaxRule(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete tax rule');
      }
      return response.taxRule;
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: taxRuleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.lists() });
    },
  });
};

/**
 * Calculate taxes for an employee
 * 
 * @example
 * ```tsx
 * const calculateMutation = useCalculateTaxes();
 * 
 * await calculateMutation.mutateAsync({
 *   employeeId: 'emp-123',
 *   grossPay: 50000,
 *   payPeriodStart: '2025-01-01',
 *   payPeriodEnd: '2025-01-31'
 * });
 * ```
 */
export const useCalculateTaxes = () => {
  const { paylinq } = usePaylinqAPI();

  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      grossPay: number;
      payPeriodStart: string;
      payPeriodEnd: string;
    }) => {
      const response = await paylinq.calculateTaxes(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to calculate taxes');
      }
      return response.taxCalculations;
    },
  });
};

/**
 * Setup default Suriname tax rules
 * 
 * @example
 * ```tsx
 * const setupMutation = useSetupSurinameTaxRules();
 * 
 * await setupMutation.mutateAsync();
 * ```
 */
export const useSetupSurinameTaxRules = () => {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await paylinq.setupSurinameTaxRules();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to setup Suriname tax rules');
      }
      return response.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.lists() });
    },
  });
};
