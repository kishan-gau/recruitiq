import React, { useState } from 'react';
import { useRoles, useDeleteRole } from '@/hooks/schedulehub/useRoles';
import { Plus, Edit, Trash2, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RoleForm from './RoleForm';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  workerCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const RolesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: rolesData, isLoading, error } = useRoles();
  const deleteRoleMutation = useDeleteRole();

  const roles = rolesData?.roles || [];

  const handleCreateRole = () => {
    setShowCreateModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleViewDetails = (roleId: string) => {
    navigate(`/schedulehub/roles/${roleId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load roles. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage roles and their permissions</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first role</p>
          <button
            onClick={handleCreateRole}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role: Role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Role Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        role.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {role.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {role.description || 'No description provided'}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{role.workerCount || 0} workers</span>
                </div>
                <div className="text-gray-600">
                  {role.permissions?.length || 0} permissions
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDetails(role.id)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit role"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete role"
                  disabled={deleteRoleMutation.isPending}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <RoleForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <RoleForm
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
};

export default RolesManagement;
