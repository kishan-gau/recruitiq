import { useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus, AlertCircle, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';

import { Modal, Button, Select } from '@recruitiq/ui';

import { useToast } from '@/hooks/useToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

import { useRoles, useAssignRole, useUnassignRole } from '../hooks/useRoles';
import type { Worker, Role } from '../types';

interface WorkerRoleAssignmentProps {
  workerId: string;
  workerName: string;
  currentRoles: Role[];
  isOpen: boolean;
  onClose: () => void;
}

const WorkerRoleAssignment: React.FC<WorkerRoleAssignmentProps> = ({
  workerId,
  workerName,
  currentRoles,
  isOpen,
  onClose,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  const { data: allRoles = [], isLoading: rolesLoading } = useRoles();
  const assignRoleMutation = useAssignRole();
  const unassignRoleMutation = useUnassignRole();

  // Filter available roles (not already assigned)
  const currentRoleIds = currentRoles.map((role) => role.id);
  const availableRoles = allRoles.filter((role) => !currentRoleIds.includes(role.id));

  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      setErrorMessage('Please select a role to assign');
      return;
    }

    try {
      setErrorMessage('');
      await assignRoleMutation.mutateAsync({
        workerId,
        roleId: selectedRoleId,
      });

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });

      setSelectedRoleId('');
      toast.success('Role assigned successfully');
    } catch (error: any) {
      console.error('Error assigning role:', error);
      const message = error?.response?.data?.message || 'Failed to assign role';
      setErrorMessage(message);
      handleError(error, 'Failed to assign role');
    }
  };

  const handleUnassignRole = async (roleId: string, roleName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove the "${roleName}" role from ${workerName}?`
    );

    if (!confirmed) return;

    try {
      await unassignRoleMutation.mutateAsync({
        workerId,
        roleId,
      });

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'workers'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'roles'] });

      toast.success('Role removed successfully');
    } catch (error: any) {
      console.error('Error unassigning role:', error);
      handleError(error, 'Failed to remove role');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Roles for ${workerName}`}
      size="md"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Role Assignment
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage scheduling roles for {workerName}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Current Roles */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Roles
          </h4>

          {currentRoles.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
              <UserPlus className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No roles assigned
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Assign a role to give this worker scheduling permissions
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnassignRole(role.id, role.name)}
                    disabled={unassignRoleMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    aria-label={`Remove ${role.name} role`}
                  >
                    {unassignRoleMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign New Role */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assign New Role
          </h4>

          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                value={selectedRoleId}
                onValueChange={setSelectedRoleId}
                disabled={rolesLoading || availableRoles.length === 0}
              >
                <Select.Trigger>
                  <Select.Value 
                    placeholder={
                      rolesLoading 
                        ? 'Loading roles...'
                        : availableRoles.length === 0
                        ? 'No roles available'
                        : 'Select a role...'
                    }
                  />
                </Select.Trigger>
                <Select.Content>
                  {availableRoles.map((role) => (
                    <Select.Item key={role.id} value={role.id}>
                      <div>
                        <p className="font-medium">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-gray-500">{role.description}</p>
                        )}
                      </div>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <Button
              onClick={handleAssignRole}
              disabled={
                !selectedRoleId ||
                assignRoleMutation.isPending ||
                availableRoles.length === 0
              }
              className="shrink-0"
            >
              {assignRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </div>

          {availableRoles.length === 0 && !rolesLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All available roles have been assigned to this worker.
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Role Assignment Guidelines
          </h5>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Workers can have multiple roles with cumulative permissions</li>
            <li>• Role changes take effect immediately</li>
            <li>• Removing a role will revoke all associated permissions</li>
            <li>• Some roles may have prerequisites or restrictions</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WorkerRoleAssignment;