
import { Station } from '@/types/schedulehub';
import { Clock, MapPin, Users, Calendar } from 'lucide-react';

interface StationDetailsProps {
  station: Station;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

export default function StationDetails({
  station,
  onEdit,
  onDelete,
  onAssign,
}: StationDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {station.stationCode}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{station.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                station.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {station.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Station Type
            </h3>
            <p className="text-base text-gray-900 capitalize">
              {station.zone}
            </p>
          </div>

          {station.location_id && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Location
              </h3>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <p className="text-base text-gray-900">
                  {station.locationName || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {station.department_id && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Department
              </h3>
            <p className="text-base text-gray-900">
                {station.floorLevel || 'N/A'}
            </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Capacity
            </h3>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-base text-gray-900">
                {station.capacity || 'Unlimited'}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {station.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Description
            </h3>
            <p className="text-base text-gray-900">{station.description}</p>
          </div>
        )}

        {/* Operating Hours */}
        {(station.operating_hours_start || station.operating_hours_end) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Operating Hours
            </h3>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <p className="text-base text-gray-900">
                {station.operatingHoursStart} - {station.operatingHoursEnd}
              </p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Created
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-900">
                {new Date(station.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Last Updated
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-900">
                {new Date(station.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onAssign}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Assign Employees
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Edit Station
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
        >
          Delete Station
        </button>
      </div>
    </div>
  );
}
