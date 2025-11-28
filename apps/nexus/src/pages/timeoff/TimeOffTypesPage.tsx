/**
 * Time-Off Types Management Page
 * Configure and manage organizational time-off types and accrual policies
 */

import React, { useState } from 'react';
import {
  useTimeOffTypes,
  useCreateTimeOffType,
  useUpdateTimeOffType,
  useDeleteTimeOffType
} from '../../hooks/useTimeOffTypes';
import type { TimeOffTypeConfig, TimeOffTypeFilters } from '../../types/timeOffTypes.types';
import { Plus, Edit, Trash2, Calendar, Settings, AlertCircle } from 'lucide-react';

export default function TimeOffTypesPage() {
  const [filters, setFilters] = useState<TimeOffTypeFilters>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<TimeOffTypeConfig | null>(null);

  const { data: timeOffTypes, isLoading, error } = useTimeOffTypes(filters);
  const createMutation = useCreateTimeOffType();
  const updateMutation = useUpdateTimeOffType();
  const deleteMutation = useDeleteTimeOffType();

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (id: string, updates: any) => {
    await updateMutation.mutateAsync({ id, updates });
    setEditingType(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this time-off type?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleActive = async (type: TimeOffTypeConfig) => {
    await updateMutation.mutateAsync({
      id: type.id,
      updates: { isActive: !type.isActive }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load time-off types</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time-Off Types</h1>
          <p className="text-gray-600 mt-1">
            Configure and manage organizational time-off types and policies
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Time-Off Type
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search types..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFilters({
                ...filters,
                isActive: e.target.value === 'all' ? undefined : e.target.value === 'active'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accrual
            </label>
            <select
              value={filters.accrualEnabled === undefined ? 'all' : filters.accrualEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => setFilters({
                ...filters,
                accrualEnabled: e.target.value === 'all' ? undefined : e.target.value === 'enabled'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.isPaid === undefined ? 'all' : filters.isPaid ? 'paid' : 'unpaid'}
              onChange={(e) => setFilters({
                ...filters,
                isPaid: e.target.value === 'all' ? undefined : e.target.value === 'paid'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Time-Off Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timeOffTypes?.map((type) => (
          <TimeOffTypeCard
            key={type.id}
            type={type}
            onEdit={() => setEditingType(type)}
            onDelete={() => handleDelete(type.id)}
            onToggleActive={() => handleToggleActive(type)}
          />
        ))}
      </div>

      {timeOffTypes?.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No time-off types found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.isActive !== undefined || filters.accrualEnabled !== undefined || filters.isPaid !== undefined
              ? 'Try adjusting your filters'
              : 'Get started by creating your first time-off type'}
          </p>
          {!filters.search && filters.isActive === undefined && filters.accrualEnabled === undefined && filters.isPaid === undefined && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Time-Off Type
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal would go here */}
      {/* For brevity, modal implementation is omitted but would be similar to other management pages */}
    </div>
  );
}

/**
 * Time-Off Type Card Component
 */
function TimeOffTypeCard({
  type,
  onEdit,
  onDelete,
  onToggleActive
}: {
  type: TimeOffTypeConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {type.color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: type.color }}
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{type.typeName}</h3>
            <span className="text-sm text-gray-500">{type.typeCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {type.description && (
        <p className="text-sm text-gray-600 mb-4">{type.description}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          type.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {type.isActive ? 'Active' : 'Inactive'}
        </span>
        {type.isPaid && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Paid
          </span>
        )}
        {type.isUnlimited && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Unlimited
          </span>
        )}
        {type.accrualEnabled && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
            Accrual: {type.accrualFrequency}
          </span>
        )}
        {type.requiresApproval && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Requires Approval
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="space-y-2 text-sm">
        {type.accrualEnabled && type.accrualRate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Accrual Rate:</span>
            <span className="font-medium text-gray-900">
              {type.accrualRate} days / {type.accrualFrequency}
            </span>
          </div>
        )}
        {type.maxBalance && (
          <div className="flex justify-between">
            <span className="text-gray-600">Max Balance:</span>
            <span className="font-medium text-gray-900">{type.maxBalance} days</span>
          </div>
        )}
        {type.carryOverPolicy !== 'none' && (
          <div className="flex justify-between">
            <span className="text-gray-600">Carryover:</span>
            <span className="font-medium text-gray-900 capitalize">
              {type.carryOverPolicy.replace('_', ' ')}
              {type.carryOverPolicy === 'limited' && type.maxCarryOverDays && ` (${type.maxCarryOverDays}d)`}
            </span>
          </div>
        )}
        {type.advanceNoticeDays && (
          <div className="flex justify-between">
            <span className="text-gray-600">Notice Required:</span>
            <span className="font-medium text-gray-900">{type.advanceNoticeDays} days</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={onToggleActive}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            type.isActive
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {type.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
