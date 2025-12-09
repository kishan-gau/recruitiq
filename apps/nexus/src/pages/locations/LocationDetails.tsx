import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, Users, AlertCircle } from 'lucide-react';
import { useLocation, useDeleteLocation } from '@/services/LocationsService';
import { useState } from 'react';

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: location, isLoading, error } = useLocation(id!);
  const deleteMutation = useDeleteLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Debug logging for frontend state
  console.log('🎯 LocationDetails Debug:', {
    locationId: id,
    location: location,
    isLoading: isLoading,
    error: error,
    hasError: !!error,
    hasLocation: !!location,
    conditionResult: !!(error || !location),
    errorDetails: error ? { message: error.message, stack: error.stack } : null
  });

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/locations');
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  const getTypeBadge = (type?: string) => {
    const styles: Record<string, string> = {
      headquarters: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      branch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      remote: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      warehouse: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      store: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${styles[type || ''] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading location"></div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
              Location Not Found
            </h3>
            <p className="text-red-700 dark:text-red-400 mb-4">
              The location you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/locations')}
              className="text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              ← Back to Locations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/locations')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Back to locations"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {location.locationName}
              </h1>
              {getTypeBadge(location.locationType)}
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  location.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {location.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Location Code: {location.locationCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/locations/${id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Location Info */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Location Name
            </label>
            <p className="text-slate-900 dark:text-white">{location.locationName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Location Code
            </label>
            <p className="text-slate-900 dark:text-white">{location.locationCode}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Location Type
            </label>
            <p className="text-slate-900 dark:text-white capitalize">{location.locationType}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Status
            </label>
            <p className="text-slate-900 dark:text-white">
              {location.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Address
        </h2>

        <div className="space-y-2">
          {location.addressLine1 && (
            <p className="text-slate-900 dark:text-white">{location.addressLine1}</p>
          )}
          {location.addressLine2 && (
            <p className="text-slate-900 dark:text-white">{location.addressLine2}</p>
          )}
          {(location.city || location.stateProvince || location.postalCode) && (
            <p className="text-slate-900 dark:text-white">
              {[location.city, location.stateProvince, location.postalCode].filter(Boolean).join(', ')}
            </p>
          )}
          {location.country && (
            <p className="text-slate-900 dark:text-white">{location.country}</p>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Contact Information
        </h2>

        <div className="space-y-4">
          {location.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Phone
                </label>
                <a
                  href={`tel:${location.phone}`}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {location.phone}
                </a>
              </div>
            </div>
          )}

          {location.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <a
                  href={`mailto:${location.email}`}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {location.email}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employees Section - Placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employees at this Location
        </h2>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Employee list coming soon</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete Location
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <strong>{location.locationName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
