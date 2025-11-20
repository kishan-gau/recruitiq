import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Moon, Sun } from 'lucide-react';
import { useShiftTypes, useCreateShiftType, useUpdateShiftType, useDeleteShiftType } from '@/hooks/useTimesheets';
import Button from '@/components/ui/Button';
import ShiftTypeFormModal from '@/components/modals/ShiftTypeFormModal';
import { useToast } from '@/contexts/ToastContext';
import type { ShiftType, CreateShiftTypeRequest, UpdateShiftTypeRequest } from '@recruitiq/types';

export default function ShiftTypes() {
  const { success, error } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType | null>(null);

  // Fetch shift types
  const { data: shiftTypes = [], isLoading } = useShiftTypes({ limit: 100 });
  const createMutation = useCreateShiftType();
  const updateMutation = useUpdateShiftType();
  const deleteMutation = useDeleteShiftType();

  const handleCreate = () => {
    setSelectedShiftType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (shiftType: ShiftType) => {
    setSelectedShiftType(shiftType);
    setIsModalOpen(true);
  };

  const handleDelete = async (shiftType: ShiftType) => {
    if (!confirm(`Are you sure you want to delete shift type "${shiftType.shiftName}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(shiftType.id);
      success(`Shift type "${shiftType.shiftName}" deleted successfully`);
    } catch (err: any) {
      error(err.message || 'Failed to delete shift type');
    }
  };

  const handleSubmit = async (data: CreateShiftTypeRequest | UpdateShiftTypeRequest) => {
    try {
      if (selectedShiftType) {
        await updateMutation.mutateAsync({
          id: selectedShiftType.id,
          data: data as UpdateShiftTypeRequest,
        });
      } else {
        await createMutation.mutateAsync(data as CreateShiftTypeRequest);
      }
      setIsModalOpen(false);
      setSelectedShiftType(null);
    } catch (err: any) {
      error(err.message || `Failed to ${selectedShiftType ? 'update' : 'create'} shift type`);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getShiftIcon = (startTime: string) => {
    if (!startTime) return Clock;
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 6 && hour < 18) return Sun; // Day shift
    return Moon; // Night shift
  };

  const activeShiftTypes = shiftTypes.filter((st: ShiftType) => st.status === 'active');
  const inactiveShiftTypes = shiftTypes.filter((st: ShiftType) => st.status === 'inactive');

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shift Types</h1>
          <Button onClick={handleCreate} icon={Plus}>
            Create Shift Type
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Define shift schedules with differential pay rates
        </p>
      </div>

      {/* Active Shift Types */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Active Shift Types ({activeShiftTypes.length})
        </h2>

        {activeShiftTypes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No shift types yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first shift type to start tracking different work schedules
            </p>
            <Button onClick={handleCreate} icon={Plus}>
              Create Shift Type
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeShiftTypes.map((shiftType: ShiftType) => {
              const ShiftIcon = getShiftIcon(shiftType.startTime);
              return (
                <div
                  key={shiftType.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                        <ShiftIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {shiftType.shiftName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {shiftType.shiftCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(shiftType)}
                        className="p-1.5 text-gray-600 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shiftType)}
                        className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatTime(shiftType.startTime)} - {formatTime(shiftType.endTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {shiftType.durationHours} hours
                      </span>
                    </div>
                    {shiftType.isOvernight && (
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                        <Moon className="w-3.5 h-3.5" />
                        <span>Overnight Shift</span>
                      </div>
                    )}
                    {shiftType.shiftDifferentialRate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Differential:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          +{shiftType.shiftDifferentialRate}%
                        </span>
                      </div>
                    )}
                    {shiftType.breakDurationMinutes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Break:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {shiftType.breakDurationMinutes} min
                          {shiftType.isPaidBreak && (
                            <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                              (Paid)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {shiftType.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {shiftType.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive Shift Types */}
      {inactiveShiftTypes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Inactive Shift Types ({inactiveShiftTypes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveShiftTypes.map((shiftType: ShiftType) => {
              const ShiftIcon = getShiftIcon(shiftType.startTime);
              return (
                <div
                  key={shiftType.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 opacity-60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <ShiftIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {shiftType.shiftName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {shiftType.shiftCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(shiftType)}
                        className="p-1.5 text-gray-600 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatTime(shiftType.startTime)} - {formatTime(shiftType.endTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {shiftType.durationHours} hours
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <ShiftTypeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedShiftType(null);
        }}
        onSubmit={handleSubmit}
        shiftType={selectedShiftType}
      />
    </div>
  );
}
