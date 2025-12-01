/**
 * Pay Components Hooks
 * 
 * Custom React Query hooks for pay components CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

export interface PayComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  category: string;
  calculationType: 'fixed' | 'percentage' | 'formula';
  defaultValue?: number;
  formula?: string;
  isRecurring: boolean;
  isTaxable: boolean;
  status: 'active' | 'inactive';
  description: string;
  // Forfait rule support
  forfaitRuleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CreatePayComponentInput = Omit<PayComponent, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePayComponentInput = Partial<CreatePayComponentInput>;

const PAY_COMPONENTS_QUERY_KEY = ['payComponents'];

/**
 * Map frontend pay component data to backend API format
 */
function mapPayComponentToApi(data: CreatePayComponentInput | UpdatePayComponentInput) {
  const payload: any = {
    code: data.code,
    name: data.name,
    componentType: data.type,
    category: data.category,
    calculationMethod: data.calculationType,
    isRecurring: data.isRecurring,
    isTaxable: data.isTaxable,
    isActive: data.status === 'active',
    description: data.description,
  };

  // Include defaultAmount only if it has a value (for fixed/percentage types)
  if (data.defaultValue !== undefined && data.defaultValue !== null) {
    payload.defaultAmount = data.defaultValue;
  }

  // Include formula if calculationType is 'formula'
  if (data.calculationType === 'formula' && (data as any).formula) {
    payload.formula = (data as any).formula;
  }

  // Include forfaitRuleId if present (store in metadata for now)
  if ('forfaitRuleId' in data) {
    payload.metadata = {
      ...(payload.metadata || {}),
      forfaitRuleId: (data as any).forfaitRuleId || null,
    };
  }

  return payload;
}

/**
 * Hook to fetch all pay components
 */
export function usePayComponents(options?: { params?: Record<string, any>; enabled?: boolean }) {
  const { paylinq } = usePaylinqAPI();
  const params = options?.params;
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery({
    queryKey: [...PAY_COMPONENTS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await paylinq.getPayComponents(params);
      // Response type: PayComponentsListResponse = { success, payComponents: [...], count }
      if (!response) {
        throw new Error('No data received from server');
      }
      return response.payComponents || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single pay component by ID
 */
export function usePayComponent(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_COMPONENTS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getPayComponent(id);
      // Response type: PayComponentResponse = { success, payComponent: {...} }
      if (!response) {
        throw new Error('No data received from server');
      }
      return response.payComponent;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new pay component
 */
export function useCreatePayComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePayComponentInput) => {
      const apiData = mapPayComponentToApi(data);
      const response = await paylinq.createPayComponent(apiData);
      // Response type: PayComponentResponse = { success, payComponent: {...}, message }
      if (!response) {
        throw new Error('No data received from server');
      }
      return response.payComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_COMPONENTS_QUERY_KEY });
      success(`Pay component "${data.componentName}" created successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create pay component');
    },
  });
}

/**
 * Hook to update an existing pay component
 */
export function useUpdatePayComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayComponentInput }) => {
      const apiData = mapPayComponentToApi(data);
      const response = await paylinq.updatePayComponent(id, apiData);
      // Response type: PayComponentResponse = { success, payComponent: {...}, message }
      if (!response) {
        throw new Error('No data received from server');
      }
      return response.payComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_COMPONENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_COMPONENTS_QUERY_KEY, data.id] });
      success(`Pay component "${data.componentName}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update pay component');
    },
  });
}

/**
 * Hook to delete a pay component
 */
export function useDeletePayComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deletePayComponent(id);
      return id;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: PAY_COMPONENTS_QUERY_KEY });
      success('Pay component deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete pay component');
    },
  });
}

/**
 * Hook to filter pay components by type
 */
export function usePayComponentsByType(type: 'earning' | 'deduction') {
  const { data, ...rest } = usePayComponents();
  
  const filteredData = data?.filter((component) => component.componentType === type) || [];
  
  return {
    data: filteredData,
    ...rest,
  };
}
