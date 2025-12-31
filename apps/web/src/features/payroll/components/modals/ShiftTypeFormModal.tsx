import { Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { ShiftType } from '@recruitiq/types';
import { handleFormError } from '@recruitiq/utils';

import Button from '@recruitiq/ui';
import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea, Select } from '@recruitiq/ui';
import { useToast } from '@/contexts/ToastContext';

interface ShiftTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void> | void;
  shiftType?: ShiftType | null;
}

export default function ShiftTypeFormModal({
  isOpen,
  onClose,
  onSubmit,
  shiftType,
}: ShiftTypeFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    shiftName: '',
    shiftCode: '',
    startTime: '',
    endTime: '',
    durationHours: '',
    isOvernight: false,
    breakDurationMinutes: '0',
    isPaidBreak: false,
    shiftDifferentialRate: '0',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  // Populate form when editing
  useEffect(() => {
    if (isOpen && shiftType) {
      setFormData({
        shiftName: shiftType.shiftName || '',
        shiftCode: shiftType.shiftCode || '',
        startTime: shiftType.startTime?.substring(0, 5) || '', // HH:MM:SS -> HH:MM
        endTime: shiftType.endTime?.substring(0, 5) || '',
        durationHours: shiftType.durationHours?.toString() || '',
        isOvernight: shiftType.isOvernight || false,
        breakDurationMinutes: shiftType.breakDurationMinutes?.toString() || '0',
        isPaidBreak: shiftType.isPaidBreak || false,
        shiftDifferentialRate: shiftType.shiftDifferentialRate?.toString() || '0',
        description: shiftType.description || '',
        status: shiftType.status || 'active',
      });
    } else if (isOpen) {
      // Reset form for new shift type
      setFormData({
        shiftName: '',
        shiftCode: '',
        startTime: '',
        endTime: '',
        durationHours: '',
        isOvernight: false,
        breakDurationMinutes: '0',
        isPaidBreak: false,
        shiftDifferentialRate: '0',
        description: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [isOpen, shiftType]);

  // Calculate duration when times change
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = formData.startTime.split(':').map(Number);
      const end = formData.endTime.split(':').map(Number);
      
      const startMinutes = start[0] * 60 + start[1];
      let endMinutes = end[0] * 60 + end[1];
      
      // Handle overnight shifts
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
        setFormData(prev => ({ ...prev, isOvernight: true }));
      }
      
      const durationMinutes = endMinutes - startMinutes;
      const durationHours = (durationMinutes / 60).toFixed(2);
      
      setFormData(prev => ({ ...prev, durationHours }));
    }
  }, [formData.startTime, formData.endTime]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.shiftName.trim()) {
      newErrors.shiftName = 'Shift name is required';
    }

    if (!formData.shiftCode.trim()) {
      newErrors.shiftCode = 'Shift code is required';
    } else if (formData.shiftCode.length > 20) {
      newErrors.shiftCode = 'Shift code must be 20 characters or less';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (!formData.durationHours) {
      newErrors.durationHours = 'Duration is required';
    } else if (parseFloat(formData.durationHours) <= 0) {
      newErrors.durationHours = 'Duration must be greater than 0';
    } else if (parseFloat(formData.durationHours) > 24) {
      newErrors.durationHours = 'Duration cannot exceed 24 hours';
    }

    const breakMinutes = parseInt(formData.breakDurationMinutes);
    if (isNaN(breakMinutes) || breakMinutes < 0) {
      newErrors.breakDurationMinutes = 'Break duration must be 0 or greater';
    }

    const differential = parseFloat(formData.shiftDifferentialRate);
    if (isNaN(differential) || differential < 0) {
      newErrors.shiftDifferentialRate = 'Shift differential must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        shiftName: formData.shiftName.trim(),
        shiftCode: formData.shiftCode.trim().toUpperCase(),
        startTime: formData.startTime + ':00', // Add seconds
        endTime: formData.endTime + ':00',
        durationHours: parseFloat(formData.durationHours),
        isOvernight: formData.isOvernight,
        breakDurationMinutes: parseInt(formData.breakDurationMinutes),
        isPaidBreak: formData.isPaidBreak,
        shiftDifferentialRate: parseFloat(formData.shiftDifferentialRate),
        description: formData.description.trim() || null,
        status: formData.status,
      };

      await onSubmit(submitData);
    } catch (err: any) {
      // Use centralized error handler for consistent field-specific error messages
      const fieldMapping = {
        'templateName': 'shiftName', // Backend uses templateName, frontend uses shiftName
      };
      
      handleFormError({
        error: err,
        setFieldErrors: (fieldErrors) => setErrors(prev => ({ ...prev, ...fieldErrors })),
        showToast: (message, type) => toast[type](message),
        fieldMap: fieldMapping,
        defaultMessage: 'Failed to save shift type',
      });
      
      console.error('Failed to submit shift type:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={shiftType ? 'Edit Shift Type' : 'Create Shift Type'}
      icon={Clock}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Shift Name"
            required
            error={errors.shiftName}
            hint="e.g., Day Shift, Night Shift"
          >
            <Input
              value={formData.shiftName}
              onChange={(e) => handleChange('shiftName', e.target.value)}
              placeholder="Enter shift name"
              maxLength={100}
            />
          </FormField>

          <FormField
            label="Shift Code"
            required
            error={errors.shiftCode}
            hint="Unique identifier (e.g., DAY, NIGHT)"
          >
            <Input
              value={formData.shiftCode}
              onChange={(e) => handleChange('shiftCode', e.target.value.toUpperCase())}
              placeholder="SHIFT_CODE"
              maxLength={20}
            />
          </FormField>
        </div>

        {/* Time Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Shift Schedule
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="Start Time"
              required
              error={errors.startTime}
            >
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </FormField>

            <FormField
              label="End Time"
              required
              error={errors.endTime}
            >
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </FormField>

            <FormField
              label="Duration (hours)"
              required
              error={errors.durationHours}
            >
              <Input
                type="number"
                step="0.01"
                value={formData.durationHours}
                onChange={(e) => handleChange('durationHours', e.target.value)}
                placeholder="8.00"
                readOnly
                className="bg-gray-50 dark:bg-gray-900"
              />
            </FormField>
          </div>

          {formData.isOvernight && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-700 dark:text-purple-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>This is an overnight shift that crosses midnight</span>
            </div>
          )}
        </div>

        {/* Break Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Break Configuration
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Break Duration (minutes)"
              error={errors.breakDurationMinutes}
            >
              <Input
                type="number"
                value={formData.breakDurationMinutes}
                onChange={(e) => handleChange('breakDurationMinutes', e.target.value)}
                placeholder="0"
                min="0"
              />
            </FormField>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPaidBreak}
                  onChange={(e) => handleChange('isPaidBreak', e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paid Break
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Shift Differential */}
        <FormField
          label="Shift Differential Rate (%)"
          error={errors.shiftDifferentialRate}
          hint="Additional pay percentage for this shift (e.g., 10 for 10% extra)"
        >
          <Input
            type="number"
            step="0.01"
            value={formData.shiftDifferentialRate}
            onChange={(e) => handleChange('shiftDifferentialRate', e.target.value)}
            placeholder="0.00"
            min="0"
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          hint="Optional notes about this shift type"
        >
          <TextArea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Add any additional notes or details..."
            rows={3}
            maxLength={500}
          />
        </FormField>

        {/* Status */}
        <FormField label="Status" required>
          <Select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            {shiftType ? 'Update Shift Type' : 'Create Shift Type'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
