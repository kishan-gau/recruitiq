import { X, User, Clock, MapPin, Badge, AlertTriangle, CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { formatTime, formatTimeSlot } from '@/utils';

import { useAssignShift } from '../../hooks/schedulehub/useScheduleStats';
import { apiClient } from '../../services/api';
import type { Shift, Worker } from '../../types/schedulehub';

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  onShiftUpdated?: (updatedShift: Shift) => void;
}

interface AvailableWorker extends Worker {
  availability?: {
    available: boolean;
    hours: number;
    priority: 'preferred' | 'available' | 'limited';
    reason?: string;
    conflictingShifts?: number;
  };
}

export default function ShiftAssignmentModal({ 
  isOpen, 
  onClose, 
  shift, 
  onShiftUpdated 
}: ShiftAssignmentModalProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(shift.assignedWorkerId || '');
  const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const assignShift = useAssignShift();

  // Load available workers when modal opens
  useEffect(() => {
    if (isOpen && shift) {
      loadAvailableWorkers();
    }
  }, [isOpen, shift]);

  const loadAvailableWorkers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const shiftDate = new Date(shift.startTime);
      const startTime = new Date(shift.startTime).toTimeString().slice(0, 5);
      const endTime = new Date(shift.endTime).toTimeString().slice(0, 5);
      
      // Direct API call to ScheduleHub available-workers endpoint
      const response = await apiClient.get('/api/products/schedulehub/available-workers', {
        params: {
          date: shiftDate.toISOString().split('T')[0],
          startTime,
          endTime,
          roleId: shift.roleId,
          stationId: shift.stationId
        }
      });

      setAvailableWorkers(response.data?.workers || []);
    } catch (err) {
      console.error('Failed to load available workers:', err);
      setError('Failed to load available workers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) {
      setError('Please select a worker to assign');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await assignShift.mutateAsync({
        shiftId: shift.id,
        workerId: selectedWorkerId
      });

      const updatedShift = {
        ...shift,
        assignedWorkerId: selectedWorkerId,
        worker: availableWorkers.find(w => w.id === selectedWorkerId)
      };

      onShiftUpdated?.(updatedShift);
      onClose();
    } catch (err) {
      console.error('Failed to assign worker:', err);
      setError('Failed to assign worker. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignWorker = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Assuming there's an unassign method
      await assignShift.mutateAsync({
        shiftId: shift.id,
        workerId: null
      });

      const updatedShift = {
        ...shift,
        assignedWorkerId: undefined,
        worker: undefined
      };

      onShiftUpdated?.(updatedShift);
      onClose();
    } catch (err) {
      console.error('Failed to unassign worker:', err);
      setError('Failed to unassign worker. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'preferred':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'available':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Assign Worker to Shift
            </h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTimeSlot(shift.startTime, shift.endTime)}
              </div>
              {shift.station && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {typeof shift.station === 'string' ? shift.station : shift.station.name}
                </div>
              )}
              {shift.role && (
                <div className="flex items-center">
                  <Badge className="h-4 w-4 mr-1" />
                  {typeof shift.role === 'string' ? shift.role : shift.role.name}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Currently Assigned Worker */}
          {shift.worker && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Currently Assigned
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {shift.worker.firstName} {shift.worker.lastName}
                  </span>
                </div>
                <button
                  onClick={handleUnassignWorker}
                  disabled={isLoading}
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          {selectedWorkerId && (
            <button
              onClick={handleAssignWorker}
              disabled={isLoading || !selectedWorkerId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Assigning...' : 'Assign Worker'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}