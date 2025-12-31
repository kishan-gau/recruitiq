import { 
  Building2,
  MapPin,
  Users,
  Clock,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  UserPlus,
  User
} from 'lucide-react';

import type { Station } from '../types';

interface StationDetailsProps {
  station: Station;
  onEdit?: (station: Station) => void;
  onDelete?: (station: Station) => void;
  onAssignWorkers?: (station: Station) => void;
  isLoading?: boolean;
}

export default function StationDetails({
  station,
  onEdit,
  onDelete,
  onAssignWorkers,
  isLoading = false,
}: StationDetailsProps) {
  const handleEdit = () => {
    onEdit?.(station);
  };

  const handleDelete = () => {
    onDelete?.(station);
  };

  const handleAssignWorkers = () => {
    onAssignWorkers?.(station);
  };

  const formatTime = (time: string | null | undefined): string => {
    if (!time) return 'Not specified';
    
    try {
      // Handle both HH:MM and HH:MM:SS formats
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return time;
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {station.stationCode}
                  </h1>
                  {station.isActive ? (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                  {station.stationName}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {onAssignWorkers && (
                <button
                  onClick={handleAssignWorkers}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title="Assign Workers"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign Workers
                </button>
              )}
              
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title="Edit Station"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  title="Delete Station"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Station Information */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </div>
              <p className="text-base text-gray-900 dark:text-white">
                {station.location?.name || station.locationId || 'Not specified'}
              </p>
            </div>

            {/* Department */}
            {station.department && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Building2 className="h-4 w-4 mr-2" />
                  Department
                </div>
                <p className="text-base text-gray-900 dark:text-white">
                  {station.department}
                </p>
              </div>
            )}

            {/* Capacity */}
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2" />
                Capacity
              </div>
              <p className="text-base text-gray-900 dark:text-white">
                {station.capacity ? `${station.capacity} workers` : 'Unlimited'}
              </p>
            </div>

            {/* Operating Hours */}
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4 mr-2" />
                Operating Hours
              </div>
              <p className="text-base text-gray-900 dark:text-white">
                {station.operatingHoursStart && station.operatingHoursEnd
                  ? `${formatTime(station.operatingHoursStart)} - ${formatTime(station.operatingHoursEnd)}`
                  : 'Not specified'
                }
              </p>
            </div>

            {/* Current Workers */}
            {station.currentWorkers !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <User className="h-4 w-4 mr-2" />
                  Current Workers
                </div>
                <p className="text-base text-gray-900 dark:text-white">
                  {station.currentWorkers > 0 
                    ? `${station.currentWorkers} assigned` 
                    : 'No workers assigned'
                  }
                </p>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                Status
              </div>
              <div className="flex items-center">
                {station.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {station.description && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <FileText className="h-4 w-4 mr-2" />
                Description
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {station.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {station.requirements && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <FileText className="h-4 w-4 mr-2" />
                Requirements
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {station.requirements}
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Created */}
            {station.createdAt && (
              <div className="space-y-1">
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDate(station.createdAt)}
                  {station.createdBy && (
                    <span className="ml-1">
                      by {typeof station.createdBy === 'string' ? station.createdBy : station.createdBy.name || 'Unknown'}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Last Updated */}
            {station.updatedAt && (
              <div className="space-y-1">
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <Calendar className="h-3 w-3 mr-1" />
                  Last Updated
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDate(station.updatedAt)}
                  {station.updatedBy && (
                    <span className="ml-1">
                      by {typeof station.updatedBy === 'string' ? station.updatedBy : station.updatedBy.name || 'Unknown'}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}