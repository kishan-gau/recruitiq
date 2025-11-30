import { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { useStations, useDeleteStation } from '@/hooks/schedulehub/useStations';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import StationForm from './StationForm';
import StationDetails from './StationDetails';
import StationRequirements from './StationRequirements';

type ViewMode = 'list' | 'create' | 'edit' | 'details' | 'requirements';

interface StationWithId {
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  isActive?: boolean;
  capacity?: number;
  operatingHours?: {
    start: string;
    end: string;
  };
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export default function StationsList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: stations, isLoading, error } = useStations();
  const deleteStation = useDeleteStation();

  const handleCreate = () => {
    setSelectedStationId(null);
    setViewMode('create');
  };

  const handleEdit = (stationId: string) => {
    setSelectedStationId(stationId);
    setViewMode('edit');
  };

  const handleView = (stationId: string) => {
    setSelectedStationId(stationId);
    setViewMode('details');
  };

  const handleManageRequirements = (stationId: string) => {
    setSelectedStationId(stationId);
    setViewMode('requirements');
  };

  const handleDelete = async (stationId: string, stationName: string) => {
    if (window.confirm(`Are you sure you want to delete station "${stationName}"?`)) {
      try {
        await deleteStation.mutateAsync(stationId);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleFormSuccess = () => {
    setViewMode('list');
    setSelectedStationId(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedStationId(null);
  };

  // Filter stations
  const filteredStations = stations?.filter((station: StationWithId) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && station.isActive) ||
      (statusFilter === 'inactive' && !station.isActive);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message="Failed to load stations. Please try again." />;
  }

  // Show form/details views
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <StationForm
        stationId={selectedStationId}
        onSuccess={handleFormSuccess}
        onCancel={handleBack}
      />
    );
  }

  if (viewMode === 'details' && selectedStationId) {
    return <StationDetails stationId={selectedStationId} onBack={handleBack} />;
  }

  if (viewMode === 'requirements' && selectedStationId) {
    return <StationRequirements stationId={selectedStationId} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage scheduling stations and their requirements
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Station
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Stations</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Stations</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stations?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stations?.filter((s: StationWithId) => s.isActive).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Capacity</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stations?.length
                      ? Math.round(
                          stations.reduce((sum: number, s: StationWithId) => sum + (s.capacity || 0), 0) /
                            stations.length
                        )
                      : 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stations List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredStations && filteredStations.length > 0 ? (
          <ul role="list" className="divide-y divide-gray-200">
            {filteredStations.map((station: StationWithId) => (
              <li key={station.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {station.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {station.code}
                        </span>
                        {station.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        {station.location && (
                          <span className="flex items-center">
                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {station.location}
                          </span>
                        )}
                        {station.capacity && (
                          <span className="flex items-center">
                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            Capacity: {station.capacity}
                          </span>
                        )}
                        {station.operatingHours && (
                          <span className="flex items-center">
                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {station.operatingHours.start} - {station.operatingHours.end}
                          </span>
                        )}
                      </div>
                      {station.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {station.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleView(station.id)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleManageRequirements(station.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        title="Manage Requirements"
                      >
                        Requirements
                      </button>
                      <button
                        onClick={() => handleEdit(station.id)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        title="Edit Station"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(station.id, station.name)}
                        disabled={deleteStation.isPending}
                        className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Station"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating a new station.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Station
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
