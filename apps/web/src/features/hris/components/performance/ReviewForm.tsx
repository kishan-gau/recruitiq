/**
 * Performance Review Form Component
 * Reusable form for creating and editing performance reviews
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Award, Calendar, User, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { PerformanceReview, ReviewType, ReviewRating } from '@/types/performance.types';

const reviewFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  reviewerId: z.string().min(1, 'Reviewer is required'),
  reviewType: z.enum(['annual', 'mid-year', 'quarterly', 'probation', '360', 'project'], {
    required_error: 'Review type is required',
  }),
  reviewPeriodStart: z.string().min(1, 'Start date is required'),
  reviewPeriodEnd: z.string().min(1, 'End date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  overallRating: z.number().min(1).max(5).optional().nullable(),
  technicalSkillsRating: z.number().min(1).max(5).optional().nullable(),
  communicationRating: z.number().min(1).max(5).optional().nullable(),
  teamworkRating: z.number().min(1).max(5).optional().nullable(),
  leadershipRating: z.number().min(1).max(5).optional().nullable(),
  initiativeRating: z.number().min(1).max(5).optional().nullable(),
  achievements: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  areasForImprovement: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
  reviewerComments: z.string().optional().nullable(),
  employeeComments: z.string().optional().nullable(),
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  initialData?: PerformanceReview;
  onSubmit: (data: ReviewFormData) => void;
  isSubmitting?: boolean;
  employees: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  reviewers: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}

const REVIEW_TYPE_OPTIONS: Array<{ value: ReviewType; label: string }> = [
  { value: 'annual', label: 'Annual Review' },
  { value: 'mid-year', label: 'Mid-Year Review' },
  { value: 'quarterly', label: 'Quarterly Review' },
  { value: 'probation', label: 'Probation Review' },
  { value: '360', label: '360° Review' },
  { value: 'project', label: 'Project Review' },
];

const RATING_OPTIONS: Array<{ value: ReviewRating; label: string }> = [
  { value: 1, label: '1 - Needs Improvement' },
  { value: 2, label: '2 - Below Expectations' },
  { value: 3, label: '3 - Meets Expectations' },
  { value: 4, label: '4 - Exceeds Expectations' },
  { value: 5, label: '5 - Outstanding' },
];

export default function ReviewForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  employees,
  reviewers,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: initialData
      ? {
          employeeId: initialData.employeeId,
          reviewerId: initialData.reviewerId,
          reviewType: initialData.reviewType,
          reviewPeriodStart: initialData.reviewPeriodStart.split('T')[0],
          reviewPeriodEnd: initialData.reviewPeriodEnd.split('T')[0],
          dueDate: initialData.dueDate.split('T')[0],
          overallRating: initialData.overallRating,
          technicalSkillsRating: initialData.technicalSkillsRating,
          communicationRating: initialData.communicationRating,
          teamworkRating: initialData.teamworkRating,
          leadershipRating: initialData.leadershipRating,
          initiativeRating: initialData.initiativeRating,
          achievements: initialData.achievements,
          strengths: initialData.strengths,
          areasForImprovement: initialData.areasForImprovement,
          goals: initialData.goals,
          reviewerComments: initialData.reviewerComments,
          employeeComments: initialData.employeeComments,
        }
      : {
          overallRating: null,
          technicalSkillsRating: null,
          communicationRating: null,
          teamworkRating: null,
          leadershipRating: null,
          initiativeRating: null,
          achievements: null,
          strengths: null,
          areasForImprovement: null,
          goals: null,
          reviewerComments: null,
          employeeComments: null,
        },
  });

  const overallRating = watch('overallRating');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  id="employeeId"
                  {...register('_employeeId')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.email})
                    </option>
                  ))}
                </select>
              </div>
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employeeId.message}</p>
              )}
            </div>

            {/* Reviewer */}
            <div>
              <label htmlFor="reviewerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reviewer *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  id="reviewerId"
                  {...register('reviewerId')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select reviewer</option>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {reviewer.firstName} {reviewer.lastName} ({reviewer.email})
                    </option>
                  ))}
                </select>
              </div>
              {errors.reviewerId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewerId.message}</p>
              )}
            </div>

            {/* Review Type */}
            <div>
              <label htmlFor="reviewType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Review Type *
              </label>
              <select
                id="reviewType"
                {...register('reviewType')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Select type</option>
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

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  id="dueDate"
                  {...register('dueDate')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Review Period Start */}
            <div>
              <label htmlFor="reviewPeriodStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Review Period Start *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  id="reviewPeriodStart"
                  {...register('reviewPeriodStart')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              {errors.reviewPeriodStart && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewPeriodStart.message}</p>
              )}
            </div>

            {/* Review Period End */}
            <div>
              <label htmlFor="reviewPeriodEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Review Period End *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  id="reviewPeriodEnd"
                  {...register('reviewPeriodEnd')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              {errors.reviewPeriodEnd && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reviewPeriodEnd.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award size={20} />
            Performance Ratings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Overall Rating */}
            <div>
              <label htmlFor="overallRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Overall Rating
              </label>
              <select
                id="overallRating"
                {...register('overallRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {overallRating && (
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Award
                      key={star}
                      size={20}
                      className={star <= overallRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Technical Skills Rating */}
            <div>
              <label htmlFor="technicalSkillsRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Technical Skills
              </label>
              <select
                id="technicalSkillsRating"
                {...register('technicalSkillsRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Communication Rating */}
            <div>
              <label htmlFor="communicationRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Communication
              </label>
              <select
                id="communicationRating"
                {...register('communicationRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Teamwork Rating */}
            <div>
              <label htmlFor="teamworkRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teamwork
              </label>
              <select
                id="teamworkRating"
                {...register('teamworkRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Leadership Rating */}
            <div>
              <label htmlFor="leadershipRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Leadership
              </label>
              <select
                id="leadershipRating"
                {...register('leadershipRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Initiative Rating */}
            <div>
              <label htmlFor="initiativeRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initiative
              </label>
              <select
                id="initiativeRating"
                {...register('initiativeRating', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Not rated</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Feedback Sections */}
        <div className="space-y-4">
          {/* Achievements */}
          <div>
            <label htmlFor="achievements" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Achievements
            </label>
            <textarea
              id="achievements"
              {...register('achievements')}
              rows={3}
              placeholder="List key achievements during this review period..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Strengths */}
          <div>
            <label htmlFor="strengths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Strengths
            </label>
            <textarea
              id="strengths"
              {...register('strengths')}
              rows={3}
              placeholder="Describe the employee's strengths..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Areas for Improvement */}
          <div>
            <label htmlFor="areasForImprovement" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Areas for Improvement
            </label>
            <textarea
              id="areasForImprovement"
              {...register('areasForImprovement')}
              rows={3}
              placeholder="Identify areas where improvement is needed..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Future Goals */}
          <div>
            <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Future Goals
            </label>
            <textarea
              id="goals"
              {...register('goals')}
              rows={3}
              placeholder="Set goals for the next review period..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Reviewer Comments */}
          <div>
            <label htmlFor="reviewerComments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reviewer Comments
            </label>
            <textarea
              id="reviewerComments"
              {...register('reviewerComments')}
              rows={4}
              placeholder="Add any additional comments from the reviewer..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Employee Comments */}
          <div>
            <label htmlFor="employeeComments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee Comments
            </label>
            <textarea
              id="employeeComments"
              {...register('employeeComments')}
              rows={4}
              placeholder="Employee's response or self-assessment..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Review' : 'Create Review'}
        </button>
      </div>
    </form>
  );
}

