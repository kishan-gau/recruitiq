/**
 * Manual Attendance Entry
 * Allows HR to manually record attendance for employees
 * 
 * Features:
 * - Record attendance for specific employees
 * - Set clock in/out times manually
 * - Add break times
 * - Set attendance status (present, absent, late, half-day, on-leave)
 * - Bulk entry for multiple employees
 * - Validation against existing records
 * - Notes and reason fields
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  Users,
  Save,
  X,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Search,
  Upload,
} from 'lucide-react';
import { useCreateAttendanceRecord } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import type { CreateAttendanceRecordDTO, AttendanceStatus } from '@/types/attendance.types';

interface AttendanceEntryForm {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  clockInTime: string;
  clockOutTime: string;
  breakDuration: number;
  notes: string;
  reason?: string;
}

const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'half-day', label: 'Half Day', color: 'bg-blue-100 text-blue-800' },
  { value: 'on-leave', label: 'On Leave', color: 'bg-purple-100 text-purple-800' },
];

const defaultEntry: AttendanceEntryForm = {
  employeeId: '',
  date: new Date().toISOString().split('T')[0],
  status: 'present',
  clockInTime: '09:00',
  clockOutTime: '17:00',
  breakDuration: 60,
  notes: '',
  reason: '',
};

export default function ManualAttendanceEntry() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate: createRecord, isPending } = useCreateAttendanceRecord();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const [entries, setEntries] = useState<AttendanceEntryForm[]>([{ ...defaultEntry }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(query) ||
      emp.lastName.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.employeeNumber?.toLowerCase().includes(query)
    );
  });

  const addEntry = () => {
    setEntries([...entries, { ...defaultEntry }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof AttendanceEntryForm, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const validateEntry = (entry: AttendanceEntryForm): string | null => {
    if (!entry.employeeId) {
      return 'Please select an employee';
    }
    if (!entry.date) {
      return 'Please select a date';
    }
    if (entry.status === 'present' || entry.status === 'late' || entry.status === 'half-day') {
      if (!entry.clockInTime) {
        return 'Clock in time is required';
      }
      if (!entry.clockOutTime) {
        return 'Clock out time is required';
      }
      // Validate clock out is after clock in
      const clockIn = new Date(`${entry.date}T${entry.clockInTime}`);
      const clockOut = new Date(`${entry.date}T${entry.clockOutTime}`);
      if (clockOut <= clockIn) {
        return 'Clock out time must be after clock in time';
      }
    }
    if (entry.status === 'absent' || entry.status === 'on-leave') {
      if (!entry.reason) {
        return 'Reason is required for absence or leave';
      }
    }
    return null;
  };

  const calculateHours = (entry: AttendanceEntryForm): number => {
    if (!entry.clockInTime || !entry.clockOutTime) return 0;
    
    const clockIn = new Date(`${entry.date}T${entry.clockInTime}`);
    const clockOut = new Date(`${entry.date}T${entry.clockOutTime}`);
    const diff = clockOut.getTime() - clockIn.getTime();
    const hours = diff / (1000 * 60 * 60);
    const breakHours = entry.breakDuration / 60;
    
    return Math.max(0, hours - breakHours);
  };

  const handleSubmit = async () => {
    // Validate all entries
    const errors: { index: number; error: string }[] = [];
    entries.forEach((entry, index) => {
      const error = validateEntry(entry);
      if (error) {
        errors.push({ index, error });
      }
    });

    if (errors.length > 0) {
      toast.error(`Validation failed: ${errors[0].error} (Entry ${errors[0].index + 1})`);
      return;
    }

    // Check for duplicate employee-date combinations
    const seen = new Set<string>();
    for (let i = 0; i < entries.length; i++) {
      const key = `${entries[i].employeeId}-${entries[i].date}`;
      if (seen.has(key)) {
        toast.error(`Duplicate entry for employee on ${entries[i].date} (Entry ${i + 1})`);
        return;
      }
      seen.add(key);
    }

    // Submit each entry
    let successfulCount = 0;
    const failedEntries: { index: number; error: string }[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      try {
        const payload: CreateAttendanceRecordDTO = {
          employeeId: entry.employeeId,
          date: entry.date,
          status: entry.status,
          clockInTime: entry.clockInTime ? `${entry.date}T${entry.clockInTime}:00` : undefined,
          clockOutTime: entry.clockOutTime ? `${entry.date}T${entry.clockOutTime}:00` : undefined,
          breakDuration: entry.breakDuration,
          totalHoursWorked: calculateHours(entry),
          notes: entry.notes || undefined,
          reason: entry.reason || undefined,
          isManualEntry: true,
        };

        await new Promise((resolve, reject) => {
          createRecord(payload, {
            onSuccess: resolve,
            onError: reject,
          });
        });

        successfulCount++;
      } catch (error: any) {
        failedEntries.push({
          index: i,
          error: error.message || 'Failed to create record',
        });
      }
    }

    if (failedEntries.length === 0) {
      setSuccessCount(successfulCount);
      setShowSuccessModal(true);
      toast.success(`Successfully created ${successfulCount} attendance record(s)`);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setEntries([{ ...defaultEntry }]);
        setShowSuccessModal(false);
      }, 2000);
    } else {
      toast.error(
        `Created ${successfulCount} records. Failed: ${failedEntries.length}. ${failedEntries[0].error}`
      );
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Attendance Entry</h1>
          <p className="text-gray-600 mt-1">
            Record attendance for employees manually. Use this for retroactive entries or corrections.
          </p>
        </div>
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Important Guidelines:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Use this feature to correct attendance records or add historical data</li>
            <li>Clock in/out times are required for Present, Late, and Half Day statuses</li>
            <li>Reason is required for Absent and On Leave statuses</li>
            <li>Duplicate entries for the same employee and date are not allowed</li>
            <li>All manual entries are logged with your user ID for audit purposes</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={addEntry}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
        >
          <Plus className="w-4 h-4" />
          Add Another Entry
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={isPending || entries.length === 0}
          className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : `Save ${entries.length} Record${entries.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Entry Forms */}
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Entry {index + 1}</h3>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Employee Selection */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={entry.employeeId}
                  onChange={(e) => updateEntry(index, 'employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingEmployees}
                >
                  <option value="">Select an employee</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber}) - {emp.department?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => updateEntry(index, 'date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={entry.status}
                  onChange={(e) => updateEntry(index, 'status', e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clock In Time */}
              {(entry.status === 'present' || entry.status === 'late' || entry.status === 'half-day') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock In Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={entry.clockInTime}
                    onChange={(e) => updateEntry(index, 'clockInTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Clock Out Time */}
              {(entry.status === 'present' || entry.status === 'late' || entry.status === 'half-day') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock Out Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={entry.clockOutTime}
                    onChange={(e) => updateEntry(index, 'clockOutTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Break Duration */}
              {(entry.status === 'present' || entry.status === 'late' || entry.status === 'half-day') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={entry.breakDuration}
                    onChange={(e) => updateEntry(index, 'breakDuration', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Reason (for absence/leave) */}
              {(entry.status === 'absent' || entry.status === 'on-leave') && (
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={entry.reason || ''}
                    onChange={(e) => updateEntry(index, 'reason', e.target.value)}
                    placeholder="e.g., Sick leave, Personal leave, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={entry.notes}
                  onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                  rows={2}
                  placeholder="Add any additional notes or context..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Hours Summary */}
            {(entry.status === 'present' || entry.status === 'late' || entry.status === 'half-day') &&
              entry.clockInTime &&
              entry.clockOutTime && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    Total Hours: <span className="font-semibold">{calculateHours(entry).toFixed(2)}h</span>
                    {entry.breakDuration > 0 && (
                      <span className="text-gray-500">
                        {' '}
                        (Break: {entry.breakDuration}min)
                      </span>
                    )}
                  </span>
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600 mb-6">
              Successfully created {successCount} attendance record{successCount > 1 ? 's' : ''}.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
