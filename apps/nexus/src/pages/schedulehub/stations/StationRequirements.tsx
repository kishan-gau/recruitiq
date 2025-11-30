/**
 * Station Requirements Management Component
 * 
 * Manages role requirements for stations including:
 * - Adding roles to stations
 * - Setting minimum/maximum worker counts per role
 * - Managing required skills
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Users, AlertCircle } from 'lucide-react';
import {
  useStationRequirements,
  useAddStationRequirement,
  useUpdateStationRequirement,
  useRemoveStationRequirement,
} from '@/hooks/schedulehub/useStations';
import { useRoles } from '@/hooks/schedulehub/useRoles';

interface StationRequirementsProps {
  stationId: string;
  stationName: string;
}

interface RequirementFormData {
  roleId: string;
  minWorkers: number;
  maxWorkers: number;
  requiredSkills: string[];
  notes: string;
}

export default function StationRequirements({ stationId, stationName }: StationRequirementsProps) {
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [formData, setFormData] = useState<RequirementFormData>({
    roleId: '',
    minWorkers: 1,
    maxWorkers: 1,
    requiredSkills: [],
    notes: '',
  });

  const { data: requirements = [], isLoading: loadingRequirements } = useStationRequirements(stationId);
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const addRequirement = useAddStationRequirement();
  const updateRequirement = useUpdateStationRequirement();
  const removeRequirement = useRemoveStationRequirement();

  // Get roles that aren't already assigned
  const availableRoles = roles.filter(
    (role: any) => !requirements.find((req: any) => req.roleId === role.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roleId) return;

    const data = {
      roleId: formData.roleId,
      minWorkers: formData.minWorkers,
      maxWorkers: formData.maxWorkers,
      requiredSkills: formData.requiredSkills.filter(s => s.trim()),
      notes: formData.notes.trim() || null,
    };

    if (editingRequirement) {
      updateRequirement.mutate(
        { stationId, roleId: editingRequirement.roleId, data },
        {
          onSuccess: () => {
            setEditingRequirement(null);
            resetForm();
          },
        }
      );
    } else {
      addRequirement.mutate(
        { stationId, data },
        {
          onSuccess: () => {
            setIsAddingRequirement(false);
            resetForm();
          },
        }
      );
    }
  };

  const handleEdit = (requirement: any) => {
    setEditingRequirement(requirement);
    setFormData({
      roleId: requirement.roleId,
      minWorkers: requirement.minWorkers,
      maxWorkers: requirement.maxWorkers,
      requiredSkills: requirement.requiredSkills || [],
      notes: requirement.notes || '',
    });
    setIsAddingRequirement(true);
  };

  const handleDelete = (roleId: string) => {
    if (confirm('Are you sure you want to remove this requirement?')) {
      removeRequirement.mutate({ stationId, roleId });
    }
  };

  const resetForm = () => {
    setFormData({
      roleId: '',
      minWorkers: 1,
      maxWorkers: 1,
      requiredSkills: [],
      notes: '',
    });
    setIsAddingRequirement(false);
    setEditingRequirement(null);
  };

  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !formData.requiredSkills.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skill.trim()],
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(s => s !== skillToRemove),
    }));
  };

  if (loadingRequirements || loadingRoles) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Requirements</h2>
          <p className="text-gray-600 mt-1">
            Manage worker requirements for {stationName}
          </p>
        </div>
        {!isAddingRequirement && availableRoles.length > 0 && (
          <button
            onClick={() => setIsAddingRequirement(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Requirement
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAddingRequirement && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRequirement ? 'Edit Requirement' : 'Add Requirement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                disabled={!!editingRequirement}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select a role...</option>
                {(editingRequirement ? roles : availableRoles).map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Worker Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Workers <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minWorkers}
                  onChange={(e) => setFormData(prev => ({ ...prev, minWorkers: parseInt(e.target.value) || 0 }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Workers
                </label>
                <input
                  type="number"
                  min={formData.minWorkers}
                  value={formData.maxWorkers}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxWorkers: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills (optional)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Type a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this requirement..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={addRequirement.isPending || updateRequirement.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {(addRequirement.isPending || updateRequirement.isPending) ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requirements List */}
      {requirements.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Requirements Set</h3>
          <p className="text-gray-600 mb-4">
            Add role requirements to define staffing needs for this station
          </p>
          {availableRoles.length > 0 && (
            <button
              onClick={() => setIsAddingRequirement(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add First Requirement
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {requirements.map((requirement: any) => {
            const role = roles.find((r: any) => r.id === requirement.roleId);
            return (
              <div
                key={requirement.roleId}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {role?.name || 'Unknown Role'}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {requirement.minWorkers} - {requirement.maxWorkers} workers
                      </span>
                    </div>

                    {requirement.requiredSkills && requirement.requiredSkills.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mb-1">Required Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {requirement.requiredSkills.map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {requirement.notes && (
                      <p className="text-sm text-gray-600 mt-2">{requirement.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(requirement)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(requirement.roleId)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                      disabled={removeRequirement.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {availableRoles.length === 0 && !isAddingRequirement && requirements.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">All Available Roles Assigned</p>
            <p className="text-sm text-blue-700 mt-1">
              All existing roles have been assigned to this station. Create new roles to add more requirements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
