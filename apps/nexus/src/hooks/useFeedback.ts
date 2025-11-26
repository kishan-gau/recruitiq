/**
 * Feedback Hooks
 * React Query hooks for performance feedback operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../services/feedback.service';
import { useToast } from '../contexts/ToastContext';
import { handleApiError } from '../utils/errorHandler';
import type { CreateFeedbackInput } from '../types/feedback.types';

/**
 * Hook to fetch feedback for an employee
 */
export function useEmployeeFeedback(employeeId: string) {
  return useQuery({
    queryKey: ['feedback', 'employee', employeeId],
    queryFn: () => feedbackService.getEmployeeFeedback(employeeId),
    enabled: !!employeeId,
  });
}

/**
 * Hook to create feedback
 */
export function useCreateFeedback() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateFeedbackInput) => feedbackService.createFeedback(data),
    onSuccess: (_, variables) => {
      toast.success('Feedback submitted successfully');
      // Invalidate employee feedback cache
      queryClient.invalidateQueries({ 
        queryKey: ['feedback', 'employee', variables.employeeId] 
      });
      // Invalidate review cache if feedback is for a review
      if (variables.reviewId) {
        queryClient.invalidateQueries({ 
          queryKey: ['reviews', variables.reviewId] 
        });
      }
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to submit feedback',
      });
    },
  });
}
