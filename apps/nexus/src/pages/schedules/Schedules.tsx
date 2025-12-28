import React from 'react';
import { useParams } from 'react-router-dom';
import { useSchedules } from '../../hooks/schedulehub/useScheduleStats';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function Schedules() {
  const { organizationId } = useParams();
  const { data: schedules = [], isLoading, error } = useSchedules({ organizationId });

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
        <h1 className="text-3xl font-bold text-gray-900">Schedules</h1>
        <p className="mt-2 text-gray-600">Manage work schedules and rotations</p>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No schedules configured yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Schedule Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Start Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">End Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{schedule.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{schedule.startTime || schedule.startDate || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{schedule.endTime || schedule.endDate || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                      {schedule.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
