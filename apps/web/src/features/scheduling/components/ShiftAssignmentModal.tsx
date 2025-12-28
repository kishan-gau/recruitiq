/**
 * ShiftAssignmentModal Component
 * 
 * Modal for assigning workers to shifts with availability checking.
 * Features:
 * - Available worker loading with real-time availability checking
 * - Shift assignment/unassignment operations  
 * - Priority-based worker selection with conflict detection
 * - Role-based filtering and validation
 * - Current assignment display and management
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { X, User, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Shift, Worker, WorkerAvailability } from '../types';
import { useAssignShift, useUnassignShift } from '../hooks';
import { schedulingService } from '../services';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface WorkerWithAvailability extends Worker {
  availability?: WorkerAvailability & {
    priority: 'high' | 'medium' | 'low';
    available: boolean;
    hours: number;
    conflictingShifts?: number;
    reason?: string;
  };
}

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  onAssignmentChange?: () => void;
}

export function ShiftAssignmentModal({ 
  isOpen, 
  onClose, 
  shift, 
  onAssignmentChange 
}: ShiftAssignmentModalProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [availableWorkers, setAvailableWorkers] = useState<WorkerWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleError = useErrorHandler();
  const { mutateAsync: assignShift, isPending: isAssigning } = useAssignShift();
  const { mutateAsync: unassignShift, isPending: isUnassigning } = useUnassignShift();

  const isModalLoading = isLoading || isAssigning || isUnassigning;

  /**
   * Load available workers for the shift time period
   */
  const loadAvailableWorkers = async () => {
    if (!shift.id || !shift.startTime || !shift.endTime) return;

    setIsLoading(true);
    try {
      const workers = await schedulingService.getAvailableWorkers({
        shiftId: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        stationId: shift.stationId,
        requiredRoles: shift.requiredRoles || []
      });

      setAvailableWorkers(workers);
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to load available workers',
      });
      setAvailableWorkers([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle assigning selected worker to shift
   */
  const handleAssignWorker = async () => {
    if (!selectedWorkerId || !shift.id) return;

    try {
      await assignShift({
        shiftId: shift.id,
        workerId: selectedWorkerId
      });
      
      onAssignmentChange?.();
      onClose();
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to assign worker to shift',
      });
    }
  };

  /**
   * Handle unassigning current worker from shift
   */
  const handleUnassignWorker = async () => {
    if (!shift.id || !shift.worker?.id) return;

    try {
      await unassignShift({
        shiftId: shift.id,
        workerId: shift.worker.id
      });
      
      onAssignmentChange?.();
      onClose();
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to unassign worker from shift',
      });
    }
  };

  /**
   * Get priority badge styling
   */
  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const badges = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return badges[priority] || badges.medium;
  };

  /**
   * Format shift time for display
   */
  const formatShiftTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Load available workers when modal opens or shift changes
  useEffect(() => {
    if (isOpen && shift.id) {
      loadAvailableWorkers();
      setSelectedWorkerId(''); // Reset selection
    }
  }, [isOpen, shift.id, shift.startTime, shift.endTime]);

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Assign Worker to Shift
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {shift.station?.name} • {shift.startTime && shift.endTime && formatShiftTime(shift.startTime, shift.endTime)}
                {shift.date && (
                  <span className="ml-2">
                    {new Date(shift.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isModalLoading}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Current Assignment */}
            {shift.worker && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Currently Assigned
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {shift.worker.firstName} {shift.worker.lastName}
                    </span>
                  </div>
                  <button
                    onClick={handleUnassignWorker}
                    disabled={isModalLoading}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    Unassign
                  </button>
                </div>
              </div>
            )}

            {/* Available Workers */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Available Workers
                {availableWorkers.length > 0 && (
                  <span className="ml-2 text-gray-500">({availableWorkers.length})</span>
                )}
              </h3>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading available workers...</p>
                </div>
              ) : availableWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No workers available for this shift time
                  </p>
                  <button
                    onClick={loadAvailableWorkers}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Refresh availability
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableWorkers.map((worker) => (
                    <label
                      key={worker.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedWorkerId === worker.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="worker"
                        value={worker.id}
                        checked={selectedWorkerId === worker.id}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {worker.firstName} {worker.lastName}
                            </span>
                          </div>
                          {worker.availability && (
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                getPriorityBadge(worker.availability.priority)
                              }`}>
                                {worker.availability.priority}
                              </span>
                              {worker.availability.available && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          )}
                        </div>
                        {worker.availability && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {worker.availability.hours}h available
                            {worker.availability.conflictingShifts && worker.availability.conflictingShifts > 0 && (
                              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                                • {worker.availability.conflictingShifts} conflicting shift(s)
                              </span>
                            )}
                            {worker.availability.reason && (
                              <span className="ml-2">• {worker.availability.reason}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={onClose}
              disabled={isModalLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            {selectedWorkerId && (
              <button
                onClick={handleAssignWorker}
                disabled={isModalLoading || !selectedWorkerId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isAssigning ? 'Assigning...' : 'Assign Worker'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftAssignmentModal;