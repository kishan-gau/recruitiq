/**
 * React Query hooks for Benefits feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitsService } from '@/services/employee/benefits.service';
import type { BenefitPlan, Enrollment, BenefitsSummary } from '@/services/employee/benefits.service';

// Query Keys
const benefitsKeys = {
  all: ['benefits'] as const,
  enrollments: () => [...benefitsKeys.all, 'enrollments'] as const,
  summary: () => [...benefitsKeys.all, 'summary'] as const,
  available: () => [...benefitsKeys.all, 'available'] as const,
  enrollment: (id: string) => [...benefitsKeys.all, 'enrollment', id] as const,
  eligibility: (planId: string) => [...benefitsKeys.all, 'eligibility', planId] as const,
};

/**
 * Hook for current benefits enrollments
 */
export function useCurrentBenefits() {
  return useQuery({
    queryKey: benefitsKeys.enrollments(),
    queryFn: () => benefitsService.listEnrollments(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for benefits summary
 */
export function useBenefitsSummary() {
  return useQuery({
    queryKey: benefitsKeys.summary(),
    queryFn: () => benefitsService.getSummary(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for available benefits plans
 */
export function useAvailablePlans() {
  return useQuery({
    queryKey: benefitsKeys.available(),
    queryFn: () => benefitsService.listAvailablePlans(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for a specific enrollment
 */
export function useEnrollment(enrollmentId: string) {
  return useQuery({
    queryKey: benefitsKeys.enrollment(enrollmentId),
    queryFn: () => benefitsService.getEnrollment(enrollmentId),
    enabled: !!enrollmentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for checking plan eligibility
 */
export function usePlanEligibility(planId: string) {
  return useQuery({
    queryKey: benefitsKeys.eligibility(planId),
    queryFn: () => benefitsService.checkEligibility(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook for benefits enrollment
 */
export function useEnrollBenefits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { 
      planId: string; 
      data: {
        coverageLevel: 'employee' | 'employee_spouse' | 'employee_children' | 'family';
        startDate: string;
        dependents?: Array<{ name: string; relationship: string; dateOfBirth: string }>;
      };
    }) => benefitsService.enroll(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.summary() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.available() });
    },
  });
}
