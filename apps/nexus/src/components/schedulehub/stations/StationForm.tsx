import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStation, useCreateStation, useUpdateStation } from '../../../hooks/schedulehub/useStations';
import { locationsService } from '../../../services/locations.service';
import { useToast } from '../../../contexts/ToastContext';
import { handleApiError } from '../../../utils/errorHandler';

interface StationFormData {
  stationCode: string;
  stationName: string;
  description: string;
  locationId: string;
  capacity: number | null;
  isActive: boolean;
}

export default function StationForm() {
  const params = useParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Debug: Log all params and current info
  console.log('StationForm - All params:', params);
  console.log('StationForm - ID param:', id);
  console.log('StationForm - Current URL:', window.location.pathname);
  console.log('StationForm - Current href:', window.location.href);
  
  const isEditing = !!id;

  const [formData, setFormData] = useState<StationFormData>({
    stationCode: '',
    stationName: '',
    description: '',
    locationId: '',
    capacity: null,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing station if editing
  const { data: station, isLoading: isLoadingStation } = useStation(id!, isEditing);

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsService.list(),
  });



  // Populate form when editing
  useEffect(() => {
    if (station) {
      setFormData({
        stationCode: station.stationCode,
        stationName: station.stationName,
        description: station.description || '',
        locationId: station.locationId || '',
        capacity: station.capacity,
        isActive: station.isActive,
      });
    }
  }, [station]);

  // Create mutation
  const createMutation = useCreateStation({
    onSuccess: () => {
      toast.success('Station created successfully');
      navigate('/schedulehub/stations');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create station',
      });
    },
  });

  // Update mutation
  const updateMutation = useUpdateStation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? value === '' ? null : Number(value)
          : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.stationCode.trim()) {
      newErrors.stationCode = 'Station code is required';
    } else if (formData.stationCode.length < 2) {
      newErrors.stationCode = 'Station code must be at least 2 characters';
    } else if (formData.stationCode.length > 20) {
      newErrors.stationCode = 'Station code must not exceed 20 characters';
    }

    if (!formData.stationName.trim()) {
      newErrors.stationName = 'Station name is required';
    } else if (formData.stationName.length < 3) {
      newErrors.stationName = 'Station name must be at least 3 characters';
    } else if (formData.stationName.length > 100) {
      newErrors.stationName = 'Station name must not exceed 100 characters';
    }

    if (!formData.locationId.trim()) {
      newErrors.locationId = 'Location is required';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    if (formData.capacity !== null && formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (isEditing) {
      if (!id) {
        toast.error('Station ID is missing');
        return;
      }
      updateMutation.mutate({ id, updates: formData }, {
        onSuccess: () => {
          toast.success('Station updated successfully');
          navigate('/schedulehub/stations');
        },
        onError: (error) => {
          handleApiError(error, {
            toast,
            defaultMessage: 'Failed to update station',
          });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoadingStation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/schedulehub/stations')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Station' : 'Create New Station'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Station Code */}
          <div>
            <label htmlFor="stationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Station Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stationCode"
              name="stationCode"
              value={formData.stationCode}
              onChange={handleChange}
              disabled={isEditing} // Code cannot be changed after creation
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                errors.stationCode ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              } ${isEditing ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`}
              placeholder="e.g., ST-001"
            />
            {errors.stationCode && (
              <p className="mt-1 text-sm text-red-600">{errors.stationCode}</p>
            )}
          </div>

          {/* Station Name */}
          <div>
            <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Station Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stationName"
              name="stationName"
              value={formData.stationName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                errors.stationName ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter station name"
            />
            {errors.stationName && (
              <p className="mt-1 text-sm text-red-600">{errors.stationName}</p>
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
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                errors.description ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Optional description of the station"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                errors.locationId ? 'border-red-300 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select a location</option>
              {locations?.map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.locationName}
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="mt-1 text-sm text-red-600">{errors.locationId}</p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity === null ? '' : formData.capacity}
              onChange={handleChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                errors.capacity ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Leave empty for unlimited capacity"
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Maximum number of employees that can be assigned to this station
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/schedulehub/stations')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
              ? 'Update Station'
              : 'Create Station'}
          </button>
        </div>
      </form>
    </div>
  );
}
