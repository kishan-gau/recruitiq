/**
 * Time Off Request Form Component
 * Reusable form for creating and editing time-off requests
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Save, X } from 'lucide-react';
import { useCreateTimeOffRequest, useUpdateTimeOffRequest } from '@/hooks/useTimeOff';
import type { TimeOffRequest, TimeOffType } from '@/types/timeOff.types';
import { apiClient } from '@/services/api';

const TIME_OFF_TYPE_OPTIONS: Array<{ value: TimeOffType; label: string }> = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
];

const timeOffRequestSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  timeOffType: z.enum(['vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

type TimeOffRequestFormData = z.infer<typeof timeOffRequestSchema>;

interface TimeOffRequestFormProps {
  request?: TimeOffRequest;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  departmentId?: string;
}

export default function TimeOffRequestForm({ request, onSuccess }: TimeOffRequestFormProps) {
  const isEditMode = !!request;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const createMutation = useCreateTimeOffRequest();
  const updateMutation = useUpdateTimeOffRequest();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<TimeOffRequestFormData>({
    resolver: zodResolver(timeOffRequestSchema),
    defaultValues: request
      ? {
          employeeId: request.employeeId,
          timeOffType: request.timeOffType,
          startDate: request.startDate.split('T')[0],
          endDate: request.endDate.split('T')[0],
          reason: request.reason || '',
        }
      : {
          timeOffType: 'vacation',
        },
  });

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: Employee[] }>('/employees');
        setEmployees(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (error) {
        // Handle validation errors from API
        const apiError = error as any;
        if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
          const errors = apiError.response.data.errors;
          console.error('Validation errors:', errors);
        } else {
          console.error('Failed to fetch employees:', error);
        }
        setEmployees([]); // Set empty array on error
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Calculate days
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const onSubmit = async (data: TimeOffRequestFormData) => {
    try {
      if (isEditMode && request) {
        await updateMutation.mutateAsync({
          id: request.id,
          updates: {
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
          },
        });
      } else {
        await createMutation.mutateAsync({
          employeeId: data.employeeId,
          timeOffType: data.timeOffType,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
        });
      }
      onSuccess?.();
    } catch (error) {
      // Handle validation errors from API
      const apiError = error as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const errors = apiError.response.data.errors;
        console.error('Validation errors:', errors);
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          employeeId: 'Employee',
          startDate: 'Start Date',
          endDate: 'End Date',
          leaveType: 'Leave Type',
          reason: 'Reason',
          days: 'Number of Days',
        };
        
        // Show user-friendly error message
        alert(`Validation errors:\n${errors.map((e: any) => `• ${fieldLabels[e.field] || e.field}: ${e.message}`).join('\n')}`);
      } else {
        console.error('Failed to save time-off request:', error);
        alert(apiError.response?.data?.message || 'Failed to save time-off request. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          {isEditMode ? 'Edit Request' : 'New Time-Off Request'}
        </h2>

        <div className="space-y-6">
          {/* Employee Selector */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Employee <span className="text-red-500">*</span>
              </label>
              {loadingEmployees ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">Loading employees...</div>
              ) : (
                <select
                  {...register('employeeId')}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - #{employee.employeeNumber}
                    </option>
                  ))}
                </select>
              )}
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employeeId.message}</p>
              )}
            </div>
          )}

          {/* Time Off Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('timeOffType')}
              disabled={isEditMode}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
            >
              {TIME_OFF_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.timeOffType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.timeOffType.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Days Calculation */}
          {startDate && endDate && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Calendar size={20} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Total days requested: <span className="font-semibold">{calculateDays()}</span>
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Reason (Optional)
            </label>
            <textarea
              {...register('reason')}
              rows={4}
              placeholder="Enter reason for time-off request..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reason.message}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
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
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save size={20} className="mr-2" />
            {isSubmitting || createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditMode
              ? 'Update Request'
              : 'Submit Request'}
          </button>
        </div>
      </div>
    </form>
  );
}

