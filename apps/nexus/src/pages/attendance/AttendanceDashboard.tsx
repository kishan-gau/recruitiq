/**
 * Attendance Dashboard
 * Overview of attendance statistics and quick actions
 */

import { Link } from 'react-router-dom';
import { Users, Clock, UserCheck, UserX, AlertCircle, TrendingUp, Edit } from 'lucide-react';
import { useTodayAttendance, useAttendanceStatistics } from '@/hooks/useAttendance';
import type { AttendanceStatus } from '@/types/attendance.types';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'half-day': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'on-leave': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function AttendanceDashboard() {
  const { data: todayRecords = [], isLoading: loadingToday } = useTodayAttendance();
  const { data: statistics, isLoading: loadingStats } = useAttendanceStatistics();

  const isLoading = loadingToday || loadingStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor real-time attendance and workforce presence</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Employees</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics?.totalEmployees || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active workforce</p>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Present Today</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics?.presentToday || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {statistics?.attendanceRate?.toFixed(1)}% attendance rate
              </p>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Absent Today</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics?.absentToday || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Including on leave</p>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Clocked In</span>
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics?.clockedIn || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently working</p>
            </>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Late Arrivals</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.lateToday || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Punctuality: {statistics?.punctualityRate?.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Hours Worked</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics?.averageHoursWorked?.toFixed(1) || '0.0'}h
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Per employee per day</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">On Break</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.onBreak || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Employees currently on break</p>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Attendance</h2>
          <Link
            to="/attendance/records"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            View All Records →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ))}
          </div>
        ) : todayRecords.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No attendance records for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Clock In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Clock Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {todayRecords.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{record.employee?.department?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                      {record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                      {record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/attendance/records"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">View Records</span>
          </Link>
          <Link
            to="/attendance/manual-entry"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Edit className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Manual Entry</span>
          </Link>
          <Link
            to="/attendance/timesheets"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Timesheets</span>
          </Link>
          <Link
            to="/attendance/schedules"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Work Schedules</span>
          </Link>
          <Link
            to="/attendance/reports"
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
