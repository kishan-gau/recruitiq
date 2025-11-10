/**
 * Performance React Query Hooks
 * Hooks for performance reviews and goals management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService } from '@/services/performance.service';
import type {
  CreatePerformanceReviewDTO,
  UpdatePerformanceReviewDTO,
  PerformanceReviewFilters,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalFilters,
} from '@/types/performance.types';
import { useToast } from '@/contexts/ToastContext';

// ============ Performance Review Hooks ============

/**
 * Hook to fetch all performance reviews with optional filters
 */
export function usePerformanceReviews(filters?: PerformanceReviewFilters) {
  return useQuery({
    queryKey: ['performance', 'reviews', filters],
    queryFn: () => performanceService.listReviews(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single performance review by ID
 */
export function usePerformanceReview(id: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'reviews', id],
    queryFn: () => performanceService.getReview(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch all reviews for a specific employee
 */
export function useEmployeeReviews(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'reviews', 'employee', employeeId],
    queryFn: () => performanceService.getEmployeeReviews(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch all reviews where user is the reviewer
 */
export function useReviewerReviews(reviewerId: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'reviews', 'reviewer', reviewerId],
    queryFn: () => performanceService.getReviewerReviews(reviewerId!),
    enabled: !!reviewerId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create a new performance review
 */
export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (review: CreatePerformanceReviewDTO) => performanceService.createReview(review),
    onSuccess: (newReview) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', 'employee', newReview.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', 'reviewer', newReview.reviewerId] });
      success('Performance review created successfully');
    },
    onError: (err: Error) => {
      error(`Failed to create performance review: ${err.message}`);
    },
  });
}

/**
 * Hook to update a performance review
 */
export function useUpdatePerformanceReview() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePerformanceReviewDTO }) =>
      performanceService.updateReview(id, updates),
    onSuccess: (updatedReview) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', updatedReview.id] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', 'employee', updatedReview.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', 'reviewer', updatedReview.reviewerId] });
      success('Performance review updated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to update performance review: ${err.message}`);
    },
  });
}

/**
 * Hook to delete a performance review
 */
export function useDeletePerformanceReview() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => performanceService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
      success('Performance review deleted successfully');
    },
    onError: (err: Error) => {
      error(`Failed to delete performance review: ${err.message}`);
    },
  });
}

/**
 * Hook to submit a review for completion
 */
export function useSubmitPerformanceReview() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => performanceService.submitReview(id),
    onSuccess: (updatedReview) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', updatedReview.id] });
      success('Performance review submitted successfully');
    },
    onError: (err: Error) => {
      error(`Failed to submit performance review: ${err.message}`);
    },
  });
}

/**
 * Hook to fetch review statistics
 */
export function useReviewStatistics() {
  return useQuery({
    queryKey: ['performance', 'reviews', 'statistics'],
    queryFn: () => performanceService.getReviewStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Goal Hooks ============

/**
 * Hook to fetch all goals with optional filters
 */
export function useGoals(filters?: GoalFilters) {
  return useQuery({
    queryKey: ['performance', 'goals', filters],
    queryFn: () => performanceService.listGoals(filters),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single goal by ID
 */
export function useGoal(id: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'goals', id],
    queryFn: () => performanceService.getGoal(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch all goals for a specific employee
 */
export function useEmployeeGoals(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'goals', 'employee', employeeId],
    queryFn: () => performanceService.getEmployeeGoals(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create a new goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (goal: CreateGoalDTO) => performanceService.createGoal(goal),
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', 'employee', newGoal.employeeId] });
      success('Goal created successfully');
    },
    onError: (err: Error) => {
      error(`Failed to create goal: ${err.message}`);
    },
  });
}

/**
 * Hook to update a goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateGoalDTO }) =>
      performanceService.updateGoal(id, updates),
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', updatedGoal.id] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', 'employee', updatedGoal.employeeId] });
      success('Goal updated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to update goal: ${err.message}`);
    },
  });
}

/**
 * Hook to delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => performanceService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      success('Goal deleted successfully');
    },
    onError: (err: Error) => {
      error(`Failed to delete goal: ${err.message}`);
    },
  });
}

/**
 * Hook to update goal progress
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      performanceService.updateGoalProgress(id, progress),
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', updatedGoal.id] });
      success('Goal progress updated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to update goal progress: ${err.message}`);
    },
  });
}

/**
 * Hook to complete a goal
 */
export function useCompleteGoal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => performanceService.completeGoal(id),
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', updatedGoal.id] });
      success('Goal completed successfully');
    },
    onError: (err: Error) => {
      error(`Failed to complete goal: ${err.message}`);
    },
  });
}

/**
 * Hook to fetch goal statistics
 */
export function useGoalStatistics() {
  return useQuery({
    queryKey: ['performance', 'goals', 'statistics'],
    queryFn: () => performanceService.getGoalStatistics(),
    staleTime: 5 * 60 * 1000,
  });
}
