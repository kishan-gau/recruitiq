/**
 * Feedback Form Component
 * Form for creating performance feedback for employees
 */

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreateFeedback } from '../../hooks/useFeedback';
import type { FeedbackType, FeedbackVisibility } from '../../types/feedback.types';

const feedbackSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  reviewId: z.string().optional(),
  feedbackType: z.enum(['peer', 'manager', 'self', '360']),
  rating: z.number().min(1).max(5).optional(),
  comments: z.string().min(10, 'Comments must be at least 10 characters'),
  visibility: z.enum(['public', 'private', 'anonymous']),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  employeeId: string;
  reviewId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FeedbackForm({
  employeeId,
  reviewId,
  onSuccess,
  onCancel,
}: FeedbackFormProps) {
  const createFeedback = useCreateFeedback();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      employeeId,
      reviewId,
      feedbackType: 'peer',
      visibility: 'public',
    },
  });

  const feedbackType = watch('feedbackType');

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      await createFeedback.mutateAsync(data);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-700">
          Feedback Type *
        </label>
        <select
          {...register('feedbackType')}
          id="feedbackType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="peer">Peer Feedback</option>
          <option value="manager">Manager Feedback</option>
          <option value="self">Self Assessment</option>
          <option value="360">360° Feedback</option>
        </select>
        {errors.feedbackType && (
          <p className="mt-1 text-sm text-red-600">{errors.feedbackType.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">
          Visibility *
        </label>
        <select
          {...register('visibility')}
          id="visibility"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="public">Public</option>
          <option value="private">Private (Manager Only)</option>
          <option value="anonymous">Anonymous</option>
        </select>
        {errors.visibility && (
          <p className="mt-1 text-sm text-red-600">{errors.visibility.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {watch('visibility') === 'public' && 'Visible to employee and managers'}
          {watch('visibility') === 'private' && 'Only visible to managers'}
          {watch('visibility') === 'anonymous' && 'Your identity will be hidden'}
        </p>
      </div>

      {feedbackType !== 'self' && (
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
            Rating (Optional)
          </label>
          <div className="mt-1 flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="flex items-center">
                <input
                  type="radio"
                  {...register('rating', { valueAsNumber: true })}
                  value={value}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-1 text-sm text-gray-700">{value}</span>
              </label>
            ))}
          </div>
          {errors.rating && (
            <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">1 = Needs Improvement, 5 = Excellent</p>
        </div>
      )}

      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
          Comments *
        </label>
        <textarea
          {...register('comments')}
          id="comments"
          rows={6}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Provide detailed feedback about the employee's performance, strengths, and areas for improvement..."
        />
        {errors.comments && (
          <p className="mt-1 text-sm text-red-600">{errors.comments.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">Minimum 10 characters</p>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
}
