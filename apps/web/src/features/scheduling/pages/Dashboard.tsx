import { TrendingUp, MapPin, Users, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SchedulingDashboard() {
  // Placeholder data - replace with actual hooks when implemented
  const isLoading = false;
  const stats = {
    activeWorkers: 0,
    publishedSchedules: 0,
    openShifts: 0,
  };

  const stationCoverage = {
    totalStations: 0,
    fullyStaffed: 0,
    understaffed: 0,
    unstaffed: 0,
    coveragePercentage: 0,
    status: 'good' as 'good' | 'warning' | 'critical',
  };

  const statCards = [
    {
      title: 'Station Coverage',
      value: `${stationCoverage.coveragePercentage}%`,
      subtitle: `${stationCoverage.fullyStaffed}/${stationCoverage.totalStations} stations`,
      change: 'Optimal',
      trend: 'up' as const,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Workers',
      value: stats.activeWorkers,
      subtitle: 'Available for scheduling',
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Published Schedules',
      value: stats.publishedSchedules,
      subtitle: 'Current schedules',
      change: '+5%',
      trend: 'up' as const,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Open Shifts',
      value: stats.openShifts,
      subtitle: 'Need assignment',
      change: '+8%',
      trend: 'up' as const,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">ScheduleHub</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Workforce scheduling and shift management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${stat.bgColor || ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {stat.subtitle}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor ? 'bg-white/50 dark:bg-slate-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <stat.icon className={`w-6 h-6 ${stat.color || 'text-slate-600 dark:text-slate-400'}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp
                className={`w-4 h-4 mr-1 ${
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}
              />
              <span
                className={`text-sm font-medium ${stat.color || (
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-500 ml-2">
                vs last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/scheduling/schedules"
            className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-slate-900 dark:text-white">View Schedules</span>
          </Link>
          <Link
            to="/scheduling/shifts"
            className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-slate-900 dark:text-white">Manage Shifts</span>
          </Link>
          <Link
            to="/scheduling/workers"
            className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Users className="w-8 h-8 text-green-600 dark:text-green-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-slate-900 dark:text-white">View Workers</span>
          </Link>
          <Link
            to="/scheduling/stations"
            className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <MapPin className="w-8 h-8 text-orange-600 dark:text-orange-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-slate-900 dark:text-white">Manage Stations</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
