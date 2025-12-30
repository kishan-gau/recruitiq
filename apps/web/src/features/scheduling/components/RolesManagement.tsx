import { 
  Search, 
  Plus, 
  Users, 
  Settings, 
  Edit, 
  Trash2,
  CheckCircle, 
  XCircle,
  DollarSign,
  Award
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useErrorHandler } from '../../../shared/hooks/useErrorHandler';
import { useRoles, useDeleteRole, useDepartments } from '../hooks';
import type { Role } from '../types';

interface RolesManagementProps {
  onCreateRole?: () => void;
  onEditRole?: (role: Role) => void;
  onViewRole?: (roleId: string) => void;
  onAssignWorkers?: (roleId: string) => void;
}

const RolesManagement: React.FC<RolesManagementProps> = ({
  onCreateRole,
  onEditRole,
  onViewRole,
  onAssignWorkers
}) => {
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  // Data fetching
  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const { data: departments = [] } = useDepartments();
  const { mutate: deleteRole, isPending: isDeleting } = useDeleteRole({
    onSuccess: () => {
      setDeleteRoleId(null);
      refetch();
    },
    onError: (error) => {
      handleError(error);
      setDeleteRoleId(null);
    }
  });

  // Filtered roles
  const filteredRoles = useMemo(() => roles.filter((role) => {
      const matchesSearch = !searchTerm || 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = !selectedDepartment || role.departmentId === selectedDepartment;
      const matchesActive = !showActiveOnly || role.isActive;
      
      return matchesSearch && matchesDepartment && matchesActive;
    }), [roles, searchTerm, selectedDepartment, showActiveOnly]);

  // Event handlers
  const handleCreateRole = () => {
    if (onCreateRole) {
      onCreateRole();
    } else {
      navigate('/scheduling/roles/new');
    }
  };

  const handleEditRole = (role: Role) => {
    if (onEditRole) {
      onEditRole(role);
    } else {
      navigate(`/scheduling/roles/${role.id}/edit`);
    }
  };

  const handleViewRole = (roleId: string) => {
    if (onViewRole) {
      onViewRole(roleId);
    } else {
      navigate(`/scheduling/roles/${roleId}`);
    }
  };

  const handleAssignWorkers = (roleId: string) => {
    if (onAssignWorkers) {
      onAssignWorkers(roleId);
    } else {
      navigate(`/scheduling/roles/${roleId}/assign`);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    setDeleteRoleId(roleId);
  };

  const confirmDelete = () => {
    if (deleteRoleId) {
      deleteRole(deleteRoleId);
    }
  };

  const getRoleColor = (role: Role) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800',
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
      'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-800',
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-800'
    ];
    return colors[role.id.length % colors.length];
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'All Departments';
    const department = departments.find(dept => dept.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          Failed to load roles. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Role Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage worker roles, permissions, and assignments
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Roles
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by role name or description..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="show-active-only"
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="show-active-only" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show active only
            </label>
          </div>
        </div>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 transition-all hover:shadow-md ${getRoleColor(role)}`}
          >
            {/* Role Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1 truncate">
                  {role.name}
                </h3>
                <p className="text-sm opacity-75 truncate">
                  {getDepartmentName(role.departmentId)}
                </p>
              </div>
              <div className="flex items-center ml-2">
                {role.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Role Description */}
            {role.description && (
              <p className="text-sm opacity-75 mb-4 line-clamp-2">
                {role.description}
              </p>
            )}

            {/* Role Stats */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{role.workerCount || 0} workers</span>
              </div>
              {role.hourlyRate && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>${role.hourlyRate}/hr</span>
                </div>
              )}
            </div>

            {/* Certification Requirements */}
            {role.certificationRequired && (
              <div className="flex items-center text-sm mb-4">
                <Award className="h-4 w-4 mr-1" />
                <span>Certification Required</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-current border-opacity-20">
              <button
                onClick={() => handleViewRole(role.id)}
                className="text-sm font-medium hover:underline focus:outline-none"
              >
                View Details
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleAssignWorkers(role.id)}
                  className="p-1 rounded hover:bg-black hover:bg-opacity-10 focus:outline-none"
                  title="Assign Workers"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-1 rounded hover:bg-black hover:bg-opacity-10 focus:outline-none"
                  title="Edit Role"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="p-1 rounded hover:bg-red-600 hover:text-white focus:outline-none"
                  title="Delete Role"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No roles found
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {searchTerm || selectedDepartment || showActiveOnly
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by creating your first role.'}
          </p>
          {!searchTerm && !selectedDepartment && (
            <button
              onClick={handleCreateRole}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRoleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Confirm Delete Role
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this role? This action cannot be undone.
                All workers assigned to this role will be unassigned.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteRoleId(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesManagement;