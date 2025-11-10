/**
 * Dashboard Page
 * Main dashboard with statistics from all modules
 */

import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Calendar, 
  Award, 
  Target,
  Clock,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useContracts } from '@/hooks/useContracts';
import { useTimeOffRequests } from '@/hooks/useTimeOff';
import { useReviewStatistics, useGoalStatistics } from '@/hooks/usePerformance';
import { useDepartments } from '@/hooks/useDepartments';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBgColor, trend, loading }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          )}
          {trend && !loading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <TrendingUp size={16} className={trend.isPositive ? '' : 'rotate-180'} />
              <span>{trend.value}% from last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon size={24} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts({ status: 'active' });
  const { data: timeOffRequests = [], isLoading: timeOffLoading } = useTimeOffRequests({ status: 'pending' });
  const { data: reviewStats, isLoading: reviewStatsLoading } = useReviewStatistics();
  const { data: goalStats, isLoading: goalStatsLoading } = useGoalStatistics();
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments();

  const activeContracts = contracts.length;
  const pendingTimeOff = timeOffRequests.length;
  const activeEmployees = employees.filter(e => e.employmentStatus === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to Nexus HRIS - Overview of your organization
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={activeEmployees}
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
          loading={employeesLoading}
        />
        <StatCard
          title="Pending Time Off"
          value={pendingTimeOff}
          icon={Calendar}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          loading={timeOffLoading}
        />
        <StatCard
          title="Active Contracts"
          value={activeContracts}
          icon={FileText}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          loading={contractsLoading}
        />
        <StatCard
          title="Departments"
          value={departments.length}
          icon={Users}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          loading={departmentsLoading}
        />
      </div>

      {/* Performance & Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Reviews */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award size={20} />
              Performance Reviews
            </h2>
            <Link 
              to="/performance/reviews" 
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>
          
          {reviewStatsLoading ? (
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          ) : reviewStats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviewStats.totalReviews}</p>
                </div>
                <Clock size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {reviewStats.pendingReviews}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {reviewStats.completedReviews}
                  </p>
                </div>
              </div>

              {reviewStats.averageRating > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reviewStats.averageRating.toFixed(1)}
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 5.0</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Award className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No review data available</p>
              <Link 
                to="/performance/reviews/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Create Review
              </Link>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target size={20} />
              Employee Goals
            </h2>
            <Link 
              to="/performance/goals" 
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>
          
          {goalStatsLoading ? (
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          ) : goalStats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{goalStats.totalGoals}</p>
                </div>
                <Target size={32} className="text-green-600 dark:text-green-400" />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {goalStats.activeGoals}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {goalStats.completedGoals}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue</p>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {goalStats.overdueGoals}
                  </p>
                </div>
              </div>

              {goalStats.averageProgress > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Progress</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${goalStats.averageProgress}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white min-w-[48px]">
                      {Math.round(goalStats.averageProgress)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Target className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No goals data available</p>
              <Link 
                to="/performance/goals/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Create Goal
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Alerts & Notifications */}
      {(pendingTimeOff > 0 || (goalStats?.overdueGoals || 0) > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Action Required
          </h2>
          
          <div className="space-y-3">
            {pendingTimeOff > 0 && (
              <Link
                to="/time-off/requests?status=pending"
                className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="text-yellow-600 dark:text-yellow-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {pendingTimeOff} Pending Time Off Request{pendingTimeOff !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Review and approve employee requests
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-400" />
              </Link>
            )}

            {goalStats && goalStats.overdueGoals > 0 && (
              <Link
                to="/performance/goals?status=overdue"
                className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Target className="text-orange-600 dark:text-orange-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {goalStats.overdueGoals} Overdue Goal{goalStats.overdueGoals !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Goals that have passed their target date
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/employees/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">Add Employee</span>
          </Link>
          <Link
            to="/contracts/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">Create Contract</span>
          </Link>
          <Link
            to="/performance/reviews/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <Award className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">New Review</span>
          </Link>
          <Link
            to="/time-off/requests/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">Request Time Off</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

