import { useState } from 'react';
import { Plus, Search, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useStations, useDeleteStation } from '../../../hooks/schedulehub/useStations';
import StationForm from './StationForm';
import StationDetails from './StationDetails';
import { useToast } from '../../../contexts/ToastContext';

export default function StationsManagement() {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const toast = useToast();

  const { data: stations, isLoading } = useStations({ search });
  const { mutate: deleteStation } = useDeleteStation();

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete station "${name}"?`)) {
      deleteStation(id, {
        onSuccess: () => {
          toast.success('Station deleted successfully');
        },
        onError: () => {
          toast.error('Failed to delete station');
        },
      });
    }
  };

  const handleEdit = (station: any) => {
    setSelectedStation(station);
    setIsFormOpen(true);
  };

  const handleView = (station: any) => {
    setSelectedStation(station);
    setIsDetailsOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedStation(null);
  };

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
    setSelectedStation(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Station Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage work stations, locations, and staffing requirements
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Station
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stations by name or location..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Stations Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stations?.map((station: any) => (
            <div
              key={station.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(station)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {station.name}
                  </h3>
                  {station.isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {station.location && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1" />
                    {station.location}
                  </div>
                )}

                {station.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {station.description}
                  </p>
                )}

                {station.requirements && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Requirements
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-gray-500">Min Workers:</span>
                        <span className="ml-1 text-sm font-medium text-gray-900">
                          {station.requirements.minWorkers || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Max Workers:</span>
                        <span className="ml-1 text-sm font-medium text-gray-900">
                          {station.requirements.maxWorkers || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(station);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(station.id, station.name);
                    }}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {stations?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No stations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'Try adjusting your search terms' : 'Get started by creating a new station'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Station Form Modal */}
      {isFormOpen && (
        <StationForm
          station={selectedStation}
          onClose={handleFormClose}
        />
      )}

      {/* Station Details Modal */}
      {isDetailsOpen && selectedStation && (
        <StationDetails
          station={selectedStation}
          onClose={handleDetailsClose}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
