import React from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { schedulehubApi } from '@/lib/api/schedulehub';

interface WorkerSchedulingConfigProps {
  employeeId: string;
  initialData?: {
    maxHoursPerWeek?: number;
    shiftPreferences?: string[];
    isSchedulable?: boolean;
  };
}

interface ConfigFormData {
  maxHoursPerWeek: number;
  shiftPreferences: string[];
  isSchedulable: boolean;
}

export default function WorkerSchedulingConfig({ 
  employeeId, 
  initialData 
}: WorkerSchedulingConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfigFormData>({
    defaultValues: {
      maxHoursPerWeek: initialData?.maxHoursPerWeek || 40,
      shiftPreferences: initialData?.shiftPreferences || [],
      isSchedulable: initialData?.isSchedulable ?? true,
    },
  });

  const onSubmit = async (data: ConfigFormData) => {
    setIsLoading(true);
    try {
      if (initialData) {
        // Update existing config
        await schedulehubApi.workers.update(employeeId, data);
        toast.success('Scheduling configuration updated successfully');
      } else {
        // Create new config
        await schedulehubApi.workers.create({
          employeeId,
          ...data,
        });
        toast.success('Scheduling configuration created successfully');
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', employeeId] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const shiftTypes = [
    { value: 'morning', label: 'Morning (6am-2pm)' },
    { value: 'afternoon', label: 'Afternoon (2pm-10pm)' },
    { value: 'evening', label: 'Evening (10pm-6am)' },
    { value: 'flexible', label: 'Flexible' },
  ];

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Scheduling Configuration
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure scheduling preferences and constraints for this employee
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Schedulable Toggle */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="isSchedulable"
              type="checkbox"
              {...register('isSchedulable')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="isSchedulable" className="font-medium text-gray-700">
              Available for Scheduling
            </label>
            <p className="text-sm text-gray-500">
              When disabled, this employee will not appear in shift assignment options
            </p>
          </div>
        </div>

        {/* Max Hours Per Week */}
        <div>
          <label htmlFor="maxHoursPerWeek" className="block text-sm font-medium text-gray-700">
            Maximum Hours Per Week
          </label>
          <div className="mt-1">
            <input
              id="maxHoursPerWeek"
              type="number"
              min="1"
              max="168"
              {...register('maxHoursPerWeek', {
                required: 'Maximum hours is required',
                min: { value: 1, message: 'Must be at least 1 hour' },
                max: { value: 168, message: 'Cannot exceed 168 hours per week' },
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {errors.maxHoursPerWeek && (
            <p className="mt-1 text-sm text-red-600">{errors.maxHoursPerWeek.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            System will prevent over-scheduling beyond this limit
          </p>
        </div>

        {/* Shift Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shift Preferences
          </label>
          <div className="space-y-2">
            {shiftTypes.map((shiftType) => (
              <div key={shiftType.value} className="flex items-center">
                <input
                  id={`shift-${shiftType.value}`}
                  type="checkbox"
                  value={shiftType.value}
                  {...register('shiftPreferences')}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`shift-${shiftType.value}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {shiftType.label}
                </label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Preferred shift times (optional - for optimization purposes)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
