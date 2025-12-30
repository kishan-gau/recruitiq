import { Clock, Users, UserCheck } from 'lucide-react';

export default function TimeTrackingPage() {
  // Placeholder data - replace with actual hooks when implemented
  const isLoading = false;
  const stats = {
    totalEmployees: 0,
    clockedIn: 0,
    averageHours: 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor employee hours and attendance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Employees</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active workforce</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Clocked In</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.clockedIn}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently working</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Avg Hours</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.averageHours.toFixed(1)}h
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per employee per day</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-slate-800 p-12 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
        <Clock className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Time Tracking System
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Monitor employee attendance, clock in/out times, and track hours worked across your organization.
        </p>
      </div>
    </div>
  );
}
