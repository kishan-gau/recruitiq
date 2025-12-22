/**
 * Station Form Component
 * 
 * Modal form for creating/editing stations
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCreateStation, useUpdateStation } from '@/hooks/schedulehub/useStations';
import { useLocations } from '@/hooks/useLocations';
import type { Location } from '@/types/location.types';

interface StationFormProps {
  station?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StationForm({ station, onClose, onSuccess }: StationFormProps) {
  const isEditMode = !!station;
  const [formData, setFormData] = useState({
    stationCode: '',
    stationName: '',
    description: '',
    locationId: '',
    floorLevel: '',
    zone: '',
    capacity: '',
    requiresSupervision: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createStation, isPending: isCreating } = useCreateStation();
  const { mutate: updateStation, isPending: isUpdating } = useUpdateStation();
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useLocations();

  useEffect(() => {
    if (station) {
      setFormData({
        stationCode: station.stationCode || station.station_code || '',
        stationName: station.stationName || station.station_name || station.name || '',
        description: station.description || '',
        locationId: station.locationId || station.location_id || '',
        floorLevel: station.floorLevel || station.floor_level || '',
        zone: station.zone || '',
        capacity: station.capacity?.toString() || '',
        requiresSupervision: station.requiresSupervision ?? station.requires_supervision ?? false,
      });
    }
  }, [station]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.stationCode.trim()) {
      newErrors.stationCode = 'Station code is required';
    }

    if (!formData.stationName.trim()) {
      newErrors.stationName = 'Station name is required';
    }

    if (!formData.locationId.trim()) {
      newErrors.locationId = 'Location is required';
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
      stationCode: formData.stationCode.trim(),
      stationName: formData.stationName.trim(),
      description: formData.description.trim() || null,
      locationId: formData.locationId.trim(),
      floorLevel: formData.floorLevel.trim() || null,
      zone: formData.zone.trim() || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      requiresSupervision: formData.requiresSupervision,
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Station' : 'Create Station'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Station Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Station Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.stationCode}
              onChange={(e) => handleChange('stationCode', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.stationCode ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="e.g., ST001, FD01, KT02"
            />
            {errors.stationCode && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.stationCode}
              </div>
            )}
          </div>

          {/* Station Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Station Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.stationName}
              onChange={(e) => handleChange('stationName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.stationName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="e.g., Front Desk, Kitchen, Sales Floor"
            />
            {errors.stationName && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.stationName}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.locationId}
              onChange={(e) => handleChange('locationId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                errors.locationId 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-slate-600'
              }`}
              disabled={locationsLoading}
            >
              <option value="">Select a location</option>
              {locations?.map((location: Location) => (
                <option key={location.id} value={location.id}>
                  {location.locationName} ({location.locationCode})
                </option>
              ))}
            </select>
            {locationsLoading && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Loading locations...
              </p>
            )}
            {locationsError && (
              <p className="mt-1 text-xs text-red-500">
                Error loading locations. Please refresh to try again.
              </p>
            )}
            {errors.locationId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.locationId}
              </p>
            )}
          </div>

          {/* Floor Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Floor Level
            </label>
            <input
              type="text"
              value={formData.floorLevel}
              onChange={(e) => handleChange('floorLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="e.g., 1, 2, B1, Ground"
            />
          </div>

          {/* Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone
            </label>
            <input
              type="text"
              value={formData.zone}
              onChange={(e) => handleChange('zone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="e.g., A, B, North, South"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Describe the station's purpose and responsibilities..."
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capacity
            </label>
            <input
              type="number"
              min="0"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.capacity ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="Maximum number of workers"
            />
            {errors.capacity && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.capacity}
              </div>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Leave empty if there's no capacity limit
            </p>
          </div>

          {/* Requires Supervision */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresSupervision"
              checked={formData.requiresSupervision}
              onChange={(e) => handleChange('requiresSupervision', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
            />
            <label htmlFor="requiresSupervision" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Requires supervision
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
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
