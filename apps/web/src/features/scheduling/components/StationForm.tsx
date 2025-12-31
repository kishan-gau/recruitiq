import { 
  Save, 
  X, 
  ArrowLeft, 
  Building2,
  MapPin,
  Users,
  Clock,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { 
  useStation,
  useCreateStation,
  useUpdateStation
} from '../hooks';
import { useLocations } from '@/hooks' // was: from '../hooks/useLocations';
import type { Station } from '../types';

interface StationFormData {
  stationCode: string;
  stationName: string;
  description: string;
  locationId: string;
  capacity: number | null;
  isActive: boolean;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  requirements: string;
}

interface StationFormProps {
  station?: Station;
  mode?: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export default function StationForm({
  station,
  mode = 'create',
  onSuccess,
  onCancel,
  onClose,
}: StationFormProps) {
  const navigate = useNavigate();
  const { id: stationId } = useParams<{ id: string }>();
  const isEditMode = mode === 'edit' || Boolean(station || stationId);

  // Form state
  const [formData, setFormData] = useState<StationFormData>({
    stationCode: '',
    stationName: '',
    description: '',
    locationId: '',
    capacity: null,
    isActive: true,
    operatingHoursStart: '09:00',
    operatingHoursEnd: '17:00',
    requirements: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StationFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch station data for edit mode
  const { 
    data: fetchedStation, 
    isLoading: isLoadingStation,
    error: stationError 
  } = useStation(stationId || '', {
    enabled: isEditMode && Boolean(stationId),
  });

  // Fetch locations for dropdown
  const { 
    data: locations = [], 
    isLoading: isLoadingLocations 
  } = useLocations();

  // Mutations
  const createStation = useCreateStation({
    onSuccess: () => {
      onSuccess?.();
      if (!onSuccess) {
        navigate('/scheduling/stations');
      }
    },
  });

  const updateStation = useUpdateStation({
    onSuccess: () => {
      onSuccess?.();
      if (!onSuccess) {
        navigate('/scheduling/stations');
      }
    },
  });

  // Populate form with station data
  useEffect(() => {
    const stationToEdit = station || fetchedStation;
    if (stationToEdit && isEditMode) {
      setFormData({
        stationCode: stationToEdit.stationCode || '',
        stationName: stationToEdit.stationName || '',
        description: stationToEdit.description || '',
        locationId: stationToEdit.locationId || '',
        capacity: stationToEdit.capacity,
        isActive: stationToEdit.isActive ?? true,
        operatingHoursStart: stationToEdit.operatingHoursStart || '09:00',
        operatingHoursEnd: stationToEdit.operatingHoursEnd || '17:00',
        requirements: stationToEdit.requirements || '',
      });
    }
  }, [station, fetchedStation, isEditMode]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof StationFormData, string>> = {};

    // Station Code validation
    if (!formData.stationCode.trim()) {
      newErrors.stationCode = 'Station code is required';
    } else if (formData.stationCode.length < 2 || formData.stationCode.length > 20) {
      newErrors.stationCode = 'Station code must be between 2 and 20 characters';
    }

    // Station Name validation
    if (!formData.stationName.trim()) {
      newErrors.stationName = 'Station name is required';
    } else if (formData.stationName.length < 3 || formData.stationName.length > 100) {
      newErrors.stationName = 'Station name must be between 3 and 100 characters';
    }

    // Location validation
    if (!formData.locationId) {
      newErrors.locationId = 'Location is required';
    }

    // Capacity validation
    if (formData.capacity !== null && formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    // Description validation
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    // Operating hours validation
    if (formData.operatingHoursStart && formData.operatingHoursEnd) {
      if (formData.operatingHoursStart >= formData.operatingHoursEnd) {
        newErrors.operatingHoursStart = 'Start time must be before end time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof StationFormData, value: string | number | boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        capacity: formData.capacity === null ? undefined : formData.capacity,
      };

      if (isEditMode && (station || stationId)) {
        const id = station?.id || stationId!;
        await updateStation.mutateAsync({ id, data: submitData });
      } else {
        await createStation.mutateAsync(submitData);
      }
    } catch (error) {
      console.error('Error submitting station form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    } else {
      navigate('/scheduling/stations');
    }
  };

  const isLoading = isEditMode && (isLoadingStation || isLoadingLocations);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (stationError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">Failed to load station data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Station' : 'Create Station'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditMode 
                    ? 'Update station information and settings'
                    : 'Add a new work station to your facility'
                  }
                </p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Station Code */}
          <div>
            <label htmlFor="stationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Station Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stationCode"
              value={formData.stationCode}
              onChange={(e) => handleInputChange('stationCode', e.target.value)}
              disabled={isEditMode || isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.stationCode 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600`}
              placeholder="Enter station code (e.g., ST001)"
              maxLength={20}
            />
            {errors.stationCode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.stationCode}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.stationCode.length}/20 characters
              {isEditMode && ' (Cannot be changed)'}
            </p>
          </div>

          {/* Station Name */}
          <div>
            <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Station Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stationName"
              value={formData.stationName}
              onChange={(e) => handleInputChange('stationName', e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.stationName 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
              placeholder="Enter station name"
              maxLength={100}
            />
            {errors.stationName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.stationName}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.stationName.length}/100 characters
            </p>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Location <span className="text-red-500">*</span>
            </label>
            <select
              id="locationId"
              value={formData.locationId}
              onChange={(e) => handleInputChange('locationId', e.target.value)}
              disabled={isSubmitting || isLoadingLocations}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.locationId 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.locationId}
              </p>
            )}
            {isLoadingLocations && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Loading locations...
              </p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              value={formData.capacity || ''}
              onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : null)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.capacity 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
              placeholder="Leave empty for unlimited capacity"
              min={1}
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.capacity}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum number of workers that can be assigned to this station
            </p>
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="operatingHoursStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time
              </label>
              <input
                type="time"
                id="operatingHoursStart"
                value={formData.operatingHoursStart}
                onChange={(e) => handleInputChange('operatingHoursStart', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="operatingHoursEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time
              </label>
              <input
                type="time"
                id="operatingHoursEnd"
                value={formData.operatingHoursEnd}
                onChange={(e) => handleInputChange('operatingHoursEnd', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              />
            </div>
            
            {errors.operatingHoursStart && (
              <div className="md:col-span-2">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.operatingHoursStart}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.description 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-vertical`}
              placeholder="Enter station description, special requirements, or notes..."
              maxLength={500}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {formData.isActive ? (
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  Station is active
                </span>
              ) : (
                <span className="flex items-center">
                  <XCircle className="h-4 w-4 text-gray-500 mr-1" />
                  Station is inactive
                </span>
              )}
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !validateForm()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting 
                ? 'Saving...' 
                : isEditMode 
                  ? 'Update Station' 
                  : 'Create Station'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}