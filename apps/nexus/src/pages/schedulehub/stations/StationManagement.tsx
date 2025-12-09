/**
 * Station Management Component
 * 
 * Main interface for managing stations with CRUD operations
 */

import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, AlertCircle, ArrowLeft } from 'lucide-react';
import { useStations, useDeleteStation } from '@/hooks/schedulehub/useStations';
import { useNavigate, Link } from 'react-router-dom';
import StationForm from './StationForm';

export default function StationManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStation, setEditingStation] = useState<any>(null);

  const { data: stations, isLoading, error } = useStations();
  const { mutate: deleteStation } = useDeleteStation();

  // Filter stations based on search query
  const filteredStations = stations?.filter((station: any) =>
    station.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDelete = (station: any) => {
    if (window.confirm(`Are you sure you want to delete station "${station.name}"?`)) {
      deleteStation(station.id);
    }
  };

  const handleEdit = (station: any) => {
    setEditingStation(station);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingStation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <p className="text-red-800 dark:text-red-300">Failed to load stations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to ScheduleHub */}
      <Link
        to="/schedulehub"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ScheduleHub
      </Link>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Station Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage stations and their requirements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Station
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search stations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Stations Grid */}
      {filteredStations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No stations found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Get started by creating your first station'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Station
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((station: any) => (
            <div
              key={station.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md dark:hover:shadow-slate-900/20 transition-shadow"
            >
              {/* Station Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {station.name}
                  </h3>
                  {station.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{station.location}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    station.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {station.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Station Details */}
              <div className="space-y-2 mb-4">
                {station.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {station.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {station.capacity || 'N/A'}
                  </span>
                </div>
                {station.requirementCount !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Requirements:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {station.requirementCount} role(s)
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => navigate(`/schedulehub/stations/${station.id}`)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEdit(station)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  title="Edit station"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(station)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  title="Delete station"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <StationForm
          station={editingStation}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </div>
  );
}
