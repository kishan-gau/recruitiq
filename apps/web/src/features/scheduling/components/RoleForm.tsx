import { 
  X, 
  Save, 
  DollarSign, 
  Users, 
  Award, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useErrorHandler } from '../../../shared/hooks/useErrorHandler';
import { 
  useRole, 
  useCreateRole, 
  useUpdateRole, 
  useDepartments 
} from '../hooks';
import type { Role } from '../types';

interface RoleFormData {
  name: string;
  description: string;
  departmentId: string;
  hourlyRate: number | null;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  certificationRequired: boolean;
  certificationName: string;
  requirements: string;
  responsibilities: string;
  isActive: boolean;
}

interface RoleFormProps {
  role?: Role | null;
  onClose?: () => void;
  onSuccess?: (role: Role) => void;
  isModal?: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  role: initialRole,
  onClose,
  onSuccess,
  isModal = false
}) => {
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId: string }>();
  const { handleError } = useErrorHandler();

  // State
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    departmentId: '',
    hourlyRate: null,
    skillLevel: 'beginner',
    certificationRequired: false,
    certificationName: '',
    requirements: '',
    responsibilities: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Partial<RoleFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const isEdit = Boolean(initialRole || roleId);
  const { data: roleData } = useRole(roleId, { enabled: !initialRole && isEdit });
  const { data: departments = [] } = useDepartments();

  // Mutations
  const { mutate: createRole } = useCreateRole({
    onSuccess: (newRole) => {
      if (onSuccess) {
        onSuccess(newRole);
      } else {
        navigate('/scheduling/roles');
      }
    },
    onError: (error) => {
      handleError(error);
      setIsSubmitting(false);
    }
  });

  const { mutate: updateRole } = useUpdateRole({
    onSuccess: (updatedRole) => {
      if (onSuccess) {
        onSuccess(updatedRole);
      } else {
        navigate('/scheduling/roles');
      }
    },
    onError: (error) => {
      handleError(error);
      setIsSubmitting(false);
    }
  });

  // Initialize form data
  useEffect(() => {
    const roleToEdit = initialRole || roleData?.data;
    if (roleToEdit) {
      setFormData({
        name: roleToEdit.name || '',
        description: roleToEdit.description || '',
        departmentId: roleToEdit.departmentId || '',
        hourlyRate: roleToEdit.hourlyRate || null,
        skillLevel: roleToEdit.skillLevel || 'beginner',
        certificationRequired: roleToEdit.certificationRequired || false,
        certificationName: roleToEdit.certificationName || '',
        requirements: roleToEdit.requirements || '',
        responsibilities: roleToEdit.responsibilities || '',
        isActive: roleToEdit.isActive ?? true
      });
    }
  }, [initialRole, roleData]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<RoleFormData> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Role name cannot exceed 100 characters';
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (formData.hourlyRate !== null && (formData.hourlyRate < 0 || formData.hourlyRate > 1000)) {
      newErrors.hourlyRate = 'Hourly rate must be between $0 and $1000';
    }

    if (formData.certificationRequired && !formData.certificationName.trim()) {
      newErrors.certificationName = 'Certification name is required when certification is required';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    if (formData.requirements && formData.requirements.length > 1000) {
      newErrors.requirements = 'Requirements cannot exceed 1000 characters';
    }

    if (formData.responsibilities && formData.responsibilities.length > 1000) {
      newErrors.responsibilities = 'Responsibilities cannot exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Event handlers
  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const submitData = {
      ...formData,
      hourlyRate: formData.hourlyRate || undefined,
      certificationName: formData.certificationRequired ? formData.certificationName : undefined
    };

    try {
      if (isEdit) {
        const roleId = initialRole?.id || roleData?.data?.id;
        if (roleId) {
          updateRole({ id: roleId, data: submitData });
        }
      } else {
        createRole(submitData);
      }
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/scheduling/roles');
    }
  };

  const skillLevelOptions = [
    { value: 'beginner', label: 'Beginner', color: 'text-green-600' },
    { value: 'intermediate', label: 'Intermediate', color: 'text-yellow-600' },
    { value: 'advanced', label: 'Advanced', color: 'text-orange-600' },
    { value: 'expert', label: 'Expert', color: 'text-red-600' }
  ];

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(dept => dept.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  const formContent = (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Role' : 'Create New Role'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEdit ? 'Update role information and settings' : 'Define a new role for worker assignment'}
          </p>
        </div>
        {isModal && (
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter role name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.name.length}/100 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department *
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => handleInputChange('departmentId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.departmentId 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select a department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.departmentId}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.description 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Brief description of the role"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.description.length}/500 characters
            </p>
          </div>
        </div>

        {/* Compensation & Requirements */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Compensation & Requirements
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hourly Rate
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`pl-10 w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hourlyRate 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.hourlyRate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.hourlyRate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skill Level
              </label>
              <select
                value={formData.skillLevel}
                onChange={(e) => handleInputChange('skillLevel', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {skillLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Certification */}
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <input
                id="certification-required"
                type="checkbox"
                checked={formData.certificationRequired}
                onChange={(e) => handleInputChange('certificationRequired', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="certification-required" className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                <Award className="h-4 w-4 mr-1" />
                Certification Required
              </label>
            </div>
            
            {formData.certificationRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Certification Name *
                </label>
                <input
                  type="text"
                  value={formData.certificationName}
                  onChange={(e) => handleInputChange('certificationName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.certificationName 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter certification name"
                />
                {errors.certificationName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.certificationName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Detailed Information
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.requirements 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="List the requirements for this role..."
              />
              {errors.requirements && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.requirements}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.requirements.length}/1000 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Responsibilities
              </label>
              <textarea
                value={formData.responsibilities}
                onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.responsibilities 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Describe the responsibilities of this role..."
              />
              {errors.responsibilities && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.responsibilities}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.responsibilities.length}/1000 characters
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status
          </h3>
          
          <div className="flex items-center">
            <input
              id="is-active"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="is-active" className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Active Role
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Inactive roles cannot be assigned to workers and won't appear in scheduling options.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Role' : 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto mx-4">
          <div className="p-6">
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {formContent}
    </div>
  );
};

export default RoleForm;