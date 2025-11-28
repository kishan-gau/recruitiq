import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EligibilityCriteria {
  criterion: string;
  met: boolean;
  details?: string;
}

interface BenefitPlanEligibility {
  planId: string;
  planName: string;
  isEligible: boolean;
  criteria: EligibilityCriteria[];
  recommendationLevel?: 'high' | 'medium' | 'low';
  message?: string;
}

// Mock function - replace with actual API call
const checkEligibility = async (_employeeId: string): Promise<BenefitPlanEligibility[]> => {
  // This would be replaced with actual API call
  return [];
};

const enrollInPlan = async (_data: { employeeId: string; planId: string }): Promise<void> => {
  // This would be replaced with actual API call
};

export function useBenefitEligibility(employeeId: string) {
  return useQuery({
    queryKey: ['benefits', 'eligibility', employeeId],
    queryFn: () => checkEligibility(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEnrollInBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollInPlan,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['benefits', 'eligibility', variables.employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ['benefits', 'enrollments', variables.employeeId],
      });
    },
  });
}
