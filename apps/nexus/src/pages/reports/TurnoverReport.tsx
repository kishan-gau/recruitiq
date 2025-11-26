/**
 * Turnover Report Page
 * Displays employee turnover analytics and trends
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  UserMinus,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter,
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

export default function TurnoverReport() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [filters, setFilters] = useState({
    department: '',
    location: '',
    turnoverType: '', // voluntary, involuntary, retirement
  });

  // Mock data - replace with actual API call
  const isLoading = false;
  const report = {
    summary: {
      totalTerminations: 45,
      turnoverRate: 12.5,
      voluntaryRate: 8.3,
      involuntaryRate: 4.2,
      trend: 'down',
      trendPercentage: 2.1,
    },
    byMonth: [
      { month: 'Jan', voluntary: 2, involuntary: 1, total: 3 },
      { month: 'Feb', voluntary: 3, involuntary: 2, total: 5 },
      { month: 'Mar', voluntary: 4, involuntary: 1, total: 5 },
      { month: 'Apr', voluntary: 3, involuntary: 2, total: 5 },
      { month: 'May', voluntary: 2, involuntary: 1, total: 3 },
      { month: 'Jun', voluntary: 4, involuntary: 2, total: 6 },
      { month: 'Jul', voluntary: 3, involuntary: 1, total: 4 },
      { month: 'Aug', voluntary: 2, involuntary: 2, total: 4 },
      { month: 'Sep', voluntary: 3, involuntary: 1, total: 4 },
      { month: 'Oct', voluntary: 4, involuntary: 2, total: 6 },
    ],
    byDepartment: [
      { name: 'Engineering', terminations: 12, rate: 10.5 },
      { name: 'Sales', terminations: 8, rate: 15.2 },
      { name: 'Marketing', terminations: 6, rate: 12.8 },
      { name: 'Operations', terminations: 10, rate: 11.3 },
      { name: 'HR', terminations: 5, rate: 14.1 },
      { name: 'Finance', terminations: 4, rate: 9.8 },
    ],
    byReason: [
      { reason: 'Better Opportunity', count: 18, percentage: 40 },
      { reason: 'Performance', count: 8, percentage: 17.8 },
      { reason: 'Personal Reasons', count: 7, percentage: 15.6 },
      { reason: 'Relocation', count: 5, percentage: 11.1 },
      { reason: 'Retirement', count: 4, percentage: 8.9 },
      { reason: 'Other', count: 3, percentage: 6.6 },
    ],
    topRisks: [
      { department: 'Sales', riskScore: 8.5, trend: 'up' },
      { department: 'Marketing', riskScore: 7.2, trend: 'stable' },
      { department: 'Customer Support', riskScore: 6.8, trend: 'down' },
    ],
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export turnover report');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Turnover Report</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze employee turnover trends and patterns
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="">All Departments</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Turnover Type
              </label>
              <select
                value={filters.turnoverType}
                onChange={(e) => setFilters({ ...filters, turnoverType: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="">All Types</option>
                <option value="voluntary">Voluntary</option>
                <option value="involuntary">Involuntary</option>
                <option value="retirement">Retirement</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Terminations</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {report.summary.totalTerminations}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <UserMinus className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Turnover Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {report.summary.turnoverRate}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                {report.summary.trend === 'down' ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      {report.summary.trendPercentage}% vs last period
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">
                      {report.summary.trendPercentage}% vs last period
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Voluntary Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {report.summary.voluntaryRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Involuntary Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {report.summary.involuntaryRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnover Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Turnover Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="voluntary"
                stroke="#10B981"
                strokeWidth={2}
                name="Voluntary"
              />
              <Line
                type="monotone"
                dataKey="involuntary"
                stroke="#EF4444"
                strokeWidth={2}
                name="Involuntary"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Turnover by Department */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Turnover by Department
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="terminations" fill="#EF4444" name="Terminations" />
              <Bar dataKey="rate" fill="#F59E0B" name="Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Termination Reasons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Termination Reasons
          </h3>
          <div className="space-y-4">
            {report.byReason.map((reason, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{reason.reason}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reason.count} ({reason.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Departments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            High Risk Departments
          </h3>
          <div className="space-y-4">
            {report.topRisks.map((risk, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{risk.department}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Risk Score: {risk.riskScore}/10
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {risk.trend === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : risk.trend === 'down' ? (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
