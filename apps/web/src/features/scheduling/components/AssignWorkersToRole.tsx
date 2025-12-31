import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Users, Check, X, Building2 } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import { Modal, Button, Input } from '@recruitiq/ui';

import { useDepartments, useWorkers, useRole, useAssignWorkerRoles, useUnassignRole } from '@/hooks';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/hooks/useToast';


import type { Worker, Role } from '../types';

interface AssignWorkersToRoleProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
}

const AssignWorkersToRole: React.FC<AssignWorkersToRoleProps> = ({
  role,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>('');

  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  // Data fetching
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const { data: roleData } = useRole(role.id);
  const assignedWorkers = roleData?.assignedWorkers || [];
  const { data: departments = [] } = useDepartments();
  const assignWorkerMutation = useAssignWorkerRoles();
  const unassignRoleMutation = useUnassignRole();

  console.log('AssignWorkersToRole - All workers:', allWorkers.length);
  console.log('AssignWorkersToRole - Assigned workers:', assignedWorkers.length);
  console.log('AssignWorkersToRole - Role:', role.name);

  // Create department lookup
  const departmentMap = useMemo(() => {
    const map = new Map();
    departments.forEach((dept) => {
      map.set(dept.id, dept.name);
    });
    return map;
  }, [departments]);

  // Get assigned worker IDs for filtering
  const assignedWorkerIds = useMemo(() => new Set(assignedWorkers.map((worker) => worker.id)), [assignedWorkers]);

  // Filter available workers (not already assigned to this role)
  const availableWorkers = useMemo(() => allWorkers.filter((worker) => !assignedWorkerIds.has(worker.id)), [allWorkers, assignedWorkerIds]);

  // Filter workers by search term
  const filteredAvailableWorkers = useMemo(() => {
    if (!searchTerm.trim()) return availableWorkers;

    const lowerSearch = searchTerm.toLowerCase();
    return availableWorkers.filter((worker) =>
      worker.name?.toLowerCase().includes(lowerSearch) ||
      worker.email?.toLowerCase().includes(lowerSearch) ||
      departmentMap.get(worker.departmentId)?.toLowerCase().includes(lowerSearch)
    );
  }, [availableWorkers, searchTerm, departmentMap]);

  const handleWorkerSelection = useCallback((workerId: string) => {
    console.log('AssignWorkersToRole - Selecting worker:', workerId);
    setSelectedWorkerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      console.log('AssignWorkersToRole - Selected workers:', Array.from(newSet));
      return newSet;
    });
  }, []);

  const handleBulkAssign = async () => {
    if (selectedWorkerIds.size === 0) {
      setErrorMessage('Please select at least one worker to assign');
      return;
    }

    try {
      setErrorMessage('');
      const workerIds = Array.from(selectedWorkerIds);
      
      console.log('AssignWorkersToRole - Bulk assigning workers:', workerIds);

      // Assign workers one by one (sequential approach)
      const results = [];
      for (const workerId of workerIds) {
        try {
          await assignWorkerMutation.mutateAsync({
            workerId,
            roleId: role.id,
          });
          results.push({ workerId, success: true });
        } catch (error) {
          console.error(`Failed to assign worker ${workerId}:`, error);
          results.push({ workerId, success: false, error });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'role', role.id, 'workers'] });

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} worker${successCount > 1 ? 's' : ''} to ${role.name}`);
      }

      if (failureCount > 0) {
        toast.error(`Failed to assign ${failureCount} worker${failureCount > 1 ? 's' : ''}`);
      }

      // Clear selection
      setSelectedWorkerIds(new Set());

    } catch (error: any) {
      console.error('Error in bulk assign:', error);
      handleError(error, 'Failed to assign workers to role');
    }
  };

  const handleUnassignWorker = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${workerName}" from the "${role.name}" role?`
    );

    if (!confirmed) return;

    try {
      await unassignRoleMutation.mutateAsync({
        workerId,
        roleId: role.id,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'role', role.id, 'workers'] });

      toast.success(`Removed ${workerName} from ${role.name} role`);
    } catch (error: any) {
      console.error('Error unassigning worker:', error);
      handleError(error, 'Failed to remove worker from role');
    }
  };

  const isLoading = workersLoading || roleWorkersLoading;
  const isAssigning = assignWorkerMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Workers to ${role.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Manage Role Assignment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Assign or remove workers from the {role.name} role
          </p>
          {role.description && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {role.description}
            </p>
          )}
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-96 min-h-80">
          {/* Left Panel - Assigned Workers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assigned Workers ({assignedWorkers.length})
              </h4>
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                {roleWorkersLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading assigned workers...</span>
                  </div>
                ) : assignedWorkers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <Users className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No workers assigned</p>
                    <p className="text-xs text-center">
                      Assign workers from the available list to get started
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {assignedWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {worker.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {worker.email}
                          </p>
                          {worker.departmentId && (
                            <div className="flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {departmentMap.get(worker.departmentId) || 'Unknown Department'}
                              </p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassignWorker(worker.id, worker.name)}
                          disabled={unassignRoleMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          aria-label={`Remove ${worker.name} from role`}
                        >
                          {unassignRoleMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Available Workers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available Workers ({filteredAvailableWorkers.length})
              </h4>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {workersLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading workers...</span>
                  </div>
                ) : filteredAvailableWorkers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <Users className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-sm font-medium">
                      {searchTerm ? 'No workers match your search' : 'No available workers'}
                    </p>
                    {searchTerm ? (
                      <p className="text-xs text-center">
                        Try adjusting your search terms
                      </p>
                    ) : (
                      <p className="text-xs text-center">
                        All workers have been assigned to this role
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredAvailableWorkers.map((worker) => {
                      const isSelected = selectedWorkerIds.has(worker.id);
                      return (
                        <div
                          key={worker.id}
                          className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => handleWorkerSelection(worker.id)}
                        >
                          <div className="flex items-center">
                            <div className={`
                              w-4 h-4 border-2 rounded flex items-center justify-center mr-3
                              ${isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-300 dark:border-gray-600'
                              }
                            `}>
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {worker.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {worker.email}
                              </p>
                              {worker.departmentId && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Building2 className="w-3 h-3 text-gray-400" />
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {departmentMap.get(worker.departmentId) || 'Unknown Department'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedWorkerIds.size > 0 && (
              <>
                {selectedWorkerIds.size} worker{selectedWorkerIds.size !== 1 ? 's' : ''} selected
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isAssigning}>
              Close
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={selectedWorkerIds.size === 0 || isAssigning || isLoading}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Assign {selectedWorkerIds.size > 0 ? `(${selectedWorkerIds.size})` : 'Workers'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AssignWorkersToRole;