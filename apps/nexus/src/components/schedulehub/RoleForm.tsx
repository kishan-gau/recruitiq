import React, { useState, useEffect } from 'react';
import { useCreateRole, useUpdateRole } from '@/hooks/schedulehub/useRoles';
import { X, Shield } from 'lucide-react';

interface RoleFormProps {
  role?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'view_shifts', label: 'View Shifts', category: 'Shifts' },
  { id: 'create_shifts', label: 'Create Shifts', category: 'Shifts' },
  { id: 'edit_shifts', label: 'Edit Shifts', category: 'Shifts' },
  { id: 'delete_shifts', label: 'Delete Shifts', category: 'Shifts' },
  { id: 'assign_shifts', label: 'Assign Shifts', category: 'Shifts' },
  
  { id: 'view_schedules', label: 'View Schedules', category: 'Schedules' },
  { id: 'create_schedules', label: 'Create Schedules', category: 'Schedules' },
  { id: 'edit_schedules', label: 'Edit Schedules', category: 'Schedules' },
  { id: 'publish_schedules', label: 'Publish Schedules', category: 'Schedules' },
  
  { id: 'approve_swaps', label: 'Approve Swap Requests', category: 'Swaps' },
  { id: 'request_swaps', label: 'Request Swaps', category: 'Swaps' },
  
  { id: 'view_workers', label: 'View Workers', category: 'Workers' },
  { id: 'manage_workers', label: 'Manage Workers', category: 'Workers' },
  
  { id: 'view_stations', label: 'View Stations', category: 'Stations' },
  { id: 'manage_stations', label: 'Manage Stations', category: 'Stations' },
  
  { id: 'view_reports', label: 'View Reports', category: 'Reports' },
  { id: 'export_reports', label: 'Export Reports', category: 'Reports' },
];

const RoleForm: React.FC<RoleFormProps> = ({ role, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || [],
        isActive: role.isActive ?? true,
      });
    }
  }, [role]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter((p) => p.category === category)
      .map((p) => p.id);
    
    const allSelected = categoryPermissions.every((p) =>
      formData.permissions.includes(p)
    );

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !categoryPermissions.includes(p)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])],
      }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (role) {
        await updateRoleMutation.mutateAsync({
          id: role.id,
          data: formData,
        });
      } else {
        await createRoleMutation.mutateAsync(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const isSubmitting = createRoleMutation.isPending || updateRoleMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {role ? 'Edit Role' : 'Create New Role'}
              </h2>
              <p className="text-sm text-gray-600">
                {role ? 'Update role details and permissions' : 'Define a new role with permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* Role Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Shift Manager"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the role and its responsibilities"
              />
            </div>

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active (role can be assigned to workers)
              </label>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions *
              </label>
              {errors.permissions && (
                <p className="mb-2 text-sm text-red-600">{errors.permissions}</p>
              )}
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, permissions]) => {
                  const categoryPermissionIds = permissions.map((p) => p.id);
                  const allSelected = categoryPermissionIds.every((id) =>
                    formData.permissions.includes(id)
                  );

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{category}</h4>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInCategory(category)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {permissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {permission.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleForm;
