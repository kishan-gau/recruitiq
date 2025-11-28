/**
 * Time-Off Type Form Modal
 * Create or edit time-off type configuration
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type {
  TimeOffTypeConfig,
  CreateTimeOffTypeDTO,
  AccrualFrequency,
  CarryOverPolicy
} from '../../types/timeOffTypes.types';

interface TimeOffTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimeOffTypeDTO) => Promise<void>;
  editingType?: TimeOffTypeConfig | null;
  isLoading?: boolean;
}

const ACCRUAL_FREQUENCIES: { value: AccrualFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'per_pay_period', label: 'Per Pay Period' },
  { value: 'on_anniversary', label: 'On Anniversary' }
];

const CARRYOVER_POLICIES: { value: CarryOverPolicy; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No days carry over' },
  { value: 'all', label: 'All', description: 'All unused days carry over' },
  { value: 'limited', label: 'Limited', description: 'Limited days carry over' },
  { value: 'use_or_lose', label: 'Use or Lose', description: 'Must use by end of year' }
];

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#14B8A6', label: 'Teal' }
];

export default function TimeOffTypeFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingType,
  isLoading = false
}: TimeOffTypeFormModalProps) {
  const [formData, setFormData] = useState<CreateTimeOffTypeDTO>({
    typeName: '',
    typeCode: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    accrualEnabled: false,
    carryOverPolicy: 'none',
    requiresApproval: true,
    requiresDocumentation: false,
    availableDuringProbation: false,
    isPaid: true,
    isUnlimited: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingType) {
      setFormData({
        typeName: editingType.typeName,
        typeCode: editingType.typeCode,
        description: editingType.description || '',
        color: editingType.color || '#3B82F6',
        icon: editingType.icon || '',
        accrualEnabled: editingType.accrualEnabled,
        accrualFrequency: editingType.accrualFrequency,
        accrualRate: editingType.accrualRate,
        maxBalance: editingType.maxBalance,
        minBalance: editingType.minBalance,
        carryOverPolicy: editingType.carryOverPolicy,
        maxCarryOverDays: editingType.maxCarryOverDays,
        requiresApproval: editingType.requiresApproval,
        requiresDocumentation: editingType.requiresDocumentation,
        availableDuringProbation: editingType.availableDuringProbation,
        probationWaitingPeriodDays: editingType.probationWaitingPeriodDays,
        minRequestDays: editingType.minRequestDays,
        maxRequestDays: editingType.maxRequestDays,
        advanceNoticeDays: editingType.advanceNoticeDays,
        isPaid: editingType.isPaid,
        isUnlimited: editingType.isUnlimited
      });
    } else {
      // Reset form for new entry
      setFormData({
        typeName: '',
        typeCode: '',
        description: '',
        color: '#3B82F6',
        icon: '',
        accrualEnabled: false,
        carryOverPolicy: 'none',
        requiresApproval: true,
        requiresDocumentation: false,
        availableDuringProbation: false,
        isPaid: true,
        isUnlimited: false
      });
    }
    setErrors({});
  }, [editingType, isOpen]);

  const handleChange = (field: keyof CreateTimeOffTypeDTO, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.typeName.trim()) {
      newErrors.typeName = 'Type name is required';
    }

    if (!formData.typeCode.trim()) {
      newErrors.typeCode = 'Type code is required';
    } else if (!/^[A-Z_]+$/.test(formData.typeCode)) {
      newErrors.typeCode = 'Type code must be uppercase letters and underscores only';
    }

    if (formData.accrualEnabled) {
      if (!formData.accrualFrequency) {
        newErrors.accrualFrequency = 'Accrual frequency is required when accrual is enabled';
      }
      if (!formData.accrualRate || formData.accrualRate <= 0) {
        newErrors.accrualRate = 'Accrual rate must be greater than 0';
      }
    }

    if (formData.carryOverPolicy === 'limited') {
      if (!formData.maxCarryOverDays || formData.maxCarryOverDays <= 0) {
        newErrors.maxCarryOverDays = 'Max carryover days required for limited policy';
      }
    }

    if (formData.maxBalance && formData.maxBalance <= 0) {
      newErrors.maxBalance = 'Max balance must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingType ? 'Edit Time-Off Type' : 'Create Time-Off Type'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type Name *
                    </label>
                    <input
                      type="text"
                      value={formData.typeName}
                      onChange={(e) => handleChange('typeName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.typeName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Annual Leave"
                    />
                    {errors.typeName && (
                      <p className="text-red-600 text-sm mt-1">{errors.typeName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type Code *
                    </label>
                    <input
                      type="text"
                      value={formData.typeCode}
                      onChange={(e) => handleChange('typeCode', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.typeCode ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., ANNUAL_LEAVE"
                    />
                    {errors.typeCode && (
                      <p className="text-red-600 text-sm mt-1">{errors.typeCode}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => handleChange('color', color.value)}
                          className={`w-full h-10 rounded-lg border-2 transition-all ${
                            formData.color === color.value
                              ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Type Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) => handleChange('isPaid', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Paid Time Off
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isUnlimited}
                      onChange={(e) => handleChange('isUnlimited', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Unlimited Policy
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => handleChange('requiresApproval', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Requires Manager Approval
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.requiresDocumentation}
                      onChange={(e) => handleChange('requiresDocumentation', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Requires Documentation
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.availableDuringProbation}
                      onChange={(e) => handleChange('availableDuringProbation', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Available During Probation
                    </span>
                  </label>
                </div>
              </div>

              {/* Accrual Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Accrual Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.accrualEnabled}
                      onChange={(e) => handleChange('accrualEnabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Accrual
                    </span>
                  </label>

                  {formData.accrualEnabled && !formData.isUnlimited && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency *
                        </label>
                        <select
                          value={formData.accrualFrequency || ''}
                          onChange={(e) => handleChange('accrualFrequency', e.target.value as AccrualFrequency)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.accrualFrequency ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select frequency</option>
                          {ACCRUAL_FREQUENCIES.map((freq) => (
                            <option key={freq.value} value={freq.value}>
                              {freq.label}
                            </option>
                          ))}
                        </select>
                        {errors.accrualFrequency && (
                          <p className="text-red-600 text-sm mt-1">{errors.accrualFrequency}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rate (days) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.accrualRate || ''}
                          onChange={(e) => handleChange('accrualRate', parseFloat(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.accrualRate ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="1.25"
                        />
                        {errors.accrualRate && (
                          <p className="text-red-600 text-sm mt-1">{errors.accrualRate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Balance (days)
                        </label>
                        <input
                          type="number"
                          value={formData.maxBalance || ''}
                          onChange={(e) => handleChange('maxBalance', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Carryover Policy */}
              {!formData.isUnlimited && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Carryover Policy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CARRYOVER_POLICIES.map((policy) => (
                      <label
                        key={policy.value}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.carryOverPolicy === policy.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="carryOverPolicy"
                          value={policy.value}
                          checked={formData.carryOverPolicy === policy.value}
                          onChange={(e) => handleChange('carryOverPolicy', e.target.value as CarryOverPolicy)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{policy.label}</span>
                          <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {formData.carryOverPolicy === 'limited' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Carryover Days *
                      </label>
                      <input
                        type="number"
                        value={formData.maxCarryOverDays || ''}
                        onChange={(e) => handleChange('maxCarryOverDays', parseInt(e.target.value))}
                        className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.maxCarryOverDays ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="5"
                      />
                      {errors.maxCarryOverDays && (
                        <p className="text-red-600 text-sm mt-1">{errors.maxCarryOverDays}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Request Rules */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Request Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Request Days
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.minRequestDays || ''}
                      onChange={(e) => handleChange('minRequestDays', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Request Days
                    </label>
                    <input
                      type="number"
                      value={formData.maxRequestDays || ''}
                      onChange={(e) => handleChange('maxRequestDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="14"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Advance Notice (days)
                    </label>
                    <input
                      type="number"
                      value={formData.advanceNoticeDays || ''}
                      onChange={(e) => handleChange('advanceNoticeDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="7"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Saving...' : editingType ? 'Update Type' : 'Create Type'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
