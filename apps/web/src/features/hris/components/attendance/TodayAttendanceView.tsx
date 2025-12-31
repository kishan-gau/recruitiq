import { CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { useMemo } from 'react';

import { useTodayAttendance } from '@/hooks';

export default function TodayAttendanceView() {
  const { data: attendanceRecords, isLoading } = useTodayAttendance();

  const stats = useMemo(() => {
    if (!attendanceRecords) {
      return {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        presentEmployees: [],
        absentEmployees: [],
        lateEmployees: [],
      };
    }

    const present = attendanceRecords.filter((r) => r.status === 'present');
    const absent = attendanceRecords.filter((r) => r.status === 'absent');
    const late = attendanceRecords.filter((r) => r.status === 'late');

    return {
      present: present.length,
      absent: absent.length,
      late: late.length,
      total: attendanceRecords.length,
      presentEmployees: present,
      absentEmployees: absent,
      lateEmployees: late,
    };
  }, [attendanceRecords]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Today's Attendance Overview
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Employees */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Employees</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <Users className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        {/* Present */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Present</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                {stats.present}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {stats.total > 0
                  ? `${((stats.present / stats.total) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        {/* Late */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 dark:text-amber-400">Late Arrivals</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">
                {stats.late}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {stats.total > 0
                  ? `${((stats.late / stats.total) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        {/* Absent */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Absent</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">
                {stats.absent}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {stats.total > 0
                  ? `${((stats.absent / stats.total) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Details Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Late Arrivals */}
        {stats.late > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Late Arrivals ({stats.late})
            </h3>
            <div className="space-y-2">
              {stats.lateEmployees.slice(0, 5).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-800"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        {record.employee?.firstName?.[0]}
                        {record.employee?.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {record.checkInTime}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {stats.late > 5 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  +{stats.late - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Absent Employees */}
        {stats.absent > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Absent Today ({stats.absent})
            </h3>
            <div className="space-y-2">
              {stats.absentEmployees.slice(0, 5).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-800"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-red-800 dark:text-red-200">
                        {record.employee?.firstName?.[0]}
                        {record.employee?.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {stats.absent > 5 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  +{stats.absent - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Present Summary */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Present Today ({stats.present})
          </h3>
          <div className="space-y-2">
            {stats.presentEmployees.slice(0, 5).map((record: any) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-800"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-800 dark:text-green-200">
                      {record.employee?.firstName?.[0]}
                      {record.employee?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {record.employee?.firstName} {record.employee?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      In: {record.checkInTime}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {stats.present > 5 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                +{stats.present - 5} more
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {stats.total === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            No attendance records for today
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Records will appear as employees check in
          </p>
        </div>
      )}
    </div>
  );
}
