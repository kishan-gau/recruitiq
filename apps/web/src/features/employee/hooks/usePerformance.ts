/**
 * React Query hooks for Performance feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService } from '../services';

/**
 * Hook to fetch current goals
 */
export const useCurrentGoals = (employeeId: string) => {
  return useQuery({
    queryKey: ['performance', 'goals', employeeId],
    queryFn: () => performanceService.getCurrentGoals(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch goal progress
 */
export const useGoalProgress = (employeeId: string, goalId: string) => {
  return useQuery({
    queryKey: ['performance', 'goal-progress', employeeId, goalId],
    queryFn: () => performanceService.getGoalProgress(employeeId, goalId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!employeeId && !!goalId,
  });
};

/**
 * Hook to fetch performance reviews
 */
export const useReviews = (employeeId: string) => {
  return useQuery({
    queryKey: ['performance', 'reviews', employeeId],
    queryFn: () => performanceService.getReviews(employeeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch feedback
 */
export const useFeedback = (employeeId: string) => {
  return useQuery({
    queryKey: ['performance', 'feedback', employeeId],
    queryFn: () => performanceService.getFeedback(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to acknowledge a goal
 */
export const useAcknowledgeGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId: string) => performanceService.acknowledgeGoal(goalId),
    onSuccess: (_, goalId) => {
      // Invalidate goal queries after acknowledgment
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goal-progress'] });
    },
  });
};

/**
 * Hook to update goal progress
 */
export const useUpdateGoalProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, progress, notes }: {
      goalId: string;
      progress: number;
      notes?: string;
    }) => performanceService.updateGoalProgress(goalId, progress, notes),
    onSuccess: (_, variables) => {
      // Invalidate goal queries after update
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'goal-progress', undefined, variables.goalId] });
    },
  });
};
