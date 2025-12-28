import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitsService } from '../services/benefits.service';

export function useBenefitPlans(filters?: any) {
  return useQuery({
    queryKey: ['benefit-plans', filters],
    queryFn: () => benefitsService.listBenefitPlans(filters),
  });
}

export function useBenefitPlan(id: string) {
  return useQuery({
    queryKey: ['benefit-plans', id],
    queryFn: () => benefitsService.getBenefitPlan(id),
    enabled: !!id,
  });
}

export function useCreateBenefitPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: benefitsService.createBenefitPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
    },
  });
}

export function useUpdateBenefitPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      benefitsService.updateBenefitPlan(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans', id] });
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
    },
  });
}

export function useDeleteBenefitPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: benefitsService.deleteBenefitPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
    },
  });
}

export function useEnrollEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_params: { employeeId: string; planId: string }) => {
      // TODO: Implement enrollEmployee in backend NexusClient
      // return benefitsService.enrollEmployee(_params.employeeId, _params.planId);
      throw new Error('Employee enrollment not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
    },
  });
}

export function useCheckEligibility() {
  return useMutation({
    mutationFn: async (_params: { employeeId: string; planId: string }) => {
      // TODO: Implement checkEligibility in backend NexusClient
      // return benefitsService.checkEligibility(_params.employeeId, _params.planId);
      return { eligible: false, reason: 'Eligibility checking not yet implemented' };
    },
  });
}
