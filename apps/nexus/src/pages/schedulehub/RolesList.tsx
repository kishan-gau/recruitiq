import { useState } from 'react';
import { Briefcase, Plus, Edit, Trash2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { Role } from '@/types/schedulehub';

import ConfirmDialog from '@/components/ui/ConfirmDialog';

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

export default function RolesList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    colorCode: PRESET_COLORS[0].value,
    hourlyRate: '',
    requiresCertification: false,
    certificationTypes: [] as string[],
    skillLevel: 'entry',
    roleCode: '',
    isActive: true,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    roleId: string | null;
    roleName: string;
  }>({
    isOpen: false,
    roleId: null,
    roleName: '',
  });

  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: rolesData, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      console.log('🚀 Making API call to schedulehubApi.roles.list()...');
      try {
        const result = await schedulehubApi.roles.list();
        console.log('✅ API call successful:', result);
        console.log('🔍 API Response Structure:', {
          hasData: !!result?.data,
          hasRoles: !!result?.roles,
          dataLength: result?.data?.length,
          rolesLength: result?.roles?.length,
          fullStructure: Object.keys(result || {})
        });
        
        const rolesList = result?.roles || result?.data || [];
        console.log('🎪 Available roles for navigation:', {
          totalRoles: rolesList.length || 0,
          roles: rolesList.map((role: any) => ({
            id: role.id,
            name: role.name || role.roleName,
            description: role.description
          })) || []
        });
        return result;
      } catch (apiError) {
        console.error('❌ API call failed:', apiError);
        throw apiError;
      }
    },
  });

  // Extract roles from response data structure
  const roles = rolesData?.roles || [];

  // Enhanced debug logging
  console.log('🎯 Roles Query Debug:', {
    rolesData,
    isLoading,
    error,
    rolesLength: roles?.length,
    extractedRoles: roles,
    fullResponse: rolesData,
    dataField: rolesData?.data,
    rolesField: rolesData?.roles,
    hasError: !!error,
    errorMessage: error?.message
  });



  // Debug API configuration and authentication
  console.log('🌐 API Configuration Debug:', {
    expectedEndpoint: '/api/products/schedulehub/roles',
    method: 'GET',
    withCredentials: true,
    requiredPermission: 'scheduling:roles:read',
    baseURL: '/api/products/schedulehub'
  });

  // Log detailed error information if present
  if (error) {
    const axiosError = error as any; // Type assertion for axios error
    console.error('🔥 API Error Analysis:', {
      errorMessage: error.message,
      errorName: error.name,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      responseData: axiosError.response?.data,
      isAuthError: axiosError.response?.status === 401,
      isPermissionError: axiosError.response?.status === 403,
      isNotFoundError: axiosError.response?.status === 404,
      headers: axiosError.response?.headers,
      config: axiosError.config?.url
    });
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => schedulehubApi.roles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Shift role created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create shift role',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      schedulehubApi.roles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Shift role updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to update shift role',
      });
    },
  });

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        colorCode: role.color_code || PRESET_COLORS[0].value,
        // Add all available role fields to prevent incomplete updates
        hourlyRate: (role as any).hourly_rate || '',
        requiresCertification: (role as any).requires_certification || false,
        certificationTypes: (role as any).certification_types || [],
        skillLevel: (role as any).skill_level || 'entry',
        roleCode: (role as any).role_code || '',
        isActive: role.isActive !== undefined ? role.isActive : true,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        colorCode: PRESET_COLORS[0].value,
        hourlyRate: '',
        requiresCertification: false,
        certificationTypes: [],
        skillLevel: 'entry',
        roleCode: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      colorCode: PRESET_COLORS[0].value,
      hourlyRate: '',
      requiresCertification: false,
      certificationTypes: [],
      skillLevel: 'entry',
      roleCode: '',
      isActive: true,
    });
  };

  const handleRoleClick = (roleId: string) => {
    console.log('🎯 RolesList - Role clicked:', {
      roleId,
      availableRoles: rolesData?.data || rolesData?.roles || [],
      navigatingTo: `/schedulehub/roles/${roleId}`,
      timestamp: new Date().toISOString()
    });
    navigate(`/schedulehub/roles/${roleId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare complete data for API submission (convert camelCase to snake_case for backend)
    const submitData = {
      name: formData.name,
      description: formData.description || undefined,
      color_code: formData.colorCode,
      hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
      requires_certification: formData.requiresCertification,
      certification_types: formData.certificationTypes,
      skill_level: formData.skillLevel,
      role_code: formData.roleCode,
      is_active: formData.isActive,
    };

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleConfirmDeactivate = () => {
    if (confirmDialog.roleId) {
      updateMutation.mutate({
        id: confirmDialog.roleId,
        data: { isActive: false },
      });
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      roleId: null,
      roleName: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading shift roles"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading roles</div>
          <div className="text-sm text-slate-600">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        to="/schedulehub"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to ScheduleHub
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Shift Roles</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage shift roles and skill requirements for scheduling
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Shift Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role: Role) => (
          <div
            key={role.id}
            onClick={() => handleRoleClick(role.id)}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${role.color_code}20` }}
                >
                  <Briefcase
                    className="w-6 h-6"
                    style={{ color: role.color_code || '#3B82F6' }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {role.name}
                  </h3>
                  <div
                    className="mt-1 w-12 h-1 rounded-full"
                    style={{ backgroundColor: role.color_code || '#3B82F6' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>

            {role.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {role.description}
              </p>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(role);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({
                    isOpen: true,
                    roleId: role.id,
                    roleName: role.name,
                  });
                }}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No shift roles found</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first shift role
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingRole ? 'Edit Shift Role' : 'Add Shift Role'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Shift Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., Receptionist"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  placeholder="Role responsibilities and requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Code
                </label>
                <input
                  type="text"
                  value={formData.roleCode}
                  onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., REC, NURSE, TECH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  placeholder="25.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Skill Level
                </label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresCertification"
                  checked={formData.requiresCertification}
                  onChange={(e) => setFormData({ ...formData, requiresCertification: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                />
                <label htmlFor="requiresCertification" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Requires Certification
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Certification Types
                </label>
                <textarea
                  rows={2}
                  value={Array.isArray(formData.certificationTypes) ? formData.certificationTypes.join(', ') : ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    certificationTypes: e.target.value.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0)
                  })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., CPR, First Aid, Professional License"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Color Code
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, colorCode: color.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.colorCode === color.value
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.colorCode === color.value && (
                        <CheckCircle className="w-5 h-5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingRole
                    ? 'Update Role'
                    : 'Create Role'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Role"
        message={`Are you sure you want to deactivate the role "${confirmDialog.roleName}"? This action will make the role unavailable for assignment.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
