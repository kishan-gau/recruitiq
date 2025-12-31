import { X, Shield } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useCreateRole, useUpdateRole } from '@/hooks';
import { useDepartments } from '@/hooks';
import type { Department } from '@/types/department.types';

interface RoleFormProps {
  role?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({ role, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourlyRate: '',
    isActive: true,
    department: '',
    minHoursPerWeek: '',
    maxHoursPerWeek: '',
    overtimeRate: '',
    benefits: '',
    requirementsOrQualifications: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const { data: departments, isLoading: isDepartmentsLoading, error: departmentsError } = useDepartments();

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.role_name || role.name || '',
        description: role.description || '',
        hourlyRate: role.hourly_rate ? String(role.hourly_rate) : '',
        isActive: role.is_active !== undefined ? role.is_active : true,
        department: role.department || '',
        minHoursPerWeek: role.min_hours_per_week ? String(role.min_hours_per_week) : '',
        maxHoursPerWeek: role.max_hours_per_week ? String(role.max_hours_per_week) : '',
        overtimeRate: role.overtime_rate ? String(role.overtime_rate) : '',
        benefits: role.benefits || '',
        requirementsOrQualifications: role.requirements_or_qualifications || '',
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


  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    }

    if (formData.hourlyRate && (isNaN(parseFloat(formData.hourlyRate)) || parseFloat(formData.hourlyRate) < 0)) {
      newErrors.hourlyRate = 'Hourly rate must be a valid positive number';
    }

    // Validate hours per week
    const minHours = parseFloat(formData.minHoursPerWeek);
    const maxHours = parseFloat(formData.maxHoursPerWeek);

    if (formData.minHoursPerWeek && (isNaN(minHours) || minHours < 0)) {
      newErrors.minHoursPerWeek = 'Minimum hours must be a valid positive number';
    }

    if (formData.maxHoursPerWeek && (isNaN(maxHours) || maxHours < 0)) {
      newErrors.maxHoursPerWeek = 'Maximum hours must be a valid positive number';
    }

    if (formData.minHoursPerWeek && formData.maxHoursPerWeek && !isNaN(minHours) && !isNaN(maxHours)) {
      if (minHours > maxHours) {
        newErrors.maxHoursPerWeek = 'Maximum hours must be greater than or equal to minimum hours';
      }
      if (maxHours > 168) {
        newErrors.maxHoursPerWeek = 'Maximum hours cannot exceed 168 hours per week';
      }
    }

    // Validate overtime rate
    if (formData.overtimeRate && (isNaN(parseFloat(formData.overtimeRate)) || parseFloat(formData.overtimeRate) < 0)) {
      newErrors.overtimeRate = 'Overtime rate must be a valid positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      // Convert camelCase to snake_case for backend API
      const submitData = {
        role_name: formData.name,
        description: formData.description,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        is_active: formData.isActive,
        department: formData.department,
        min_hours_per_week: formData.minHoursPerWeek ? parseInt(formData.minHoursPerWeek) : null,
        max_hours_per_week: formData.maxHoursPerWeek ? parseInt(formData.maxHoursPerWeek) : null,
        overtime_rate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : null,
        benefits: formData.benefits,
        requirements_or_qualifications: formData.requirementsOrQualifications,
      };

      if (role) {
        await updateRoleMutation.mutateAsync({
          id: role.id,
          data: submitData,
        });
      } else {
        await createRoleMutation.mutateAsync(submitData);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };


  const isSubmitting = createRoleMutation.isPending || updateRoleMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {role ? 'Edit Role' : 'Create New Role'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {role ? 'Update role details' : 'Define a new role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* Role Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                  errors.name 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., Shift Manager"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Describe the role and its responsibilities"
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                disabled={isDepartmentsLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isDepartmentsLoading 
                    ? 'Loading departments...' 
                    : 'Select Department'
                  }
                </option>
                {departments && departments.length > 0 ? (
                  departments.filter((dept: Department) => dept.isActive).map((dept: Department) => (
                    <option key={dept.id} value={dept.departmentName}>
                      {dept.departmentName}
                    </option>
                  ))
                ) : (
                  departmentsError && (
                    <option value="" disabled>
                      Error loading departments
                    </option>
                  )
                )}
              </select>
              {departmentsError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Failed to load departments. Please try again.
                </p>
              )}
            </div>

            {/* Hours Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minHoursPerWeek" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Hours/Week
                </label>
                <input
                  type="number"
                  id="minHoursPerWeek"
                  name="minHoursPerWeek"
                  value={formData.minHoursPerWeek}
                  onChange={handleInputChange}
                  min="0"
                  max="168"
                  step="0.5"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.minHoursPerWeek 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0"
                />
                {errors.minHoursPerWeek && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minHoursPerWeek}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="maxHoursPerWeek" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Hours/Week
                </label>
                <input
                  type="number"
                  id="maxHoursPerWeek"
                  name="maxHoursPerWeek"
                  value={formData.maxHoursPerWeek}
                  onChange={handleInputChange}
                  min="0"
                  max="168"
                  step="0.5"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.maxHoursPerWeek 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="40"
                />
                {errors.maxHoursPerWeek && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maxHoursPerWeek}</p>
                )}
              </div>
            </div>

            {/* Overtime Rate */}
            <div>
              <label htmlFor="overtimeRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Overtime Rate (per hour)
              </label>
              <input
                type="number"
                id="overtimeRate"
                name="overtimeRate"
                value={formData.overtimeRate}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                  errors.overtimeRate 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="25.00"
              />
              {errors.overtimeRate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.overtimeRate}</p>
              )}
            </div>

            {/* Benefits */}
            <div>
              <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Benefits
              </label>
              <textarea
                id="benefits"
                name="benefits"
                value={formData.benefits}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Health insurance, vacation days, retirement plan, etc."
              />
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirementsOrQualifications" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requirements & Qualifications
              </label>
              <textarea
                id="requirementsOrQualifications"
                name="requirementsOrQualifications"
                value={formData.requirementsOrQualifications}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Required education, certifications, experience, skills, etc."
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
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Active (role can be assigned to workers)
              </label>
            </div>


          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
