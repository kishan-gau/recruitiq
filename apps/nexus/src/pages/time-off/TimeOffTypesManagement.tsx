/**
 * Time-Off Types Management Page
 * Configure time-off types and policies
 */

import { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useTimeOffTypes, useCreateTimeOffType, useUpdateTimeOffType, useDeleteTimeOffType } from '@/hooks/useTimeOff';
import { usePermissions } from '@/contexts/PermissionsContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';

interface TimeOffTypeForm {
  typeName: string;
  typeCode: string;
  description: string;
  isPaid: boolean;
  requiresApproval: boolean;
  maxDaysPerYear: number | null;
  carryOverAllowed: boolean;
  maxCarryOverDays: number | null;
  accrualRate: number | null;
  color: string;
  isActive: boolean;
}

const INITIAL_FORM: TimeOffTypeForm = {
  typeName: '',
  typeCode: '',
  description: '',
  isPaid: true,
  requiresApproval: true,
  maxDaysPerYear: null,
  carryOverAllowed: false,
  maxCarryOverDays: null,
  accrualRate: null,
  color: '#3B82F6',
  isActive: true,
};

const COLOR_PRESETS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
];

export default function TimeOffTypesManagement() {
  const { hasPermission } = usePermissions();
  const { data: types, isLoading } = useTimeOffTypes();
  const createMutation = useCreateTimeOffType();
  const updateMutation = useUpdateTimeOffType();
  const deleteMutation = useDeleteTimeOffType();

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState<TimeOffTypeForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof TimeOffTypeForm, string>>>({});

  const canManage = hasPermission('time-off:manage-types');

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TimeOffTypeForm, string>> = {};

    if (!formData.typeName.trim()) {
      newErrors.typeName = 'Type name is required';
    }
    if (!formData.typeCode.trim()) {
      newErrors.typeCode = 'Type code is required';
    } else if (!/^[A-Z_]+$/.test(formData.typeCode)) {
      newErrors.typeCode = 'Type code must be uppercase letters and underscores only';
    }

    if (formData.maxDaysPerYear !== null && formData.maxDaysPerYear < 0) {
      newErrors.maxDaysPerYear = 'Max days must be positive';
    }

    if (formData.carryOverAllowed && formData.maxCarryOverDays !== null && formData.maxCarryOverDays < 0) {
      newErrors.maxCarryOverDays = 'Max carry over days must be positive';
    }

    if (formData.accrualRate !== null && (formData.accrualRate < 0 || formData.accrualRate > 365)) {
      newErrors.accrualRate = 'Accrual rate must be between 0 and 365';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData(INITIAL_FORM);
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (type: any) => {
    setEditingType(type);
    setFormData({
      typeName: type.typeName,
      typeCode: type.typeCode,
      description: type.description || '',
      isPaid: type.isPaid,
      requiresApproval: type.requiresApproval,
      maxDaysPerYear: type.maxDaysPerYear,
      carryOverAllowed: type.carryOverAllowed,
      maxCarryOverDays: type.maxCarryOverDays,
      accrualRate: type.accrualRate,
      color: type.color || '#3B82F6',
      isActive: type.isActive,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingType) {
        await updateMutation.mutateAsync({ id: editingType.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving time-off type:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this time-off type? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          You don't have permission to manage time-off types.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time-Off Types</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure time-off types and policies for your organization
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Add Time-Off Type
        </button>
      </div>

      {/* Types Grid */}
      {types?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No time-off types</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first time-off type.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types?.map((type) => (
            <div
              key={type.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${type.color || '#3B82F6'}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{type.typeName}</h3>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {type.typeCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(type)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {type.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{type.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Paid</span>
                  {type.isPaid ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <XCircle size={16} className="text-red-600" />
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Requires Approval</span>
                  {type.requiresApproval ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <XCircle size={16} className="text-gray-600" />
                  )}
                </div>

                {type.maxDaysPerYear && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Max Days/Year</span>
                    <span className="font-medium text-gray-900 dark:text-white">{type.maxDaysPerYear}</span>
                  </div>
                )}

                {type.carryOverAllowed && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Carry Over</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {type.maxCarryOverDays ? `${type.maxCarryOverDays} days` : 'Unlimited'}
                    </span>
                  </div>
                )}

                {type.accrualRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Accrual Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">{type.accrualRate} days/year</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      type.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  >
                    {type.isActive ? (
                      <>
                        <CheckCircle size={12} />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle size={12} />
                        Inactive
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingType ? 'Edit Time-Off Type' : 'Create Time-Off Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type Name *
              </label>
              <input
                type="text"
                value={formData.typeName}
                onChange={(e) => setFormData({ ...formData, typeName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Annual Leave"
              />
              {errors.typeName && <p className="mt-1 text-sm text-red-600">{errors.typeName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type Code *
              </label>
              <input
                type="text"
                value={formData.typeCode}
                onChange={(e) => setFormData({ ...formData, typeCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="e.g., ANNUAL_LEAVE"
                disabled={!!editingType}
              />
              {errors.typeCode && <p className="mt-1 text-sm text-red-600">{errors.typeCode}</p>}
              <p className="mt-1 text-xs text-gray-500">Uppercase letters and underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Brief description of this time-off type..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`h-10 rounded-lg transition-all ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration</h3>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPaid"
                checked={formData.isPaid}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="isPaid" className="text-sm text-gray-700 dark:text-gray-300">
                Paid time-off
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="requiresApproval" className="text-sm text-gray-700 dark:text-gray-300">
                Requires approval
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Limits & Accrual</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Days Per Year
              </label>
              <input
                type="number"
                value={formData.maxDaysPerYear ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, maxDaysPerYear: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Leave empty for unlimited"
                min="0"
              />
              {errors.maxDaysPerYear && <p className="mt-1 text-sm text-red-600">{errors.maxDaysPerYear}</p>}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="checkbox"
                  id="carryOverAllowed"
                  checked={formData.carryOverAllowed}
                  onChange={(e) => setFormData({ ...formData, carryOverAllowed: e.target.checked })}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="carryOverAllowed" className="text-sm text-gray-700 dark:text-gray-300">
                  Allow carry over to next year
                </label>
              </div>

              {formData.carryOverAllowed && (
                <input
                  type="number"
                  value={formData.maxCarryOverDays ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCarryOverDays: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Max carry over days (empty for unlimited)"
                  min="0"
                />
              )}
              {errors.maxCarryOverDays && <p className="mt-1 text-sm text-red-600">{errors.maxCarryOverDays}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Accrual Rate (Days per Year)
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.accrualRate ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, accrualRate: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 2.5 days per month = 30 days per year"
                min="0"
                max="365"
              />
              {errors.accrualRate && <p className="mt-1 text-sm text-red-600">{errors.accrualRate}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingType
                ? 'Update Type'
                : 'Create Type'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
