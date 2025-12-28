import React, { useState, useMemo } from 'react';
import { 
  useStations, 
  useDeleteStation 
} from '../hooks';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle,
  Building2,
  Clock
} from 'lucide-react';
import { Station } from '../types';

interface StationsManagementProps {
  onCreateStation?: () => void;
  onEditStation?: (station: Station) => void;
  onViewStation?: (station: Station) => void;
  onAssignWorkers?: (station: Station) => void;
}

export default function StationsManagement({
  onCreateStation,
  onEditStation,
  onViewStation,
  onAssignWorkers,
}: StationsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Fetch stations
  const { 
    data: stations = [], 
    isLoading, 
    error, 
    refetch 
  } = useStations();

  // Delete station mutation
  const deleteStation = useDeleteStation({
    onSuccess: () => {
      setShowDeleteConfirm(null);
      refetch();
    },
  });

  // Filter stations based on search query
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) {
      return stations;
    }

    const query = searchQuery.toLowerCase();
    return stations.filter(station =>
      station.stationCode?.toLowerCase().includes(query) ||
      station.stationName?.toLowerCase().includes(query) ||
      station.description?.toLowerCase().includes(query) ||
      station.locationName?.toLowerCase().includes(query)
    );
  }, [stations, searchQuery]);

  const handleDeleteStation = async (stationId: string) => {
    try {
      await deleteStation.mutateAsync(stationId);
    } catch (error) {
      console.error('Error deleting station:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">Failed to load stations</p>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Stations Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage work stations and their configurations
          </p>
        </div>
        
        {onCreateStation && (
          <button
            onClick={onCreateStation}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Station
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search stations by code, name, description, or location..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Stations Grid */}
      {filteredStations.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery.trim() ? (
            <div>
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No stations found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No stations match your search criteria
              </p>
            </div>
          ) : (
            <div>
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No stations yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start by creating your first work station
              </p>
              {onCreateStation && (
                <button
                  onClick={onCreateStation}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Station
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((station) => (
            <div
              key={station.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Station Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      onClick={() => onViewStation?.(station)}
                      title={station.stationName}
                    >
                      {station.stationCode}
                    </h3>
                    <p 
                      className="text-sm text-gray-600 dark:text-gray-400 truncate" 
                      title={station.stationName}
                    >
                      {station.stationName}
                    </p>
                  </div>
                  <div className="flex items-center ml-2">
                    {station.isActive ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <XCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Inactive</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Station Info */}
              <div className="p-4 space-y-3">
                {/* Location */}
                {station.locationName && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={station.locationName}>
                      {station.locationName}
                    </span>
                  </div>
                )}

                {/* Capacity */}
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    Capacity: {station.capacity ? station.capacity : 'Unlimited'}
                  </span>
                </div>

                {/* Operating Hours */}
                {(station.operatingHoursStart || station.operatingHoursEnd) && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      {station.operatingHoursStart} - {station.operatingHoursEnd}
                    </span>
                  </div>
                )}

                {/* Description */}
                {station.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p 
                      className="line-clamp-2" 
                      title={station.description}
                    >
                      {station.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Station Actions */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {onAssignWorkers && (
                      <button
                        onClick={() => onAssignWorkers(station)}
                        className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      >
                        Assign Workers
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {onEditStation && (
                      <button
                        onClick={() => onEditStation(station)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit Station"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowDeleteConfirm(station.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete Station"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Delete Station
                  </h3>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this station? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={deleteStation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStation(showDeleteConfirm)}
                  disabled={deleteStation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteStation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}