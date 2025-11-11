/**
 * Worker Pay Structure Override Hooks
 * 
 * Custom React Query hooks for managing worker-specific component overrides
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

export interface WorkerOverride {
  id: string;
  workerStructureId: string;
  componentCode: string;
  overrideType: 'amount' | 'percentage' | 'formula' | 'rate' | 'disabled' | 'custom' | 'condition';
  overrideAmount?: number;
  overridePercentage?: number;
  overrideFormula?: string;
  overrideFormulaVariables?: any;
  overrideRate?: number;
  isDisabled?: boolean;
  customComponentDefinition?: any;
  overrideConditions?: any;
  overrideMinAmount?: number;
  overrideMaxAmount?: number;
  overrideMaxAnnual?: number;
  overrideReason: string;
  businessJustification?: string;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateWorkerOverrideInput = {
  workerStructureId: string;
  componentCode: string;
  overrideType: 'amount' | 'percentage' | 'formula' | 'rate' | 'disabled' | 'custom' | 'condition';
  overrideAmount?: number;
  overridePercentage?: number;
  overrideFormula?: string;
  overrideFormulaVariables?: any;
  overrideRate?: number;
  isDisabled?: boolean;
  customComponentDefinition?: any;
  overrideConditions?: any;
  overrideMinAmount?: number;
  overrideMaxAmount?: number;
  overrideMaxAnnual?: number;
  overrideReason: string;
  businessJustification?: string;
  requiresApproval?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
};

export type UpdateWorkerOverrideInput = Partial<Omit<CreateWorkerOverrideInput, 'workerStructureId' | 'componentCode'>>;

const WORKER_OVERRIDES_QUERY_KEY = ['workerOverrides'];

/**
 * Hook to fetch worker component overrides
 */
export function useWorkerOverrides(workerStructureId?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_OVERRIDES_QUERY_KEY, workerStructureId],
    queryFn: async () => {
      if (!workerStructureId) {
        return [];
      }
      const response = await paylinq.getPayStructureOverrides(workerStructureId);
      return response.overrides || [];
    },
    enabled: !!workerStructureId,
  });
}

/**
 * Hook to create worker component override
 */
export function useCreateWorkerOverride(employeeId: string) {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkerOverrideInput) => {
      const response = await paylinq.addPayStructureOverride(employeeId, data);
      return { override: response.override, workerStructureId: data.workerStructureId };
    },
    onSuccess: ({ override, workerStructureId }) => {
      // Invalidate specific worker overrides cache
      queryClient.invalidateQueries({ queryKey: [...WORKER_OVERRIDES_QUERY_KEY, workerStructureId] });
      // Invalidate all worker overrides (in case used elsewhere)
      queryClient.invalidateQueries({ queryKey: WORKER_OVERRIDES_QUERY_KEY });
      // Invalidate worker structure cache
      queryClient.invalidateQueries({ queryKey: ['workerPayStructure', employeeId] });
      
      success(`Component override for ${override.componentCode} created successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create component override');
    },
  });
}

/**
 * Hook to update worker component override
 */
export function useUpdateWorkerOverride() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ overrideId, data }: { overrideId: string; data: UpdateWorkerOverrideInput }) => {
      const response = await paylinq.updatePayStructureOverride(overrideId, data);
      return response.override;
    },
    onSuccess: () => {
      // Invalidate worker overrides cache
      queryClient.invalidateQueries({ queryKey: WORKER_OVERRIDES_QUERY_KEY });
      
      success('Component override updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update component override');
    },
  });
}

/**
 * Hook to delete worker component override
 */
export function useDeleteWorkerOverride() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (overrideId: string) => {
      await paylinq.deletePayStructureOverride(overrideId);
    },
    onSuccess: () => {
      // Invalidate worker overrides cache
      queryClient.invalidateQueries({ queryKey: WORKER_OVERRIDES_QUERY_KEY });
      
      success('Component override removed successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete component override');
    },
  });
}
