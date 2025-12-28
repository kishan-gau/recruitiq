import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateAttendanceRecord } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@recruitiq/auth';

interface AttendanceManualEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AttendanceManualEntry({
  isOpen,
  onClose,
  onSuccess,
}: AttendanceManualEntryProps) {
  const { user } = useAuth();
  const { data: employeesData, isLoading: loadingEmployees } = useEmployees();
  const createRecord = useCreateAttendanceRecord();

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'present' as 'present' | 'absent' | 'late' | 'half-day',
    notes: '',
    reason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const employees = employeesData || [];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'Employee is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.checkInTime) {
      newErrors.checkInTime = 'Check-in time is required';
    }

    if (formData.checkOutTime && formData.checkInTime) {
      const checkIn = new Date(`${formData.date}T${formData.checkInTime}`);
      const checkOut = new Date(`${formData.date}T${formData.checkOutTime}`);
      if (checkOut <= checkIn) {
        newErrors.checkOutTime = 'Check-out must be after check-in';
      }
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason for manual entry is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await createRecord.mutateAsync({
        employeeId: formData.employeeId,
        date: formData.date,
        clockInTime: formData.checkInTime,
        clockOutTime: formData.checkOutTime || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        isManualEntry: true,
        manualEntryReason: formData.reason,
        createdBy: user?.id,
      });

      // Reset form
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        checkInTime: '',
        checkOutTime: '',
        status: 'present',
        notes: '',
        reason: '',
      });
      setErrors({});
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create manual attendance record:', error);
    }
  };

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Manual Attendance Entry
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employee *
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                errors.employeeId ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={loadingEmployees}
            >
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                </option>
              ))}
            </select>
            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-500">{errors.employeeId}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                errors.date ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Check-In Time *
              </label>
              <input
                type="time"
                value={formData.checkInTime}
                onChange={(e) => handleChange('checkInTime', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  errors.checkInTime ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.checkInTime && (
                <p className="mt-1 text-sm text-red-500">{errors.checkInTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Check-Out Time
              </label>
              <input
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => handleChange('checkOutTime', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  errors.checkOutTime ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.checkOutTime && (
                <p className="mt-1 text-sm text-red-500">{errors.checkOutTime}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>

          {/* Reason for Manual Entry */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Reason for Manual Entry *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              rows={3}
              placeholder="Explain why this entry is being created manually..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none ${
                errors.reason ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-500">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This will be logged for audit purposes
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
            />
          </div>

          {/* Permission Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Creating manual attendance entries requires the{' '}
              <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">
                attendance:approve
              </code>{' '}
              permission. This action will be logged for audit purposes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRecord.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createRecord.isPending ? 'Creating...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
