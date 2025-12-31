import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/contexts/ToastContext';

import { usePaylinqAPI } from './usePaylinqAPI';

export interface PayComponent {
  id: string;
  organizationId: string;
  componentCode: string;
  componentName: string;
  componentType: 'earnings' | 'deductions';
  description?: string;
  calculationType: 'fixed' | 'percentage' | 'formula';
  calculationMetadata?: {
    fixedAmount?: number;
    percentageBase?: string;
    formula?: string;
  };
  forFaitRule?: {
    isApplicable: boolean;
    minimumHours?: number;
    baseSalary?: number;
  };
  isActive: boolean;
  isTaxable: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CreatePayComponentInput {
  componentCode: string;
  componentName: string;
  componentType: 'earnings' | 'deductions';
  description?: string;
  calculationType: 'fixed' | 'percentage' | 'formula';
  calculationMetadata?: {
    fixedAmount?: number;
    percentageBase?: string;
    formula?: string;
  };
  forFaitRule?: {
    isApplicable: boolean;
    minimumHours?: number;
    baseSalary?: number;
  };
  isTaxable: boolean;
  displayOrder: number;
}

export interface UpdatePayComponentInput {
  componentName?: string;
  description?: string;
  calculationType?: 'fixed' | 'percentage' | 'formula';
  calculationMetadata?: {
    fixedAmount?: number;
    percentageBase?: string;
    formula?: string;
  };
  forFaitRule?: {
    isApplicable: boolean;
    minimumHours?: number;
    baseSalary?: number;
  };
  isActive?: boolean;
  isTaxable?: boolean;
  displayOrder?: number;
}

/**
 * Fetch all pay components with optional filters
 */
export function usePayComponents(filters?: { type?: 'earnings' | 'deductions'; isActive?: boolean }) {
  const { client } = usePaylinqAPI();

  return useQuery({
    queryKey: ['payComponents', filters],
    queryFn: async () => {
      const response = await client.listPayComponents(filters);
      return mapPayComponentToApi(response.data.payComponents || response.data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single pay component by ID
 */
export function usePayComponent(componentId: string) {
  const { client } = usePaylinqAPI();

  return useQuery({
    queryKey: ['payComponent', componentId],
    queryFn: async () => {
      const response = await client.getPayComponent(componentId);
      return mapPayComponentToApi(response.data.payComponent || response.data);
    },
    enabled: !!componentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new pay component
 */
export function useCreatePayComponent() {
  const { client } = usePaylinqAPI();
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePayComponentInput) => {
      const response = await client.createPayComponent(data);
      return mapPayComponentToApi(response.data.payComponent);
    },
    onSuccess: (data) => {
      toast.success('Pay component created successfully');
      queryClient.invalidateQueries({ queryKey: ['payComponents'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create pay component';
      toast.error(message);
    },
  });
}

/**
 * Update an existing pay component
 */
export function useUpdatePayComponent(componentId: string) {
  const { client } = usePaylinqAPI();
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePayComponentInput) => {
      const response = await client.updatePayComponent(componentId, data);
      return mapPayComponentToApi(response.data.payComponent);
    },
    onSuccess: (data) => {
      toast.success('Pay component updated successfully');
      queryClient.invalidateQueries({ queryKey: ['payComponent', componentId] });
      queryClient.invalidateQueries({ queryKey: ['payComponents'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update pay component';
      toast.error(message);
    },
  });
}

/**
 * Delete a pay component
 */
export function useDeletePayComponent(componentId: string) {
  const { client } = usePaylinqAPI();
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await client.deletePayComponent(componentId);
    },
    onSuccess: () => {
      toast.success('Pay component deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['payComponent', componentId] });
      queryClient.invalidateQueries({ queryKey: ['payComponents'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to delete pay component';
      toast.error(message);
    },
  });
}

/**
 * Get pay components filtered by type
 */
export function usePayComponentsByType(type: 'earnings' | 'deductions') {
  return usePayComponents({ type });
}

/**
 * Map database response to API format
 */
function mapPayComponentToApi(data: any): PayComponent | PayComponent[] {
  if (Array.isArray(data)) {
    return data.map((item) => mapPayComponentToApi(item)) as PayComponent[];
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    componentCode: data.component_code,
    componentName: data.component_name,
    componentType: data.component_type,
    description: data.description,
    calculationType: data.calculation_type,
    calculationMetadata: data.calculation_metadata,
    forFaitRule: data.for_fait_rule,
    isActive: data.is_active,
    isTaxable: data.is_taxable,
    displayOrder: data.display_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
  };
}
