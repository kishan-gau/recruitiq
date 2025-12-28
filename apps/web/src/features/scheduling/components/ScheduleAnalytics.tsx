/**
 * ScheduleHub Analytics Component
 * 
 * Provides comprehensive analytics and reporting for ScheduleHub including:
 * - Station coverage analytics
 * - Worker utilization metrics
 * - Schedule performance indicators
 * - Staffing trend analysis
 * - Cost analysis dashboard
 * 
 * @component
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin, 
  Clock, 
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { useScheduleStats } from '@/hooks/schedulehub/useScheduleStats';
import { useStations } from '@/hooks/schedulehub/useStations';
import { useRoles } from '@/hooks/schedulehub/useRoles';
import { useErrorHandler } from '@/utils/errorHandler';

interface AnalyticsTimeframe {
  label: string;
  value: string;
  days: number;
}

const timeframes: AnalyticsTimeframe[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 6 months', value: '6m', days: 180 },
  { label: 'Last year', value: '1y', days: 365 }
];

export default function ScheduleAnalytics() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleError = useErrorHandler();

  // Data hooks
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useScheduleStats();
  const { data: stations, isLoading: stationsLoading } = useStations();
  const { data: roles, isLoading: rolesLoading } = useRoles();

  const isLoading = statsLoading || stationsLoading || rolesLoading;

  // Analytics calculations
  const analyticsData = useMemo(() => {
    if (!stats || !stations || !roles) return null;

    const activeStations = stations.filter(station => station.isActive);
    const activeRoles = roles.filter(role => role.isActive);

    // Station coverage metrics
    const totalStations = activeStations.length;
    const fullyStaffed = activeStations.filter(station => 
      station.currentStaffing >= (station.requiredStaffing || 1)
    ).length;
    const coverageRate = totalStations > 0 ? (fullyStaffed / totalStations) * 100 : 0;

    // Worker utilization metrics
    const totalWorkers = stats.activeWorkers || 0;
    const utilizationRate = totalWorkers > 0 ? ((stats.scheduledHours || 0) / (totalWorkers * 40)) * 100 : 0;

    // Schedule efficiency metrics
    const scheduleCompliance = stats.scheduleCompliance || 0;
    const onTimeRate = stats.onTimeRate || 0;

    // Cost metrics (estimated)
    const avgHourlyRate = activeRoles.reduce((sum, role) => sum + (role.hourlyRate || 0), 0) / activeRoles.length || 0;
    const estimatedCost = (stats.scheduledHours || 0) * avgHourlyRate;

    return {
      coverage: {
        rate: coverageRate,
        fullyStaffed,
        totalStations,
        trend: coverageRate >= 90 ? 'good' : coverageRate >= 75 ? 'warning' : 'critical'
      },
      utilization: {
        rate: utilizationRate,
        scheduledHours: stats.scheduledHours || 0,
        totalWorkers,
        trend: utilizationRate >= 85 ? 'good' : utilizationRate >= 70 ? 'warning' : 'low'
      },
      efficiency: {
        compliance: scheduleCompliance,
        onTime: onTimeRate,
        trend: scheduleCompliance >= 95 ? 'excellent' : scheduleCompliance >= 85 ? 'good' : 'needs-improvement'
      },
      cost: {
        estimated: estimatedCost,
        avgHourlyRate,
        trend: 'neutral'
      }
    };
  }, [stats, stations, roles]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchStats();
    } catch (error) {
      handleError(error, 'Failed to refresh analytics data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportReport = () => {
    // TODO: Implement report export functionality
    console.log('Exporting analytics report...');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Schedule Analytics
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Comprehensive workforce scheduling insights and performance metrics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeframes.map((timeframe) => (
              <option key={timeframe.value} value={timeframe.value}>
                {timeframe.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportReport}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Station Coverage */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Station Coverage
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyticsData.coverage.rate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className={`flex items-center ${
                analyticsData.coverage.trend === 'good' ? 'text-green-600' :
                analyticsData.coverage.trend === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {analyticsData.coverage.trend === 'good' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : analyticsData.coverage.trend === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {analyticsData.coverage.fullyStaffed}/{analyticsData.coverage.totalStations} stations fully staffed
            </p>
          </div>

          {/* Worker Utilization */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Worker Utilization
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyticsData.utilization.rate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className={`flex items-center ${
                analyticsData.utilization.trend === 'good' ? 'text-green-600' :
                analyticsData.utilization.trend === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {analyticsData.utilization.scheduledHours.toLocaleString()} hours scheduled
            </p>
          </div>

          {/* Schedule Efficiency */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Schedule Compliance
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {analyticsData.efficiency.compliance.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className={`flex items-center ${
                analyticsData.efficiency.trend === 'excellent' ? 'text-green-600' :
                analyticsData.efficiency.trend === 'good' ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {analyticsData.efficiency.onTime.toFixed(1)}% on-time attendance
            </p>
          </div>

          {/* Cost Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Estimated Cost
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${analyticsData.cost.estimated.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-slate-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Avg ${analyticsData.cost.avgHourlyRate.toFixed(2)}/hour
            </p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Trends Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Station Coverage Trends
            </h2>
            <Link
              to="/schedulehub/stations"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Stations
            </Link>
          </div>
          
          {/* Placeholder for chart */}
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <div className="text-center">
              <BarChart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coverage trends chart
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Chart implementation pending
              </p>
            </div>
          </div>
        </div>

        {/* Utilization Trends Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Worker Utilization Trends
            </h2>
            <Link
              to="/schedulehub/workers"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Workers
            </Link>
          </div>
          
          {/* Placeholder for chart */}
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Utilization trends chart
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Chart implementation pending
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Station Performance */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Station Performance
          </h2>
          
          <div className="space-y-3">
            {stations?.slice(0, 5).map((station) => (
              <div
                key={station.id}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {station.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {station.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {station.currentStaffing || 0}/{station.requiredStaffing || 0}
                  </p>
                  <p className={`text-xs ${
                    (station.currentStaffing || 0) >= (station.requiredStaffing || 1)
                      ? 'text-green-600'
                      : (station.currentStaffing || 0) > 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {(station.currentStaffing || 0) >= (station.requiredStaffing || 1)
                      ? 'Fully Staffed'
                      : (station.currentStaffing || 0) > 0
                      ? 'Understaffed'
                      : 'Unstaffed'
                    }
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                No station data available
              </p>
            )}
          </div>
          
          {stations && stations.length > 5 && (
            <div className="mt-4 text-center">
              <Link
                to="/schedulehub/stations"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View all {stations.length} stations →
              </Link>
            </div>
          )}
        </div>

        {/* Role Utilization */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Role Utilization
          </h2>
          
          <div className="space-y-3">
            {roles?.slice(0, 5).map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: role.color || '#6b7280' }}
                    />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {role.name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {role.skillLevel} • ${role.hourlyRate || 0}/hr
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {role.workerCount || 0} workers
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {role.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                No role data available
              </p>
            )}
          </div>
          
          {roles && roles.length > 5 && (
            <div className="mt-4 text-center">
              <Link
                to="/schedulehub/roles"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View all {roles.length} roles →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}