import React from 'react';
import { useParams } from 'react-router-dom';
import { useAttendanceRecords } from '../../hooks/useAttendance';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function Attendance() {
  const { organizationId } = useParams();
  const { data: attendanceRecords = [], isLoading, error } = useAttendanceRecords();

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
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-2 text-gray-600">Track and manage employee attendance records</p>
      </div>

      {attendanceRecords.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No attendance records found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check In</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendanceRecords.map((record) => {
                const first = record.employee?.firstName ?? '';
                const last = record.employee?.lastName ?? '';
                const name = `${first} ${last}`.trim() || record.employee?.email || 'Unknown';

                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clockInTime || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.clockOutTime || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
