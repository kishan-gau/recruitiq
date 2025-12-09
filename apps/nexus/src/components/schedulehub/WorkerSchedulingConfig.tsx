import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@recruitiq/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar } from 'lucide-react';

interface WorkerSchedulingConfigProps {
  employeeId: string;
  employeeName: string;
  isOpen: boolean;
  onClose: () => void;
  existingConfig?: any;
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

export default function WorkerSchedulingConfig({
  employeeId,
  employeeName,
  isOpen,
  onClose,
  existingConfig,
}: WorkerSchedulingConfigProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>(
    existingConfig?.preferred_shift_types || []
  );
  const [selectedUnavailableDays, setSelectedUnavailableDays] = useState<string[]>(
    existingConfig?.unavailable_days || []
  );

  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SchedulingConfigForm>({
    defaultValues: {
      maxHoursPerWeek: existingConfig?.max_hours_per_week || 40,
      maxConsecutiveDays: existingConfig?.max_consecutive_days || 6,
      minHoursBetweenShifts: existingConfig?.min_hours_between_shifts || 12,
      preferredShiftTypes: existingConfig?.preferred_shift_types || [],
      unavailableDays: existingConfig?.unavailable_days || [],
      isSchedulable: existingConfig?.is_schedulable ?? true,
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
        employeeId,
        maxHoursPerWeek: data.maxHoursPerWeek,
        maxConsecutiveDays: data.maxConsecutiveDays,
        minHoursBetweenShifts: data.minHoursBetweenShifts,
        preferredShiftTypes: selectedShiftTypes,
        unavailableDays: selectedUnavailableDays,
        isSchedulable: data.isSchedulable,
        notes: data.notes || null,
      };

      if (existingConfig) {
        await schedulehubApi.workers.update(existingConfig.id, configData);
        toast.success('Scheduling configuration updated successfully');
      } else {
        await schedulehubApi.workers.create(configData);
        toast.success('Employee configured for scheduling successfully');
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'worker', employeeId] });

      onClose();
    } catch (error: any) {
      console.error('Error saving scheduling config:', error);
      toast.error(
        error.response?.data?.error || 'Failed to save scheduling configuration'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingConfig ? 'Update' : 'Configure'} Scheduling Settings
          </DialogTitle>
          <DialogDescription>
            Set scheduling preferences and constraints for {employeeName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Schedulable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="isSchedulable" className="text-base font-medium">
                Available for Scheduling
              </Label>
              <p className="text-sm text-gray-500">
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
                <h3 className="text-sm font-semibold text-gray-700">Work Hour Constraints</h3>

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
                    />
                    {errors.maxHoursPerWeek && (
                      <p className="text-sm text-red-500 mt-1">
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
                    />
                    {errors.maxConsecutiveDays && (
                      <p className="text-sm text-red-500 mt-1">
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
                    />
                    {errors.minHoursBetweenShifts && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.minHoursBetweenShifts.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferred Shift Types */}
              <div className="space-y-3">
                <Label>Preferred Shift Types (Optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {shiftTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => toggleShiftType(type.value)}
                      className={`
                        p-3 border-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          selectedShiftTypes.includes(type.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {type.label}
                    </button>
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
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleUnavailableDay(day.value)}
                      className={`
                        p-2 border-2 rounded text-sm font-medium transition-colors
                        ${
                          selectedUnavailableDays.includes(day.value)
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {day.label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <textarea
                  id="notes"
                  rows={3}
                  {...register('notes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special scheduling considerations or preferences..."
                />
              </div>
            </>
          )}

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
