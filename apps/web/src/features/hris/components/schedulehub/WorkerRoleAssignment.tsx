import { X, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import { useRoles, useAssignRole, useUnassignRole } from '@/hooks/schedulehub/useRoles';

interface WorkerRoleAssignmentProps {
  workerId: string;
  workerName: string;
  currentRoles?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const WorkerRoleAssignment: React.FC<WorkerRoleAssignmentProps> = ({
  workerId,
  workerName,
  currentRoles = [],
  onClose,
  onSuccess,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const { data: rolesData, isLoading: rolesLoading } = useRoles({ isActive: true });
  const assignRole = useAssignRole();
  const unassignRole = useUnassignRole();

  const availableRoles = rolesData?.roles?.filter(
    (role: any) => !currentRoles.some((cr) => cr.id === role.id)
  ) || [];

  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      setError('Please select a role to assign');
      return;
    }

    try {
      await assignRole.mutateAsync({
        roleId: selectedRoleId,
        workerIds: [workerId],
      });
      setSelectedRoleId('');
      setError('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign role');
    }
  };

  const handleUnassignRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this role from the worker?')) {
      return;
    }

    try {
      await unassignRole.mutateAsync({
        roleId,
        workerId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove role');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Roles</h2>
            <p className="text-sm text-gray-600 mt-1">{workerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Current Roles */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Current Roles ({currentRoles.length})
            </h3>
            {currentRoles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No roles assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-blue-900">
                      {role.name}
                    </span>
                    <button
                      onClick={() => handleUnassignRole(role.id)}
                      disabled={unassignRole.isPending}
                      className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                      title="Remove role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign New Role */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Assign New Role
            </h3>
            {rolesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : availableRoles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">No more roles available to assign</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Role
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => {
                      setSelectedRoleId(e.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a role...</option>
                    {availableRoles.map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                        {role.description && ` - ${role.description}`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssignRole}
                  disabled={!selectedRoleId || assignRole.isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignRole.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign Role
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">About Role Assignments</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Workers can have multiple roles</li>
                  <li>Role permissions are cumulative</li>
                  <li>Changes take effect immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerRoleAssignment;
