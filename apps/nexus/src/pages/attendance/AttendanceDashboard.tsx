/**
 * Attendance Dashboard
 * Overview of attendance statistics and quick actions
 */

import { Link } from 'react-router-dom';
import { Users, Clock, UserCheck, UserX, AlertCircle, TrendingUp } from 'lucide-react';
import { useTodayAttendance, useAttendanceStatistics } from '@/hooks/useAttendance';
import type { AttendanceStatus } from '@/types/attendance.types';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  'half-day': 'bg-blue-100 text-blue-800',
  'on-leave': 'bg-purple-100 text-purple-800',
};

export default function AttendanceDashboard() {
  const { data: todayRecords = [], isLoading: loadingToday } = useTodayAttendance();
  const { data: statistics, isLoading: loadingStats } = useAttendanceStatistics();

  const isLoading = loadingToday || loadingStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
        <p className="text-gray-600">Monitor real-time attendance and workforce presence</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span className="text-sm text-gray-600">Total Employees</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{statistics?.totalEmployees || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active workforce</p>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="w-6 h-6 text-green-600" />
            <span className="text-sm text-gray-600">Present Today</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{statistics?.presentToday || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics?.attendanceRate?.toFixed(1)}% attendance rate
              </p>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <UserX className="w-6 h-6 text-red-600" />
            <span className="text-sm text-gray-600">Absent Today</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{statistics?.absentToday || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Including on leave</p>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-gray-600">Clocked In</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">{statistics?.clockedIn || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Currently working</p>
            </>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Late Arrivals</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics?.lateToday || 0}</p>
          <p className="text-sm text-gray-600 mt-1">
            Punctuality: {statistics?.punctualityRate?.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Avg Hours Worked</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statistics?.averageHoursWorked?.toFixed(1) || '0.0'}h
          </p>
          <p className="text-sm text-gray-600 mt-1">Per employee per day</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">On Break</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics?.onBreak || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Employees currently on break</p>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
          <Link
            to="/attendance/records"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Records →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : todayRecords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No attendance records for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Clock In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Clock Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {todayRecords.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{record.employee?.department?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {record.totalHoursWorked.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/attendance/records"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">View Records</span>
          </Link>
          <Link
            to="/attendance/timesheets"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock className="w-8 h-8 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Timesheets</span>
          </Link>
          <Link
            to="/attendance/schedules"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Work Schedules</span>
          </Link>
          <Link
            to="/attendance/reports"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <span className="text-sm font-medium text-gray-900">Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
