import React, { useState } from 'react';
import { X, UserPlus, Trash2, AlertCircle, Users, Search } from 'lucide-react';
import { useWorkers } from '@/hooks/schedulehub/useScheduleStats';
import { useRoleWorkers, useAssignWorkerToRole, useUnassignRole } from '@/hooks/schedulehub/useRoles';
import { useDepartments } from '@/hooks/useDepartments';

interface AssignWorkersToRoleProps {
  roleId: string;
  roleName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignWorkersToRole: React.FC<AssignWorkersToRoleProps> = ({
  roleId,
  roleName,
  onClose,
  onSuccess,
}) => {
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');

  const { data: workersData, isLoading: workersLoading } = useWorkers();
  const { data: roleWorkersData, isLoading: roleWorkersLoading } = useRoleWorkers(roleId);
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
  const assignRole = useAssignWorkerToRole();
  const unassignRole = useUnassignRole();

  const allWorkers = workersData?.data || [];
  const assignedWorkers = roleWorkersData?.workers || [];
  
  // Helper function to get department name by ID
  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId || !departmentsData) return 'No department';
    const department = departmentsData.find(dept => dept.id === departmentId);
    return department?.departmentName || 'Unknown department';
  };

  // DEBUG: Log worker data being loaded
  console.log('DEBUG - Worker data loaded:', {
    workersData: workersData,
    allWorkers: allWorkers,
    allWorkersLength: allWorkers.length,
    workerIds: allWorkers.map((w: any) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` })),
    assignedWorkers: assignedWorkers,
    assignedWorkerIds: assignedWorkers.map((aw: any) => aw.id)
  });

  // Filter workers who are not already assigned to this role
  const availableWorkers = allWorkers.filter(
    (worker: any) => !assignedWorkers.some((aw: any) => aw.id === worker.id)
  );

  // Filter by search term
  const filteredWorkers = availableWorkers.filter((worker: any) =>
    `${worker.first_name} ${worker.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWorkerSelect = (workerId: string) => {
    // DEBUG: Log worker selection
    const worker = allWorkers.find((w: any) => w.id === workerId);
    console.log('DEBUG - Worker selected/deselected:', {
      workerId,
      worker,
      workerName: worker ? `${worker.first_name} ${worker.last_name}` : 'WORKER NOT FOUND',
      currentSelection: selectedWorkerIds
    });

    setSelectedWorkerIds(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssignWorkers = async () => {
    if (selectedWorkerIds.length === 0) {
      setError('Please select at least one worker to assign');
      return;
    }

    // DEBUG: Log what we're trying to assign
    console.log('DEBUG - Attempting to assign workers:', {
      roleId,
      selectedWorkerIds,
      allWorkersData: workersData,
      selectedWorkersDetails: selectedWorkerIds.map(id => 
        allWorkers.find((w: any) => w.id === id)
      )
    });

    try {
      // Assign each worker individually since mutation expects roleId and data
      for (const workerId of selectedWorkerIds) {
        console.log(`DEBUG - Assigning worker ${workerId} to role ${roleId}`);
        await assignRole.mutateAsync({
          roleId,
          data: { workerId },
        });
      }
      setSelectedWorkerIds([]);
      setError('');
      onSuccess();
    } catch (err: any) {
      console.error('DEBUG - Assignment failed:', err);
      setError(err.response?.data?.error || 'Failed to assign workers');
    }
  };

  const handleUnassignWorker = async (workerId: string, workerName: string) => {
    if (!confirm(`Are you sure you want to remove ${workerName} from this role?`)) {
      return;
    }

    try {
      await unassignRole.mutateAsync({
        roleId,
        workerId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove worker');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Workers to Role</h2>
            <p className="text-sm text-gray-600 mt-1">{roleName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Currently Assigned Workers */}
          <div className="w-1/2 border-r border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Assigned Workers ({assignedWorkers.length})
              </h3>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              {roleWorkersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : assignedWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No workers assigned</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {assignedWorkers.map((worker: any) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {worker.first_name} {worker.last_name}
                        </div>
                        {worker.employment_type && (
                          <div className="text-sm text-gray-500">{worker.employment_type}</div>
                        )}
                        {worker.primary_department_id && (
                          <div className="text-xs text-gray-400">Dept: {getDepartmentName(worker.primary_department_id)}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnassignWorker(worker.id, `${worker.first_name} ${worker.last_name}`)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Remove from role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Workers */}
          <div className="w-1/2">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Available Workers</h3>
              {/* Search */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search workers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              {workersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">
                    {searchTerm ? 'No workers found' : 'All workers are assigned'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredWorkers.map((worker: any) => (
                    <div
                      key={worker.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedWorkerIds.includes(worker.id)
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => handleWorkerSelect(worker.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {worker.first_name} {worker.last_name}
                        </div>
                        {worker.employment_type && (
                          <div className="text-sm text-gray-500">{worker.employment_type}</div>
                        )}
                        {worker.primary_department_id && (
                          <div className="text-xs text-gray-400">Dept: {getDepartmentName(worker.primary_department_id)}</div>
                        )}
                      </div>
                      {selectedWorkerIds.includes(worker.id) && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {selectedWorkerIds.length} worker{selectedWorkerIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignWorkers}
              disabled={selectedWorkerIds.length === 0 || assignRole.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {assignRole.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Workers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkersToRole;