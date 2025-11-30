import React, { useState } from 'react';
import { Users, Plus, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEmployees } from '@/hooks/nexus/useEmployees';
import { useAssignStationMutation, useUnassignStationMutation } from '@/hooks/schedulehub/useStations';
import { useToast } from '@/contexts/ToastContext';

interface StationAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  assignedAt: string;
  assignedBy: string;
}

interface StationAssignmentsProps {
  stationId: string;
  assignments: StationAssignment[];
  onUpdate: () => void;
}

export const StationAssignments: React.FC<StationAssignmentsProps> = ({
  stationId,
  assignments,
  onUpdate,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const toast = useToast();

  // Fetch all employees for assignment
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  // Mutations
  const assignMutation = useAssignStationMutation();
  const unassignMutation = useUnassignStationMutation();

  // Filter out already assigned employees
  const availableEmployees = employees.filter(
    (emp) => !assignments.some((a) => a.employeeId === emp.id)
  );

  const handleAssign = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      await assignMutation.mutateAsync({
        stationId,
        employeeId: selectedEmployeeId,
      });
      toast.success('Employee assigned to station successfully');
      setIsAdding(false);
      setSelectedEmployeeId('');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign employee');
    }
  };

  const handleUnassign = async (assignmentId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to unassign ${employeeName}?`)) {
      return;
    }

    try {
      await unassignMutation.mutateAsync({
        stationId,
        assignmentId,
      });
      toast.success('Employee unassigned successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unassign employee');
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Assigned Employees
            </h2>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {assignments.length}
            </span>
          </div>
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              size="sm"
              variant="primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Assign Employee
            </Button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Add Assignment Form */}
        {isAdding && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingEmployees}
                >
                  <option value="">-- Select Employee --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                    </option>
                  ))}
                </select>
                {availableEmployees.length === 0 && !loadingEmployees && (
                  <p className="mt-2 text-sm text-gray-500">
                    No available employees to assign
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-7">
                <Button
                  onClick={handleAssign}
                  size="sm"
                  variant="primary"
                  disabled={!selectedEmployeeId || assignMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setSelectedEmployeeId('');
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No employees assigned to this station yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.employeeName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Employee #: {assignment.employeeNumber}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleUnassign(assignment.id, assignment.employeeName)}
                  size="sm"
                  variant="danger"
                  disabled={unassignMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Unassign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
