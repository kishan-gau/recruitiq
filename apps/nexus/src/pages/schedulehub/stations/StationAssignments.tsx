import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@recruitiq/ui';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useStation, useStationAssignments, useAssignEmployee, useUnassignEmployee } from '@/hooks/schedulehub/useStations';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import type { EmployeeListItem } from '@/types/employee.types';

// Assignment type is inferred from the API response

const StationAssignments: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const toast = useToast();

  // Fetch station details
  const { data: station, isLoading: loadingStation, error: stationError } = useStation(id!);
  
  // Fetch station assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useStationAssignments(id!) as {
    data: Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      employeeNumber: string;
      assignedAt: string;
      assignedBy: string;
    }>;
    isLoading: boolean;
  };
  
  // Fetch all employees for assignment
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  // Assignment mutations
  const assignMutation = useAssignEmployee();
  const unassignMutation = useUnassignEmployee();

  // Filter out already assigned employees
  const availableEmployees = employees.filter(
    (emp: EmployeeListItem) => !assignments.some(a => a.employeeId === emp.id)
  );

  const handleAssign = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      const selectedEmployee = employees.find((emp: EmployeeListItem) => emp.id === selectedEmployeeId);
      if (!selectedEmployee) return;

      await assignMutation.mutateAsync({
        stationId: id!,
        employeeId: selectedEmployeeId,
        notes: notes || undefined
      });

      // Clear form state
      setSelectedEmployeeId('');
      setNotes('');
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign employee to station');
    }
  };

  const handleUnassign = async (assignmentId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to unassign ${employeeName} from this station?`)) {
      return;
    }

    try {
      await unassignMutation.mutateAsync({ 
        stationId: id!, 
        assignmentId 
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to unassign employee from station');
    }
  };

  const handleBack = () => {
    navigate(`/schedulehub/stations/${id}`);
  };

  if (loadingStation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (stationError || !station) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Station Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The station you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/schedulehub/stations')} variant="primary">
            Back to Stations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back to ScheduleHub */}
        <Link
          to="/schedulehub"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ScheduleHub
        </Link>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Station Assignments
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {station.stationName} ({station.stationCode})
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>{assignments.length} assigned employee{assignments.length !== 1 ? 's' : ''}</span>
            </div>
            
            {!isAdding && (
              <Button
                onClick={() => setIsAdding(true)}
                variant="primary"
                disabled={availableEmployees.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Employee
              </Button>
            )}
          </div>
        </div>

        {/* Add Assignment Form */}
        {isAdding && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Assign Employee to Station
            </h3>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingEmployees}
                >
                  <option value="">
                    {loadingEmployees ? 'Loading employees...' : 'Select an employee'}
                  </option>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>
              
              <Button
                onClick={handleAssign}
                variant="primary"
                disabled={!selectedEmployeeId || assignMutation.isPending}
                className="whitespace-nowrap"
              >
                {assignMutation.isPending ? (
                  <>
                    <LoadingSpinner />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Assign
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedEmployeeId('');
                }}
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Assigned Employees
            </h3>
          </div>
          
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No employees assigned
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This station doesn't have any assigned employees yet.
              </p>
              <Button
                onClick={() => setIsAdding(true)}
                variant="primary"
                disabled={availableEmployees.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign First Employee
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Assigned By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.employeeName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {assignment.employeeNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {assignment.assignedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          onClick={() => handleUnassign(assignment.id, assignment.employeeName)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          disabled={unassignMutation.isPending}
                        >
                          {unassignMutation.isPending ? (
                            <LoadingSpinner />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationAssignments;