/**
 * Performance Review Form Component
 * Reusable form for creating and editing performance reviews
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, User, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreatePerformanceReview, useUpdatePerformanceReview } from '@/hooks/usePerformance';
import { apiClient } from '@/services/api';
import type { PerformanceReview, ReviewType } from '@/types/performance.types';

const REVIEW_TYPE_OPTIONS: Array<{ value: ReviewType; label: string }> = [
  { value: 'annual', label: 'Annual Review' },
  { value: 'mid-year', label: 'Mid-Year Review' },
  { value: 'quarterly', label: 'Quarterly Review' },
  { value: 'probation', label: 'Probation Review' },
  { value: '360', label: '360-Degree Review' },
  { value: 'project', label: 'Project Review' },
];

const performanceReviewSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  reviewerId: z.string().min(1, 'Reviewer is required'),
  reviewType: z.enum(['annual', 'mid-year', 'quarterly', 'probation', '360', 'project']),
  reviewPeriodStart: z.string().min(1, 'Review period start date is required'),
  reviewPeriodEnd: z.string().min(1, 'Review period end date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
}).refine((data) => {
  const start = new Date(data.reviewPeriodStart);
  const end = new Date(data.reviewPeriodEnd);
  return end >= start;
}, {
  message: 'Review period end date must be after or equal to start date',
  path: ['reviewPeriodEnd'],
}).refine((data) => {
  const end = new Date(data.reviewPeriodEnd);
  const due = new Date(data.dueDate);
  return due >= end;
}, {
  message: 'Due date should be after review period end date',
  path: ['dueDate'],
});

type PerformanceReviewFormData = z.infer<typeof performanceReviewSchema>;

interface PerformanceReviewFormProps {
  review?: PerformanceReview;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  jobTitle?: string;
  departmentId?: string;
}

export default function PerformanceReviewForm({ review, onSuccess }: PerformanceReviewFormProps): React.ReactElement {
  const isEditMode = !!review;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const createMutation = useCreatePerformanceReview();
  const updateMutation = useUpdatePerformanceReview();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<PerformanceReviewFormData>({
    resolver: zodResolver(performanceReviewSchema),
    defaultValues: review
      ? {
          employeeId: review.employeeId,
          reviewerId: review.reviewerId,
          reviewType: review.reviewType,
          reviewPeriodStart: review.reviewPeriodStart.split('T')[0],
          reviewPeriodEnd: review.reviewPeriodEnd.split('T')[0],
          dueDate: review.dueDate.split('T')[0],
        }
      : {
          reviewType: 'annual',
        },
  });

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async (): Promise<void> => {
      try {
        const data = await apiClient.get<Employee[]>('/employees');
        setEmployees(data || []);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const onSubmit = async (data: PerformanceReviewFormData): Promise<void> => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: review.id,
          updates: data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save performance review:', error);
    }
  };

  const selectedEmployeeId = watch('employeeId');

  // Filter out selected employee from reviewer list
  const reviewerOptions = employees.filter((emp) => emp.id !== selectedEmployeeId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Employee & Reviewer Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Review Participants
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Selection */}
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employee Being Reviewed *
            </label>
            <select
              id="employeeId"
              {...register('employeeId')}
              disabled={loadingEmployees || isEditMode}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                  {emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
                </option>
              ))}
            </select>
            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employeeId.message}</p>
            )}
          </div>

          {/* Reviewer Selection */}
          <div>
            <label htmlFor="reviewerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reviewer *
            </label>
            <select
              id="reviewerId"
              {...register('reviewerId')}
              disabled={loadingEmployees}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              <option value="">Select a reviewer...</option>
              {reviewerOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                  {emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
                </option>
              ))}
            </select>
            {errors.reviewerId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewerId.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Review Details */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Review Details
        </h3>

        <div className="space-y-6">
          {/* Review Type */}
          <div>
            <label htmlFor="reviewType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Review Type <span className="text-red-500">*</span>
            </label>
            <select
              id="reviewType"
              {...register('reviewType')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {REVIEW_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reviewType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewType.message}</p>
            )}
          </div>

          {/* Review Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="reviewPeriodStart" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Review Period Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="reviewPeriodStart"
                {...register('reviewPeriodStart')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.reviewPeriodStart && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewPeriodStart.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="reviewPeriodEnd" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Review Period End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="reviewPeriodEnd"
                {...register('reviewPeriodEnd')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.reviewPeriodEnd && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewPeriodEnd.message}</p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="dueDate"
              {...register('dueDate')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The deadline for completing this review
            </p>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          <strong>Note:</strong> After creating the review, you can add detailed ratings, comments, and feedback on the review details page.
          This form creates the review structure and assigns the reviewer.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} className="mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save size={20} className="mr-2" />
          {isSubmitting ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{isEditMode ? 'Update Review' : 'Create Review'}</>
          )}
        </button>
      </div>
    </form>
  );
}
