/**
 * Roles & Permissions Management - Nexus HRIS
 * 
 * Tenant-level RBAC management for Nexus product.
 * Each tenant manages their own roles, permissions, and user assignments.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Edit, Trash2, Users, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  user_count: number;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export default function RolesPermissions() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['nexus-roles'],
    queryFn: async () => {
      const response = await apiClient.get('/api/products/nexus/rbac/roles');
      return response.data.roles || [];
    },
  });

  // Fetch permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['nexus-permissions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/products/nexus/rbac/permissions');
      return response.data.permissions || [];
    },
  });

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage user roles and permissions for your organization
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Organization-Level Access Control
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              System roles (like HR Manager, Employee Viewer) are pre-configured and cannot be deleted. 
              You can create custom roles or modify permissions for existing roles.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'permissions'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            Permissions ({permissions.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'roles' ? (
        <RolesTab
          roles={roles}
          permissions={permissions}
          isLoading={rolesLoading}
          onRoleSelect={setSelectedRole}
          selectedRole={selectedRole}
        />
      ) : (
        <PermissionsTab
          permissions={permissions}
          permissionsByCategory={permissionsByCategory}
          isLoading={permissionsLoading}
        />
      )}
    </div>
  );
}

interface RolesTabProps {
  roles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  onRoleSelect: (role: Role | null) => void;
  selectedRole: Role | null;
}

function RolesTab({ roles, permissions, isLoading, onRoleSelect, selectedRole }: RolesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/api/products/nexus/rbac/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nexus-roles'] });
      toast.success('Role created successfully');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create role',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/api/products/nexus/rbac/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nexus-roles'] });
      toast.success('Role updated successfully');
      setEditingRole(null);
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update role',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(`/api/products/nexus/rbac/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nexus-roles'] });
      toast.success('Role deleted successfully');
      onRoleSelect(null);
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete role',
      });
    },
  });

  const handleDelete = (role: Role) => {
    if (role.is_system) {
      toast.error('System roles cannot be deleted');
      return;
    }

    if (role.user_count > 0) {
      toast.error(`Cannot delete role with ${role.user_count} assigned users`);
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12">Loading roles...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Roles List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Roles</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => onRoleSelect(role)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedRole?.id === role.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {role.display_name}
                    </h3>
                    {role.is_system && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        System
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {role.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {role.user_count} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {role.permissions?.length || 0} permissions
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRole(role);
                    }}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!role.is_system && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(role);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Details */}
      <div>
        {selectedRole ? (
          <RoleDetails role={selectedRole} permissions={permissions} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <Shield className="w-12 h-12 mb-4" />
            <p>Select a role to view details</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isModalOpen || editingRole) && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRole(null);
          }}
          onSave={(data) => {
            if (editingRole) {
              updateMutation.mutate({ id: editingRole.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}

interface RoleDetailsProps {
  role: Role;
  permissions: Permission[];
}

function RoleDetails({ role, permissions }: RoleDetailsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const rolePermissionIds = new Set(role.permissions?.map(p => p.id) || []);
  
  const permissionsByCategory = role.permissions?.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {}) || {};

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {role.display_name}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {role.description}
          </p>
        </div>
        {role.is_system && (
          <span className="px-3 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            System Role
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Role Name</p>
            <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{role.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Users Assigned</p>
            <p className="text-sm text-slate-900 dark:text-white mt-1">{role.user_count}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Permissions ({role.permissions?.length || 0})
          </h3>
          <div className="space-y-2">
            {Object.keys(permissionsByCategory).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No permissions assigned</p>
            ) : (
              Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {category} ({perms.length})
                    </span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="p-3 space-y-2">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {permission.display_name}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RoleModalProps {
  role: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSave: (data: any) => void;
}

function RoleModal({ role, permissions, onClose, onSave }: RoleModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    display_name: role?.display_name || '',
    description: role?.description || '',
    permissionIds: role?.permissions?.map(p => p.id) || [],
    is_active: role?.is_active ?? true,
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const permissionsByCategory = permissions.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {role ? 'Edit Role' : 'Create New Role'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="hr_manager"
                  required
                  disabled={role?.is_system}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Unique identifier (lowercase, underscores only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="HR Manager"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  rows={3}
                  placeholder="Can manage employee records and time-off requests"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Permissions ({formData.permissionIds.length} selected)
              </h3>
              <div className="space-y-2">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {category} ({perms.length})
                      </span>
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="p-3 space-y-2">
                        {perms.map((permission) => (
                          <label key={permission.id} className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissionIds.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {permission.display_name}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {permission.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors"
            >
              {role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PermissionsTabProps {
  permissions: Permission[];
  permissionsByCategory: Record<string, Permission[]>;
  isLoading: boolean;
}

function PermissionsTab({ permissions: _permissions, permissionsByCategory, isLoading }: PermissionsTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(permissionsByCategory)));

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12">Loading permissions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          System Permissions
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          These permissions are pre-defined by the system and cannot be modified. Assign them to roles to control user access.
        </p>
      </div>

      {Object.entries(permissionsByCategory).map(([category, perms]) => (
        <div key={category} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {category}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {perms.length} permissions
                </p>
              </div>
            </div>
            {expandedCategories.has(category) ? (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {expandedCategories.has(category) && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
              {perms.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                >
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {permission.display_name}
                      </h4>
                      <code className="px-2 py-0.5 text-xs font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                        {permission.name}
                      </code>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
