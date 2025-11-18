import { Calendar, Users, Clock, Repeat, AlertCircle, TrendingUp, Building2, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScheduleStats } from '@/hooks/schedulehub/useScheduleStats';

export default function ScheduleHubDashboard() {
  const { data: stats, isLoading } = useScheduleStats();

  const quickActions = [
    {
      title: 'Create Schedule',
      description: 'Build a new work schedule',
      href: '/schedulehub/schedules/create',
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Workers',
      description: 'View and edit workforce',
      href: '/schedulehub/workers',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Manage Stations',
      description: 'Configure workstations',
      href: '/schedulehub/stations',
      icon: Building2,
      color: 'bg-cyan-500',
    },
    {
      title: 'Manage Shift Roles',
      description: 'Define shift roles for scheduling',
      href: '/schedulehub/roles',
      icon: Briefcase,
      color: 'bg-violet-500',
    },
    {
      title: 'Time Off Requests',
      description: 'Review pending requests',
      href: '/schedulehub/time-off',
      icon: Clock,
      color: 'bg-purple-500',
    },
    {
      title: 'Shift Swaps',
      description: 'Manage shift marketplace',
      href: '/schedulehub/shift-swaps',
      icon: Repeat,
      color: 'bg-orange-500',
    },
  ];

  const statCards = [
    {
      title: 'Active Workers',
      value: stats?.activeWorkers || 0,
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      title: 'Published Schedules',
      value: stats?.publishedSchedules || 0,
      change: '+5%',
      trend: 'up' as const,
      icon: Calendar,
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingTimeOff || 0,
      change: '-3%',
      trend: 'down' as const,
      icon: AlertCircle,
    },
    {
      title: 'Open Shifts',
      value: stats?.openShifts || 0,
      change: '+8%',
      trend: 'up' as const,
      icon: Clock,
    },
  ];

  if (isLoading) {
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
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {stat.value}
                </p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <stat.icon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp
                className={`w-4 h-4 mr-1 ${
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                vs last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-500"
            >
              <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                {action.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {action.description}
              </p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
            </Link>
          ))}
        </div>
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

