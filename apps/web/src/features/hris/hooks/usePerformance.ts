import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService } from '../services/performance.service';

const PERFORMANCE_QUERY_KEY = ['performance'];
const GOALS_QUERY_KEY = ['goals'];

/**
 * Hook to fetch performance reviews
 */
export function usePerformanceReviews(filters?: { search?: string; employeeId?: string; status?: string; year?: number }) {
  return useQuery({
    queryKey: [...PERFORMANCE_QUERY_KEY, filters],
    queryFn: () => performanceService.listPerformanceReviews(filters),
    enabled: true,
  });
}

/**
 * Hook to fetch a single performance review
 */
export function usePerformanceReview(reviewId?: string) {
  return useQuery({
    queryKey: [...PERFORMANCE_QUERY_KEY, reviewId],
    queryFn: () => performanceService.getPerformanceReview(reviewId!),
    enabled: !!reviewId,
  });
}

/**
 * Hook to fetch goals for an employee
 */
export function useGoals(employeeId?: string, filters?: any) {
  return useQuery({
    queryKey: [...GOALS_QUERY_KEY, employeeId, filters],
    queryFn: () => performanceService.listGoals(employeeId, filters),
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch performance statistics
 */
export function usePerformanceStatistics(employeeId?: string) {
  return useQuery({
    queryKey: [...PERFORMANCE_QUERY_KEY, 'statistics', employeeId],
    queryFn: () => performanceService.getPerformanceStatistics(employeeId!),
    enabled: !!employeeId,
  });
}

/**
 * Hook to create a performance review
 */
export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performanceService.createPerformanceReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a performance review
 */
export function useUpdatePerformanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: any }) =>
      performanceService.updatePerformanceReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a performance review
 */
export function useDeletePerformanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performanceService.deletePerformanceReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performanceService.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update goal progress
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, progress }: { goalId: string; progress: number }) =>
      performanceService.updateGoalProgress(goalId, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}
