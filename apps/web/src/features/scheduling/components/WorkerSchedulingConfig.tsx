import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Calendar } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Modal, Button, Input } from '@recruitiq/ui';

import { Label } from '@recruitiq/ui';
import { Switch } from '@recruitiq/ui';
import { useToast } from '@/hooks/useToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

import { workersService } from '../services';
import type { Worker, WorkerSchedulingConfig as WorkerConfig } from '../types';

interface WorkerSchedulingConfigProps {
  employeeId: string;
  employeeName: string;
  isOpen: boolean;
  onClose: () => void;
  existingConfig?: WorkerConfig;
}

interface SchedulingConfigForm {
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  minHoursBetweenShifts: number;
  preferredShiftTypes: string[];
  unavailableDays: string[];
  isSchedulable: boolean;
  notes?: string;
}

const WorkerSchedulingConfig: React.FC<WorkerSchedulingConfigProps> = ({
  employeeId,
  employeeName,
  isOpen,
  onClose,
  existingConfig,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>(
    existingConfig?.preferredShiftTypes || []
  );
  const [selectedUnavailableDays, setSelectedUnavailableDays] = useState<string[]>(
    existingConfig?.unavailableDays || []
  );

  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SchedulingConfigForm>({
    defaultValues: {
      maxHoursPerWeek: existingConfig?.maxHoursPerWeek || 40,
      maxConsecutiveDays: existingConfig?.maxConsecutiveDays || 6,
      minHoursBetweenShifts: existingConfig?.minHoursBetweenShifts || 12,
      preferredShiftTypes: existingConfig?.preferredShiftTypes || [],
      unavailableDays: existingConfig?.unavailableDays || [],
      isSchedulable: existingConfig?.isSchedulable ?? true,
      notes: existingConfig?.notes || '',
    },
  });

  const isSchedulable = watch('isSchedulable');

  const shiftTypes = [
    { value: 'morning', label: 'Morning (6am-2pm)' },
    { value: 'afternoon', label: 'Afternoon (2pm-10pm)' },
    { value: 'night', label: 'Night (10pm-6am)' },
    { value: 'split', label: 'Split Shift' },
  ];

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  const toggleShiftType = (shiftType: string) => {
    const updated = selectedShiftTypes.includes(shiftType)
      ? selectedShiftTypes.filter((t) => t !== shiftType)
      : [...selectedShiftTypes, shiftType];
    setSelectedShiftTypes(updated);
    setValue('preferredShiftTypes', updated);
  };

  const toggleUnavailableDay = (day: string) => {
    const updated = selectedUnavailableDays.includes(day)
      ? selectedUnavailableDays.filter((d) => d !== day)
      : [...selectedUnavailableDays, day];
    setSelectedUnavailableDays(updated);
    setValue('unavailableDays', updated);
  };

  const onSubmit = async (data: SchedulingConfigForm) => {
    try {
      setIsSubmitting(true);

      const configData = {
        maxHoursPerWeek: data.maxHoursPerWeek,
        maxConsecutiveDays: data.maxConsecutiveDays,
        minRestHoursBetweenShifts: data.minHoursBetweenShifts,
        preferredShiftTypes: selectedShiftTypes,
        unavailableDays: selectedUnavailableDays,
        isSchedulable: data.isSchedulable,
        notes: data.notes || null,
      };

      if (existingConfig) {
        // Update existing worker's scheduling configuration
        await workersService.updateWorker(employeeId, configData);
        toast.success('Scheduling configuration updated successfully');
      } else {
        // Create new configuration
        const createData = { ...configData, employeeId };
        await workersService.createWorker(createData);
        toast.success('Employee configured for scheduling successfully');
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'worker', employeeId] });

      onClose();
    } catch (error: any) {
      console.error('Error saving scheduling config:', error);
      handleError(error, 'Failed to save scheduling configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`${existingConfig ? 'Update' : 'Configure'} Scheduling Settings`}
      size="lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheduling-modal-title"
      aria-describedby="scheduling-modal-description"
    >
      <div className="max-h-[70vh] overflow-y-auto">
        <div className="mb-4">
          <h2 id="scheduling-modal-title" className="sr-only">
            {existingConfig ? 'Update' : 'Configure'} Scheduling Settings
          </h2>
          <p id="scheduling-modal-description" className="text-sm text-gray-600 dark:text-gray-400">
            Set scheduling preferences and constraints for {employeeName}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Schedulable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="isSchedulable" className="text-base font-medium">
                Available for Scheduling
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable to allow this employee to be assigned to shifts
              </p>
            </div>
            <Switch
              id="isSchedulable"
              checked={isSchedulable}
              onCheckedChange={(checked: boolean) => setValue('isSchedulable', checked)}
            />
          </div>

          {isSchedulable && (
            <>
              {/* Work Hour Constraints */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Work Hour Constraints</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxHoursPerWeek">
                      Max Hours/Week <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="maxHoursPerWeek"
                      type="number"
                      min={1}
                      max={168}
                      {...register('maxHoursPerWeek', {
                        required: 'Max hours per week is required',
                        min: { value: 1, message: 'Must be at least 1 hour' },
                        max: { value: 168, message: 'Cannot exceed 168 hours' },
                      })}
                      className={errors.maxHoursPerWeek ? 'border-red-500' : ''}
                      aria-required="true"
                      aria-invalid={errors.maxHoursPerWeek ? 'true' : 'false'}
                      aria-describedby={errors.maxHoursPerWeek ? 'maxHoursPerWeek-error' : undefined}
                    />
                    {errors.maxHoursPerWeek && (
                      <p 
                        id="maxHoursPerWeek-error" 
                        className="text-sm text-red-500 mt-1"
                        role="alert"
                      >
                        {errors.maxHoursPerWeek.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="maxConsecutiveDays">Max Consecutive Days</Label>
                    <Input
                      id="maxConsecutiveDays"
                      type="number"
                      min={1}
                      max={14}
                      {...register('maxConsecutiveDays', {
                        min: { value: 1, message: 'Must be at least 1 day' },
                        max: { value: 14, message: 'Cannot exceed 14 days' },
                      })}
                      className={errors.maxConsecutiveDays ? 'border-red-500' : ''}
                      aria-invalid={errors.maxConsecutiveDays ? 'true' : 'false'}
                      aria-describedby={errors.maxConsecutiveDays ? 'maxConsecutiveDays-error' : undefined}
                    />
                    {errors.maxConsecutiveDays && (
                      <p 
                        id="maxConsecutiveDays-error" 
                        className="text-sm text-red-500 mt-1"
                        role="alert"
                      >
                        {errors.maxConsecutiveDays.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="minHoursBetweenShifts">
                      Min Hours Between Shifts
                    </Label>
                    <Input
                      id="minHoursBetweenShifts"
                      type="number"
                      min={8}
                      max={48}
                      {...register('minHoursBetweenShifts', {
                        min: { value: 8, message: 'Must be at least 8 hours' },
                        max: { value: 48, message: 'Cannot exceed 48 hours' },
                      })}
                      className={errors.minHoursBetweenShifts ? 'border-red-500' : ''}
                      aria-invalid={errors.minHoursBetweenShifts ? 'true' : 'false'}
                      aria-describedby={errors.minHoursBetweenShifts ? 'minHoursBetweenShifts-error' : undefined}
                    />
                    {errors.minHoursBetweenShifts && (
                      <p 
                        id="minHoursBetweenShifts-error" 
                        className="text-sm text-red-500 mt-1"
                        role="alert"
                      >
                        {errors.minHoursBetweenShifts.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferred Shift Types */}
              <div className="space-y-3">
                <Label>Preferred Shift Types (Optional)</Label>
                <p id="shift-types-description" className="text-sm text-gray-600 dark:text-gray-400">
                  Select the shift types this employee prefers to work
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {shiftTypes.map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      onClick={() => toggleShiftType(type.value)}
                      variant={selectedShiftTypes.includes(type.value) ? 'primary' : 'outline'}
                      size="sm"
                      className="justify-start"
                      role="checkbox"
                      aria-checked={selectedShiftTypes.includes(type.value)}
                      aria-describedby="shift-types-description"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Unavailable Days */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Unavailable Days (Optional)
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      onClick={() => toggleUnavailableDay(day.value)}
                      variant={selectedUnavailableDays.includes(day.value) ? 'danger' : 'outline'}
                      size="sm"
                      className="justify-center"
                      role="checkbox"
                      aria-checked={selectedUnavailableDays.includes(day.value)}
                      aria-label={`Mark ${day.label} as unavailable`}
                    >
                      {day.label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <p id="notes-help" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Add any special scheduling considerations or preferences
                </p>
                <textarea
                  id="notes"
                  rows={3}
                  {...register('notes')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special scheduling considerations or preferences..."
                  aria-describedby="notes-help"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : existingConfig ? (
                'Update Configuration'
              ) : (
                'Configure for Scheduling'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default WorkerSchedulingConfig;