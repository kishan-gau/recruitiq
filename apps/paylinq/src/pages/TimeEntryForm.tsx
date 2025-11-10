/**
 * Time Entry Form
 * 
 * Form for creating or editing time entries with:
 * - Date selection
 * - Clock in/out times
 * - Hours breakdown (regular, overtime, breaks)
 * - Entry type selection
 * - Shift type association
 */

import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, Save, X, ArrowLeft } from 'lucide-react';
import {
  useTimeEntry,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useShiftTypes,
} from '@/hooks/useTimesheets';
import type { CreateTimeEntryRequest, UpdateTimeEntryRequest, EntryType } from '@recruitiq/types';

interface TimeEntryFormData {
  employeeId: string;
  entryDate: string;
  clockIn?: string;
  clockOut?: string;
  workedHours: number;
  regularHours: number;
  overtimeHours: number;
  breakHours: number;
  shiftTypeId?: string;
  entryType: EntryType;
  notes?: string;
}

const ENTRY_TYPES: EntryType[] = ['regular', 'overtime', 'pto', 'sick', 'holiday', 'unpaid'];

export default function TimeEntryForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const timesheetId = searchParams.get('timesheetId');

  // Fetch data
  const { data: timeEntry, isLoading: isLoadingEntry } = useTimeEntry(id || '');
  const { data: shiftTypes = [] } = useShiftTypes();

  // Mutations
  const createTimeEntry = useCreateTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TimeEntryFormData>({
    defaultValues: {
      entryType: 'regular',
      workedHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      breakHours: 0,
    },
  });

  const watchClockIn = watch('clockIn');
  const watchClockOut = watch('clockOut');
  const watchWorkedHours = watch('workedHours');
  const watchBreakHours = watch('breakHours');

  // Load existing time entry data in edit mode
  useEffect(() => {
    if (timeEntry && isEditMode) {
      setValue('employeeId', timeEntry.employeeId);
      setValue('entryDate', timeEntry.entryDate);
      if (timeEntry.clockIn) setValue('clockIn', timeEntry.clockIn);
      if (timeEntry.clockOut) setValue('clockOut', timeEntry.clockOut);
      setValue('workedHours', timeEntry.workedHours);
      setValue('regularHours', timeEntry.regularHours);
      setValue('overtimeHours', timeEntry.overtimeHours);
      setValue('breakHours', timeEntry.breakHours);
      if (timeEntry.shiftTypeId) setValue('shiftTypeId', timeEntry.shiftTypeId);
      setValue('entryType', timeEntry.entryType);
      if (timeEntry.notes) setValue('notes', timeEntry.notes);
    }
  }, [timeEntry, isEditMode, setValue]);

  // Auto-calculate worked hours from clock in/out times
  useEffect(() => {
    if (watchClockIn && watchClockOut) {
      const clockInTime = new Date(watchClockIn);
      const clockOutTime = new Date(watchClockOut);
      
      if (clockOutTime > clockInTime) {
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const workedHours = Math.max(0, diffHours - watchBreakHours);
        setValue('workedHours', parseFloat(workedHours.toFixed(2)));
      }
    }
  }, [watchClockIn, watchClockOut, watchBreakHours, setValue]);

  // Auto-split worked hours into regular and overtime
  useEffect(() => {
    const regularThreshold = 8; // Standard 8-hour workday
    
    if (watchWorkedHours <= regularThreshold) {
      setValue('regularHours', watchWorkedHours);
      setValue('overtimeHours', 0);
    } else {
      setValue('regularHours', regularThreshold);
      setValue('overtimeHours', watchWorkedHours - regularThreshold);
    }
  }, [watchWorkedHours, setValue]);

  const onSubmit = async (data: TimeEntryFormData) => {
    if (isEditMode && id) {
      // Update existing entry
      const updateData: UpdateTimeEntryRequest = {
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        workedHours: data.workedHours,
        regularHours: data.regularHours,
        overtimeHours: data.overtimeHours,
        breakHours: data.breakHours,
        shiftTypeId: data.shiftTypeId,
        entryType: data.entryType,
        notes: data.notes,
      };

      updateTimeEntry.mutate(
        { id, data: updateData },
        {
          onSuccess: () => {
            if (timesheetId) {
              navigate(`/timesheets/${timesheetId}`);
            } else {
              navigate('/time-entries');
            }
          },
        }
      );
    } else {
      // Create new entry
      const createData: CreateTimeEntryRequest = {
        employeeId: data.employeeId,
        entryDate: data.entryDate,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        workedHours: data.workedHours,
        regularHours: data.regularHours,
        overtimeHours: data.overtimeHours,
        breakHours: data.breakHours,
        shiftTypeId: data.shiftTypeId,
        entryType: data.entryType,
        notes: data.notes,
      };

      createTimeEntry.mutate(createData, {
        onSuccess: () => {
          if (timesheetId) {
            navigate(`/timesheets/${timesheetId}`);
          } else {
            navigate('/time-entries');
          }
        },
      });
    }
  };

  const handleCancel = () => {
    if (timesheetId) {
      navigate(`/timesheets/${timesheetId}`);
    } else {
      navigate(-1);
    }
  };

  if (isEditMode && isLoadingEntry) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Time Entry' : 'Create Time Entry'}
        </h1>
        <p className="text-gray-600">
          {isEditMode ? 'Update the time entry details' : 'Add a new time entry to the timesheet'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Employee ID (only in create mode) */}
          {!isEditMode && (
            <div className="mb-6">
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('employeeId', { required: 'Employee ID is required' })}
                type="text"
                id="employeeId"
                placeholder="Enter employee ID"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.employeeId ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
              )}
            </div>
          )}

          {/* Entry Date */}
          <div className="mb-6">
            <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Entry Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('entryDate', { required: 'Entry date is required' })}
                type="date"
                id="entryDate"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.entryDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.entryDate && (
              <p className="mt-1 text-sm text-red-600">{errors.entryDate.message}</p>
            )}
          </div>

          {/* Clock In/Out Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="clockIn" className="block text-sm font-medium text-gray-700 mb-1">
                Clock In Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('clockIn')}
                  type="datetime-local"
                  id="clockIn"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clockOut" className="block text-sm font-medium text-gray-700 mb-1">
                Clock Out Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('clockOut')}
                  type="datetime-local"
                  id="clockOut"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Hours Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="workedHours" className="block text-sm font-medium text-gray-700 mb-1">
                Worked Hours <span className="text-red-500">*</span>
              </label>
              <input
                {...register('workedHours', {
                  required: 'Worked hours is required',
                  min: { value: 0, message: 'Hours must be positive' },
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                id="workedHours"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.workedHours ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.workedHours && (
                <p className="mt-1 text-sm text-red-600">{errors.workedHours.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Auto-calculated from clock times (excluding breaks)
              </p>
            </div>

            <div>
              <label htmlFor="breakHours" className="block text-sm font-medium text-gray-700 mb-1">
                Break Hours
              </label>
              <input
                {...register('breakHours', {
                  min: { value: 0, message: 'Hours must be positive' },
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                id="breakHours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="regularHours" className="block text-sm font-medium text-gray-700 mb-1">
                Regular Hours
              </label>
              <input
                {...register('regularHours', {
                  min: { value: 0, message: 'Hours must be positive' },
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                id="regularHours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-gray-500">Auto-split: up to 8 hours</p>
            </div>

            <div>
              <label htmlFor="overtimeHours" className="block text-sm font-medium text-gray-700 mb-1">
                Overtime Hours
              </label>
              <input
                {...register('overtimeHours', {
                  min: { value: 0, message: 'Hours must be positive' },
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                id="overtimeHours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-gray-500">Auto-split: hours over 8</p>
            </div>
          </div>

          {/* Shift Type */}
          <div className="mb-6">
            <label htmlFor="shiftTypeId" className="block text-sm font-medium text-gray-700 mb-1">
              Shift Type
            </label>
            <select
              {...register('shiftTypeId')}
              id="shiftTypeId"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">None</option>
              {shiftTypes.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shiftName} ({shift.startTime} - {shift.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Entry Type */}
          <div className="mb-6">
            <label htmlFor="entryType" className="block text-sm font-medium text-gray-700 mb-1">
              Entry Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('entryType', { required: 'Entry type is required' })}
              id="entryType"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.entryType ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
            {errors.entryType && (
              <p className="mt-1 text-sm text-red-600">{errors.entryType.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              placeholder="Add any additional notes or comments..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || createTimeEntry.isPending || updateTimeEntry.isPending}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting || createTimeEntry.isPending || updateTimeEntry.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update' : 'Create'} Time Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


