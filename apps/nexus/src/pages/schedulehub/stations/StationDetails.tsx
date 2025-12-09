import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStation, useDeleteStation } from '../../../hooks/schedulehub/useStations';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { handleApiError } from '../../../utils/errorHandler';

const StationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: station, isLoading, error } = useStation(id!);
  const { mutate: deleteStation, isPending: isDeleting } = useDeleteStation();

  const handleEdit = () => {
    navigate(`/schedulehub/stations/${id}/edit`);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete station "${station?.name}"?`)) {
      deleteStation(id!, {
        onSuccess: () => {
          toast.success('Station deleted successfully');
          navigate('/schedulehub/stations');
        },
        onError: (error) => {
          handleApiError(error, {
            toast,
            defaultMessage: 'Failed to delete station',
          });
        },
      });
    }
  };

  const handleViewAssignments = () => {
    navigate(`/schedulehub/stations/${id}/assignments`);
  };

  const handleRequirements = () => {
    navigate(`/schedulehub/stations/${id}/requirements`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">Failed to load station details</p>
          <button
            onClick={() => navigate('/schedulehub/stations')}
            className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
          >
            Back to stations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 min-h-screen">
      {/* Back to ScheduleHub */}
      <Link
        to="/schedulehub"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ScheduleHub
      </Link>
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/schedulehub/stations')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2 flex items-center"
          >
            ← Back to Stations
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{station.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{station.stationCode}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleViewAssignments}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Assignments
          </button>
          <button
            onClick={handleRequirements}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Requirements
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Station
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            station.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }`}
        >
          {station.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Station Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Station Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Station Code
            </label>
            <p className="text-gray-900 dark:text-gray-100">{station.stationCode}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Station Name
            </label>
            <p className="text-gray-900 dark:text-gray-100">{station.name}</p>
          </div>

          {station.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <p className="text-gray-900 dark:text-gray-100">{station.description}</p>
            </div>
          )}

          {station.capacity !== null && station.capacity !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Capacity
              </label>
              <p className="text-gray-900 dark:text-gray-100">{station.capacity} employees</p>
            </div>
          )}

          {station.stationType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Station Type
              </label>
              <p className="text-gray-900 dark:text-gray-100 capitalize">{station.stationType}</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Information */}
      {station.locationName && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Name
              </label>
              <p className="text-gray-900 dark:text-gray-100">{station.locationName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Created
            </label>
            <p className="text-gray-900 dark:text-gray-100">
              {new Date(station.createdAt).toLocaleString()}
            </p>
          </div>
          {station.updatedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(station.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationDetails;
