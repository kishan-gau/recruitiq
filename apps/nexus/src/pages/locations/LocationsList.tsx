import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MapPin } from 'lucide-react';
import { useLocations, useDeleteLocation } from '../../services/LocationsService';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import type { LocationFilters, LocationType } from '@/types/location.types';
import BulkActions from '@/components/ui/BulkActions';
import ExportButton from '@/components/ui/ExportButton';

export default function LocationsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filters, setFilters] = useState<LocationFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Fetch locations with filters
  const { data: locations, isLoading, error } = useLocations(filters);
  const { mutate: deleteLocation } = useDeleteLocation();

  // Filter locations by search query (client-side)
  const filteredLocations = locations?.filter((location) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.locationName.toLowerCase().includes(query) ||
      location.locationCode.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.country?.toLowerCase().includes(query)
    );
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteLocation(id, {
        onSuccess: () => {
          toast.success('Location deleted successfully');
        },
        onError: (error) => {
          // Use centralized error handler for user-friendly messages
          handleApiError(error, {
            toast,
            defaultMessage: 'Failed to delete location',
          });
        },
      });
    }
  };

  const getTypeBadge = (type?: LocationType) => {
    if (!type) return null;
    
    const styles = {
      headquarters: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      branch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      remote: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      warehouse: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      store: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          isActive
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Locations</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your organization's locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Export */}
          {filteredLocations && filteredLocations.length > 0 && (
            <ExportButton
              data={filteredLocations}
              filename="locations"
            />
          )}
          
          <Link to="/locations/new">
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Add Location
            </button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredLocations && filteredLocations.length > 0 && (
        <BulkActions
          selectedItems={selectedLocations}
          allItems={filteredLocations}
          onSelectionChange={setSelectedLocations}
          actions={[
            {
              label: 'Delete Selected',
              variant: 'danger',
              action: async (ids: string[]) => {
                if (window.confirm(`Delete ${ids.length} location(s)?`)) {
                  for (const id of ids) {
                    await new Promise((resolve) => {
                      deleteLocation(id, {
                        onSuccess: resolve,
                        onError: resolve,
                      });
                    });
                  }
                  setSelectedLocations([]);
                }
              },
            },
          ]}
        />
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, code, city, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label htmlFor="location-type-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type
              </label>
              <select
                id="location-type-filter"
                value={filters.locationType || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    locationType: e.target.value as LocationType | undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="headquarters">Headquarters</option>
                <option value="branch">Branch</option>
                <option value="remote">Remote</option>
                <option value="warehouse">Warehouse</option>
                <option value="store">Store</option>
              </select>
            </div>

            <div>
              <label htmlFor="location-status-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                id="location-status-filter"
                value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 spinner" aria-label="Loading locations"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && filteredLocations && filteredLocations.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No locations found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first location'}
          </p>
          <Link to="/locations/new">
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Add Location
            </button>
          </Link>
        </div>
      )}

      {!isLoading && !error && filteredLocations && filteredLocations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLocations.length === filteredLocations.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLocations(filteredLocations.map((l) => l.id));
                        } else {
                          setSelectedLocations([]);
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLocations.map((location) => (
                  <tr
                    key={location.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, location.id]);
                          } else {
                            setSelectedLocations(selectedLocations.filter((id) => id !== location.id));
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => navigate(`/locations/${location.id}`)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                            <MapPin className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {location.locationName}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            #{location.locationCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => navigate(`/locations/${location.id}`)}
                    >
                      {getTypeBadge(location.locationType)}
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => navigate(`/locations/${location.id}`)}
                    >
                      <div className="text-sm text-slate-900 dark:text-white">
                        {location.addressLine1 && (
                          <>
                            {location.addressLine1}
                            {location.addressLine2 && `, ${location.addressLine2}`}
                            <br />
                          </>
                        )}
                        {(location.city || location.stateProvince || location.postalCode) && (
                          <>
                            {location.city}
                            {location.city && location.stateProvince && ', '}
                            {location.stateProvince} {location.postalCode}
                            <br />
                          </>
                        )}
                        {location.country}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => navigate(`/locations/${location.id}`)}
                    >
                      <div className="text-sm text-slate-900 dark:text-white">
                        {location.phone && <div>{location.phone}</div>}
                        {location.email && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {location.email}
                          </div>
                        )}
                        {!location.phone && !location.email && '-'}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => navigate(`/locations/${location.id}`)}
                    >
                      {getStatusBadge(location.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/locations/${location.id}/edit`);
                          }}
                          className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(location.id, location.locationName);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results count */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredLocations.length} of {locations?.length || 0} locations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
