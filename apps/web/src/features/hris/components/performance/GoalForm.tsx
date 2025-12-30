/**
 * Goal Form Component
 * Reusable form for creating and editing goals
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Target, Calendar, User, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Goal, GoalCategory, GoalPriority } from '@/types/performance.types';

const goalFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['performance', 'development', 'project', 'behavior', 'other'], {
    required_error: 'Category is required',
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    required_error: 'Priority is required',
  }),
  startDate: z.string().min(1, 'Start date is required'),
  targetDate: z.string().min(1, 'Target date is required'),
  progress: z.number().min(0).max(100),
  keyResults: z.string().optional().nullable(),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  initialData?: Goal;
  onSubmit: (data: GoalFormData) => void;
  isSubmitting?: boolean;
  employees: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}

const CATEGORY_OPTIONS: Array<{ value: GoalCategory; label: string }> = [
  { value: 'performance', label: 'Performance' },
  { value: 'development', label: 'Development' },
  { value: 'project', label: 'Project' },
  { value: 'behavior', label: 'Behavior' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: Array<{ value: GoalPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function GoalForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  employees,
}: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: initialData
      ? {
          employeeId: initialData.employeeId,
          title: initialData.title,
          description: initialData.description,
          category: initialData.category,
          priority: initialData.priority,
          startDate: initialData.startDate.split('T')[0],
          targetDate: initialData.targetDate.split('T')[0],
          progress: initialData.progress,
          keyResults: initialData.keyResults,
        }
      : {
          progress: 0,
          keyResults: null,
        },
  });

  const progress = watch('progress');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Basic Information
          </h3>

          <div className="space-y-4">
            {/* Employee */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  id="employeeId"
                  {...register('employeeId')}
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

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title')}
                placeholder="e.g., Improve technical skills in React"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                placeholder="Describe the goal in detail..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  {...register('category')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority *
                </label>
                <select
                  id="priority"
                  {...register('priority')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select priority</option>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.priority.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Progress */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Timeline & Progress
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  {...register('startDate')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>
                )}
              </div>

              {/* Target Date */}
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  id="targetDate"
                  {...register('targetDate')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                {errors.targetDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetDate.message}</p>
                )}
              </div>
            </div>

            {/* Progress */}
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress: {progress}%
              </label>
              <input
                type="range"
                id="progress"
                {...register('progress', { valueAsNumber: true })}
                min="0"
                max="100"
                step="5"
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              {/* Progress Bar Visualization */}
              <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Results */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target size={20} />
            Key Results
          </h3>

          <div>
            <label htmlFor="keyResults" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Results / Milestones
            </label>
            <textarea
              id="keyResults"
              {...register('keyResults')}
              rows={5}
              placeholder="List the key results or milestones for this goal (one per line)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              List measurable outcomes that will indicate success
            </p>
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
          {isSubmitting ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}

