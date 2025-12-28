import React from 'react';
import { useParams } from 'react-router-dom';
import { useLocations } from '../../hooks/hris/useLocations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function Locations() {
  const { organizationId } = useParams();
  const { data: locations = [], isLoading, error } = useLocations(organizationId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
        <p className="mt-2 text-gray-600">Manage office locations and facilities</p>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No locations configured yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{location.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{location.address}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{location.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
