import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

/**
 * Forfait Rule interface
 * Represents a rule for forfeit/replacement of pay components
 */
export interface ForfaitRule {
  id: string;
  organizationId: string;
  ruleName: string;
  description: string | null;
  sourceComponentId: string;
  forfaitComponentId: string;
  percentageRate: number;
  applyOnGross: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  catalogValue: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

const FORFAIT_RULES_QUERY_KEY = ['forfaitRules'];

/**
 * Hook to fetch all forfait rules for the organization
 * 
 * @param options - Query options
 * @param options.params - Query parameters (filters)
 * @param options.enabled - Whether the query should run (default: true)
 * @returns React Query result with forfait rules data
 * 
 * @example
 * ```tsx
 * const { data: forfaitRules, isLoading } = useForfaitRules();
 * const { data: activeForfaitRules } = useForfaitRules({ 
 *   params: { isActive: true } 
 * });
 * ```
 */
export function useForfaitRules(options?: {
  params?: Record<string, any>;
  enabled?: boolean;
}) {
  const { paylinq } = usePaylinqAPI();
  const params = options?.params;
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery({
    queryKey: [...FORFAIT_RULES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await paylinq.get('/forfait-rules', { params });
      if (!response) {
        throw new Error('No data received from server');
      }
      return (response.data?.forfaitRules || response.data || []) as ForfaitRule[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - same as pay components
  });
}

/**
 * Hook to fetch a single forfait rule by ID
 * 
 * @param id - Forfait rule ID
 * @param options - Query options
 * @returns React Query result with single forfait rule
 * 
 * @example
 * ```tsx
 * const { data: forfaitRule } = useForfaitRule(ruleId);
 * ```
 */
export function useForfaitRule(id: string, options?: { enabled?: boolean }) {
  const { paylinq } = usePaylinqAPI();
  const enabled = options?.enabled !== undefined ? options.enabled : !!id;

  return useQuery({
    queryKey: [...FORFAIT_RULES_QUERY_KEY, id],
    queryFn: async () => {
      const response = await paylinq.get(`/forfait-rules/${id}`);
      if (!response) {
        throw new Error('No data received from server');
      }
      return (response.data?.forfaitRule || response.data) as ForfaitRule;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch active forfait rules only
 * Convenience hook for the most common use case
 * 
 * @returns React Query result with active forfait rules
 * 
 * @example
 * ```tsx
 * const { data: activeRules, isLoading } = useActiveForfaitRules();
 * ```
 */
export function useActiveForfaitRules() {
  return useForfaitRules({
    params: { isActive: true },
  });
}
