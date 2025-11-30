/**
 * Station Form Component
 * 
 * Modal form for creating/editing stations
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCreateStation, useUpdateStation } from '@/hooks/schedulehub/useStations';

interface StationFormProps {
  station?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StationForm({ station, onClose, onSuccess }: StationFormProps) {
  const isEditMode = !!station;
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    capacity: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createStation, isPending: isCreating } = useCreateStation();
  const { mutate: updateStation, isPending: isUpdating } = useUpdateStation();

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        location: station.location || '',
        description: station.description || '',
        capacity: station.capacity?.toString() || '',
        isActive: station.isActive ?? true,
      });
    }
  }, [station]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Station name is required';
    }

    if (formData.capacity && isNaN(Number(formData.capacity))) {
      newErrors.capacity = 'Capacity must be a number';
    }

    if (formData.capacity && Number(formData.capacity) < 0) {
      newErrors.capacity = 'Capacity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      name: formData.name.trim(),
      location: formData.location.trim() || null,
      description: formData.description.trim() || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      isActive: formData.isActive,
    };

    if (isEditMode) {
      updateStation(
        { id: station.id, updates: submitData },
        {
          onSuccess: () => {
            onSuccess();
          },
        }
      );
    } else {
      createStation(submitData, {
        onSuccess: () => {
          onSuccess();
        },
      });
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit Station' : 'Create Station'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Station Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Station Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Front Desk, Kitchen, Sales Floor"
            />
            {errors.name && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Building A, Floor 2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the station's purpose and responsibilities..."
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacity
            </label>
            <input
              type="number"
              min="0"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Maximum number of workers"
            />
            {errors.capacity && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.capacity}
              </div>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Leave empty if there's no capacity limit
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Station is active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating || isUpdating
                ? 'Saving...'
                : isEditMode
                ? 'Save Changes'
                : 'Create Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
