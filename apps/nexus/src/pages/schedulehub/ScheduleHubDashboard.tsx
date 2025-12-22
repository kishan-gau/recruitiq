import { AlertCircle, TrendingUp, MapPin, CheckCircle, AlertTriangle, XCircle, Users, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScheduleStats } from '@/hooks/schedulehub/useScheduleStats';
import { useStations } from '@/hooks/schedulehub/useStations';
import { useMemo } from 'react';

export default function ScheduleHubDashboard() {
  const { data: stats, isLoading: statsLoading } = useScheduleStats();
  const { data: stations, isLoading: stationsLoading } = useStations();

  // Calculate station coverage statistics for manager priority view
  const stationCoverage = useMemo(() => {
    if (!stations || !Array.isArray(stations)) return null;
    
    const activeStations = stations.filter(station => station.isActive);
    const totalStations = activeStations.length;
    
    // Categorize stations by coverage status
    const fullyStaffed = activeStations.filter(station => 
      station.currentStaffing >= (station.requiredStaffing || 1)
    ).length;
    
    const understaffed = activeStations.filter(station => 
      station.currentStaffing > 0 && station.currentStaffing < (station.requiredStaffing || 1)
    ).length;
    
    const unstaffed = activeStations.filter(station => 
      (station.currentStaffing || 0) === 0
    ).length;

    const coveragePercentage = totalStations > 0 ? Math.round((fullyStaffed / totalStations) * 100) : 0;
    
    const criticalStations = activeStations.filter(station => 
      (station.currentStaffing || 0) === 0 || 
      (station.currentStaffing || 0) < (station.minimumStaffing || 1)
    );

    return {
      totalStations,
      fullyStaffed,
      understaffed,
      unstaffed,
      coveragePercentage,
      criticalStations,
      status: unstaffed > 0 ? 'critical' : understaffed > 0 ? 'warning' : 'good'
    };
  }, [stations]);



  const statCards = [
    // Station coverage as priority stat for managers
    {
      title: 'Station Coverage',
      value: stationCoverage ? `${stationCoverage.coveragePercentage}%` : '0%',
      subtitle: stationCoverage ? `${stationCoverage.fullyStaffed}/${stationCoverage.totalStations} stations` : '0/0 stations',
      change: stationCoverage?.status === 'critical' ? 'Critical' : 
              stationCoverage?.status === 'warning' ? 'Needs Attention' : 'Optimal',
      trend: stationCoverage?.status === 'critical' ? 'down' : 
             stationCoverage?.status === 'warning' ? 'neutral' : 'up',
      icon: MapPin,
      color: stationCoverage?.status === 'critical' ? 'text-red-600' : 
             stationCoverage?.status === 'warning' ? 'text-yellow-600' : 'text-green-600',
      bgColor: stationCoverage?.status === 'critical' ? 'bg-red-50' : 
               stationCoverage?.status === 'warning' ? 'bg-yellow-50' : 'bg-green-50'
    },
    {
      title: 'Active Workers',
      value: stats?.activeWorkers || 0,
      subtitle: 'Available for scheduling',
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Published Schedules',
      value: stats?.publishedSchedules || 0,
      subtitle: 'Current schedules',
      change: '+5%',
      trend: 'up' as const,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Open Shifts',
      value: stats?.openShifts || 0,
      subtitle: 'Need assignment',
      change: '+8%',
      trend: 'up' as const,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  if (statsLoading || stationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading dashboard"></div>
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

      {/* Station Coverage Breakdown - Priority for Managers */}
      {stationCoverage.status === 'critical' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                Critical Stations Need Attention
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {stationCoverage.criticalStations.length} stations are critically understaffed and need immediate action.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stationCoverage.criticalStations.slice(0, 6).map((station) => (
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
                    to="/schedulehub/stations"
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



      {/* Manager Scheduling Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Scheduling Overview
          </h2>
          <Link
            to="/schedulehub/stations"
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
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
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
              to="/schedulehub/schedules"
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
              to="/schedulehub/time-off"
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

