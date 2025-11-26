/**
 * Headcount Report Page
 * Displays employee headcount analytics and trends
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  UserCheck,
  Filter,
  Download,
  Calendar,
} from 'lucide-react';
import { useHeadcountReport } from '@/hooks/useReports';
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

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];

export default function HeadcountReport() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 6)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: report, isLoading } = useHeadcountReport(dateRange.startDate, dateRange.endDate);

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export report');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!report) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No data available</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          No headcount data found for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Headcount Report</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Analyze employee headcount trends and distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-400" />
          <div className="flex items-center gap-4 flex-1">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Headcount</span>
            <Users size={20} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{report.totalHeadcount}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Active employees</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">New Hires</span>
            <UserCheck size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{report.newHires}</div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={14} className="text-green-600" />
            <span className="text-xs text-green-600">+{report.hireGrowthRate}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Terminations</span>
            <TrendingDown size={20} className="text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{report.terminations}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This period</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</span>
            <Building2 size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {report.byDepartment?.length || 0}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Active departments</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Headcount Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={report.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="headcount" stroke="#10B981" strokeWidth={2} name="Total Headcount" />
            <Line type="monotone" dataKey="hires" stroke="#3B82F6" strokeWidth={2} name="New Hires" />
            <Line type="monotone" dataKey="terminations" stroke="#EF4444" strokeWidth={2} name="Terminations" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">By Department</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="department" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
              />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">By Location</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report.byLocation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {report.byLocation?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employment Type Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">By Employment Type</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report.byEmploymentType} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" />
            <YAxis dataKey="type" type="category" stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
