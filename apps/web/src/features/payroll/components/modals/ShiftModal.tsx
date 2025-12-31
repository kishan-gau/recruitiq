import { useState, useEffect } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField, Input, Select } from '@recruitiq/ui';

import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks';
import { handleApiError } from '@/utils/errorHandler';
import { useShiftTypes } from '@/utils/hooks';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  date?: string;
  existingShift?: {
    id: string;
    startTime: string;
    endTime: string;
    shiftTypeId?: string;
  };
  onSuccess: () => void;
}

export default function ShiftModal({ isOpen, onClose, _employeeId, date, existingShift, onSuccess }: ShiftModalProps) {
  const { success, error } = useToast();
  const { paylinq } = usePaylinqAPI();
  const { data: shiftTypes = [], isLoading: loadingShiftTypes } = useShiftTypes({ status: 'active' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    startTime: existingShift?.startTime || '09:00',
    endTime: existingShift?.endTime || '17:00',
    shiftTypeId: existingShift?.shiftTypeId || '',
    notes: '',
  });

  // Update form when shift types load and no shift type is selected
  useEffect(() => {
    if (shiftTypes.length > 0 && !formData.shiftTypeId) {
      setFormData(prev => ({
        ...prev,
        shiftTypeId: shiftTypes[0].id
      }));
    }
  }, [shiftTypes, formData.shiftTypeId]);

  // Debug logging
  console.log('ShiftModal props:', { _employeeId, date, dateType: typeof date, dateValue: date });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields from parent component
    if (!_employeeId) {
      error('Employee must be selected to create a shift');
      return false;
    }
    if (!date) {
      error('Date must be selected to create a shift');
      return false;
    }

    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.shiftTypeId) newErrors.shiftTypeId = 'Shift type is required';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    // Check if shift is more than 12 hours
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (hours > 12) {
        newErrors.endTime = 'Shift cannot be longer than 12 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const scheduleData = {
        employeeId: employeeId,
        scheduleDate: date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        shiftTypeId: formData.shiftTypeId,
        breakMinutes: 0,
        notes: formData.notes,
        status: 'scheduled',
      };

      console.log('About to send schedule data:', JSON.stringify(scheduleData, null, 2));

      if (existingShift) {
        await paylinq.updateSchedule(existingShift.id, scheduleData);
      } else {
        await paylinq.createSchedule(scheduleData);
      }

      const action = existingShift ? 'updated' : 'added';
      success(`Shift ${action} successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle validation errors from API
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const apiErrors = err.response.data.errors;
        const fieldErrors: Record<string, string> = {};
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          name: 'Shift Name',
          startTime: 'Start Time',
          endTime: 'End Time',
          workDays: 'Work Days',
          color: 'Color',
          description: 'Description',
        };
        
        apiErrors.forEach((apiError: any) => {
          fieldErrors[apiError.field] = apiError.message;
        });
        
        setErrors(fieldErrors);
        
        // Show user-friendly error message with labels
        const errorMessages = apiErrors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        error(errorMessages || 'Please fix the validation errors');
      } else {
        console.error('Failed to save shift:', err);
        handleApiError(err, {
          toast,
          defaultMessage: `Failed to ${existingShift ? 'update' : 'add'} shift`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={existingShift ? 'Edit Shift' : 'Add Shift'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : existingShift ? 'Update Shift' : 'Add Shift'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {date && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
            Date: {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Time" required error={errors.startTime}>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              error={!!errors.startTime}
            />
          </FormField>

          <FormField label="End Time" required error={errors.endTime}>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              error={!!errors.endTime}
            />
          </FormField>
        </div>

        <FormField label="Shift Type" required error={errors.shiftTypeId}>
          <Select
            value={formData.shiftTypeId}
            onChange={(e) => handleChange('shiftTypeId', e.target.value)}
            disabled={loadingShiftTypes}
            options={
              loadingShiftTypes
                ? [{ value: '', label: 'Loading shift types...' }]
                : shiftTypes.length === 0
                ? [{ value: '', label: 'No shift types available' }]
                : shiftTypes.map((st: any) => ({
                    value: st.id,
                    label: `${st.shiftName} (${st.startTime} - ${st.endTime})`,
                  }))
            }
          />
          {shiftTypes.length === 0 && !loadingShiftTypes && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              No shift types found. Please create shift types in Settings first.
            </p>
          )}
        </FormField>

        <FormField label="Notes">
          <Input
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Optional notes..."
          />
        </FormField>

        {formData.startTime && formData.endTime && formData.startTime < formData.endTime && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Duration:{' '}
              {(() => {
                const start = new Date(`2000-01-01T${formData.startTime}`);
                const end = new Date(`2000-01-01T${formData.endTime}`);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return hours.toFixed(1);
              })()}{' '}
              hours
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
