import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

/**
 * Forfait Rule interface
 * 
 * Note: Forfait "rules" are actually pay components with category='benefit_forfait'
 * They are stored in the pay_component table with formula-based calculation.
 * This interface maps the pay component fields to forfait-specific names for backward compatibility.
 */
export interface ForfaitRule {
  id: string;
  organizationId: string;
  
  // Pay component fields mapped to forfait names
  componentCode: string; // component_code
  componentName: string; // component_name (displayed as ruleName in UI)
  description: string | null;
  
  // Calculation fields
  calculationType: 'formula'; // Always 'formula' for forfait components
  formula: string; // Formula expression (e.g., "car_catalog_value * 0.02 / 12")
  
  // Forfait-specific metadata (stored in component.metadata JSONB)
  metadata: {
    legal_reference?: string; // e.g., "Wet Loonbelasting Article 4.1"
    forfait_type?: string; // e.g., "company_car", "medical_treatment"
    annual_rate?: number; // e.g., 0.02, 0.075
    daily_rate?: number; // e.g., 10.00, 5.00
    per_meal_rate?: number; // e.g., 5.00, 1.50
    annual_cap?: number; // e.g., 200 for medical treatment
    calculation_basis?: string; // e.g., "catalog_value", "annual_salary"
    required_variables?: string[]; // e.g., ["car_catalog_value"], ["annual_salary"]
    example?: string;
    assignment_note?: string;
    [key: string]: any;
  } | null;
  
  // Status fields
  isActive: boolean; // status = 'active'
  isTaxable: boolean; // Always true for forfait components
  isRecurring: boolean; // Whether applied every payroll run
  isSystemComponent: boolean; // System-protected (can't be deleted)
  
  // GAAP fields
  gaapCategory: string; // Always 'benefits'
  defaultCurrency: string; // e.g., 'SRD'
  
  // Audit fields
  createdAt?: string;
  updatedAt?: string;
}

const FORFAIT_RULES_QUERY_KEY = ['forfaitRules'];

/**
 * Hook to fetch all forfait rules (pay components with category='benefit_forfait')
 * 
 * @param options - Query options
 * @param options.params - Query parameters (filters)
 * @param options.enabled - Whether the query should run (default: true)
 * @returns React Query result with forfait components
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
      // Fetch pay components with category='benefit_forfait'
      const response = await paylinq.get('/pay-components', { 
        params: {
          ...params,
          category: 'benefit_forfait', // Filter for forfait components only
        }
      });
      if (!response) {
        throw new Error('No data received from server');
      }
      
      // Transform pay components to ForfaitRule format for backward compatibility
      const components = response.components || [];
      return (Array.isArray(components) ? components : []).map((component: any) => ({
        id: component.id,
        organizationId: component.organizationId,
        componentCode: component.componentCode,
        componentName: component.componentName,
        description: component.description,
        calculationType: component.calculationType,
        formula: component.formula,
        metadata: component.metadata,
        isActive: component.status === 'active',
        isTaxable: component.isTaxable,
        isRecurring: component.isRecurring,
        isSystemComponent: component.isSystemComponent,
        gaapCategory: component.gaapCategory,
        defaultCurrency: component.defaultCurrency,
        createdAt: component.createdAt,
        updatedAt: component.updatedAt,
      })) as ForfaitRule[];
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
      return response.forfaitRule as ForfaitRule;
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
