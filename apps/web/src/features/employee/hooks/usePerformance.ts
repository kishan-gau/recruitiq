/**
 * React Query hooks for Performance feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService } from '@/services/employee/performance.service';

// Query Keys
const performanceKeys = {
  all: ['performance'] as const,
  reviews: (params?: object) => [...performanceKeys.all, 'reviews', params] as const,
  review: (id: string) => [...performanceKeys.all, 'review', id] as const,
  goals: (params?: object) => [...performanceKeys.all, 'goals', params] as const,
  goal: (id: string) => [...performanceKeys.all, 'goal', id] as const,
  feedback: (params?: object) => [...performanceKeys.all, 'feedback', params] as const,
  developmentPlans: (params?: object) => [...performanceKeys.all, 'development-plans', params] as const,
  developmentPlan: (id: string) => [...performanceKeys.all, 'development-plan', id] as const,
};

/**
 * Hook for performance reviews
 */
export function usePerformanceReviews(params?: { status?: string; year?: number }) {
  return useQuery({
    queryKey: performanceKeys.reviews(params),
    queryFn: () => performanceService.listPerformanceReviews(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for single performance review
 */
export function usePerformanceReview(reviewId: string) {
  return useQuery({
    queryKey: performanceKeys.review(reviewId),
    queryFn: () => performanceService.getPerformanceReview(reviewId),
    enabled: !!reviewId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for goals
 */
export function useGoals(params?: { status?: string; year?: number }) {
  return useQuery({
    queryKey: performanceKeys.goals(params),
    queryFn: () => performanceService.listGoals(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for single goal
 */
export function useGoal(goalId: string) {
  return useQuery({
    queryKey: performanceKeys.goal(goalId),
    queryFn: () => performanceService.getGoal(goalId),
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for feedback
 */
export function useFeedback(params?: { type?: string; dateRange?: { start: string; end: string } }) {
  return useQuery({
    queryKey: performanceKeys.feedback(params),
    queryFn: () => performanceService.listFeedback(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for development plans
 */
export function useDevelopmentPlans(params?: { status?: string }) {
  return useQuery({
    queryKey: performanceKeys.developmentPlans(params),
    queryFn: () => performanceService.listDevelopmentPlans(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for single development plan
 */
export function useDevelopmentPlan(planId: string) {
  return useQuery({
    queryKey: performanceKeys.developmentPlan(planId),
    queryFn: () => performanceService.getDevelopmentPlan(planId),
    enabled: !!planId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Mutation hook for updating goal progress
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, progress }: { goalId: string; progress: number }) =>
      performanceService.updateGoalProgress(goalId, progress),
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.invalidateQueries({ queryKey: performanceKeys.goal(goalId) });
    },
  });
}

/**
 * Mutation hook for completing a goal milestone
 */
export function useCompleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, milestoneIndex }: { goalId: string; milestoneIndex: number }) =>
      performanceService.completeMilestone(goalId, milestoneIndex),
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.invalidateQueries({ queryKey: performanceKeys.goal(goalId) });
    },
  });
}

/**
 * Mutation hook for completing a development activity
 */
export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, activityIndex }: { planId: string; activityIndex: number }) =>
      performanceService.completeActivity(planId, activityIndex),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.developmentPlans() });
      queryClient.invalidateQueries({ queryKey: performanceKeys.developmentPlan(planId) });
    },
  });
}
