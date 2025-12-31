import { 
  Calendar,
  Users,
  MapPin,
  BarChart3,
  Clock,
  Settings,
  Plus,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { useErrorHandler } from '@/hooks';
import { useScheduleStats, useStations } from '@/hooks';
import { ScheduleAnalytics } from '@features/scheduling/components';

export default function ScheduleHubPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useScheduleStats();
  const { data: stations, isLoading: stationsLoading, error: stationsError } = useStations();
  const handleError = useErrorHandler();

  // Handle errors
  React.useEffect(() => {
    if (statsError) handleError(statsError);
    if (stationsError) handleError(stationsError);
  }, [statsError, stationsError, handleError]);

  // Calculate station coverage
  const stationCoverage = React.useMemo(() => {
    if (!stations || !Array.isArray(stations)) {
      return {
        fullyStaffed: 0,
        understaffed: 0,
        unstaffed: 0,
        total: 0,
        coverage: 0,
        status: 'unknown',
        criticalStations: []
      };
    }

    const fullyStaffed = stations.filter(station => 
      (station.currentStaffing || 0) >= (station.requiredStaffing || 1)
    ).length;
    
    const understaffed = stations.filter(station => {
      const current = station.currentStaffing || 0;
      const required = station.requiredStaffing || 1;
      return current > 0 && current < required;
    }).length;
    
    const unstaffed = stations.filter(station => 
      (station.currentStaffing || 0) === 0
    ).length;

    const total = stations.length;
    const coverage = total > 0 ? (fullyStaffed / total) * 100 : 0;
    
    let status = 'good';
    if (coverage < 60) status = 'critical';
    else if (coverage < 80) status = 'warning';

    const criticalStations = stations.filter(station => 
      (station.currentStaffing || 0) === 0 || 
      ((station.currentStaffing || 0) / (station.requiredStaffing || 1)) < 0.5
    );

    return {
      fullyStaffed,
      understaffed,
      unstaffed,
      total,
      coverage,
      status,
      criticalStations
    };
  }, [stations]);

  // Quick stats for dashboard overview
  const quickStats = [
    {
      title: 'Station Coverage',
      value: `${stationCoverage.coverage.toFixed(1)}%`,
      icon: MapPin,
      change: '+5.2%',
      trend: 'up',
      color: stationCoverage.status === 'good' ? 'text-green-600' : 
             stationCoverage.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
    },
    {
      title: 'Active Workers',
      value: stats?.activeWorkers || '0',
      icon: Users,
      change: '+12',
      trend: 'up',
      color: 'text-blue-600'
    },
    {
      title: 'Published Schedules',
      value: stats?.publishedSchedules || '0',
      icon: Calendar,
      change: '+3',
      trend: 'up',
      color: 'text-emerald-600'
    },
    {
      title: 'Open Shifts',
      value: stats?.openShifts || '0',
      icon: Clock,
      change: '-8',
      trend: 'down',
      color: 'text-purple-600'
    }
  ];

  const quickActions = [
    {
      title: 'Create Schedule',
      description: 'Build new shift schedules',
      icon: Calendar,
      to: '/scheduling/schedules/new',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Manage Workers',
      description: 'View and assign workers',
      icon: Users,
      to: '/scheduling/workers',
      color: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      title: 'Station Setup',
      description: 'Configure stations',
      icon: MapPin,
      to: '/scheduling/stations',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'Time Off Requests',
      description: 'Review pending requests',
      icon: Clock,
      to: '/scheduling/time-off',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  if (statsLoading || stationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            ScheduleHub
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage workforce scheduling, stations, and shift planning
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link
            to="/scheduling/analytics"
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Link>
          <Link
            to="/scheduling/settings"
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
          <Link
            to="/scheduling/schedules/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  vs last month
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Stations Alert */}
      {stationCoverage.status === 'critical' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                Critical Stations Need Attention
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {stationCoverage.criticalStations.length} stations are critically understaffed and need immediate action.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stationCoverage.criticalStations.slice(0, 6).map((station: any) => (
                  <div
                    key={station.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-red-200 dark:border-red-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {station.name}
                      </span>
                      <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                        {station.currentStaffing || 0}/{station.requiredStaffing || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {station.location}
                    </p>
                  </div>
                ))}
              </div>
              {stationCoverage.criticalStations.length > 6 && (
                <div className="mt-3">
                  <Link
                    to="/scheduling/stations"
                    className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    View all {stationCoverage.criticalStations.length} critical stations →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className={`${action.color} text-white rounded-lg p-6 transition-colors group`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <action.icon className="w-6 h-6" />
                <h3 className="font-semibold text-lg">
                  {action.title}
                </h3>
              </div>
              <p className="text-white/80 text-sm">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Scheduling Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Scheduling Overview
          </h2>
          <Link
            to="/scheduling/stations"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Manage Stations
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stationCoverage.fullyStaffed}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Fully Staffed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stationCoverage.understaffed}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Understaffed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stationCoverage.unstaffed}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Unstaffed</p>
          </div>
        </div>
        {stationCoverage.status !== 'good' && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <strong>Next Actions:</strong> 
              {stationCoverage.status === 'critical' 
                ? ' Focus on staffing critical stations immediately to maintain operations.'
                : ' Review understaffed stations and consider adjusting schedules or adding shifts.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Upcoming Shifts
            </h2>
            <Link
              to="/scheduling/schedules"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.upcomingShifts?.slice(0, 5).map((shift: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {shift.roleName || 'Unassigned'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(shift.shiftDate).toLocaleDateString()} • {shift.startTime} -{' '}
                    {shift.endTime}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    shift.status === 'confirmed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {shift.status}
                </span>
              </div>
            )) || (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                No upcoming shifts
              </p>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Approvals
            </h2>
            <Link
              to="/scheduling/time-off"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.pendingApprovals?.slice(0, 5).map((request: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {request.workerName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {request.requestType} • {new Date(request.startDate).toLocaleDateString()}
                  </p>
                </div>
                <button className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                  Review
                </button>
              </div>
            )) || (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                No pending approvals
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}