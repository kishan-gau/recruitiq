import { useState } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface TurnoverData {
  period: {
    startDate: string;
    endDate: string;
  };
  headcount: {
    startOfPeriod: number;
    endOfPeriod: number;
    average: number;
  };
  terminations: {
    total: number;
    voluntary: number;
    involuntary: number;
  };
  hires: {
    total: number;
  };
  turnoverRate: {
    overall: number;
    voluntary: number;
    involuntary: number;
  };
  byDepartment?: Array<{
    departmentId: string;
    departmentName: string;
    turnoverRate: number;
    terminations: number;
    headcount: number;
  }>;
}

export default function TurnoverReport() {
  const [loading, setLoading] = useState(false);
  const [reportData] = useState<TurnoverData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchReport = async () => {
    setLoading(true);
    // TODO: Implement API call when backend endpoint is ready
    // const response = await nexusApi.reports.getTurnoverReport(dateRange.startDate, dateRange.endDate);
    // setReportData(response.data);
    setLoading(false);
  };

  const exportReport = () => {
    if (!reportData) return;
    // TODO: Implement CSV/PDF export
    console.log('Export report');
  };

  const formatRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Turnover Report</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Analyze employee turnover rates and trends
          </p>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Period</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Overall Turnover Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overall Turnover
                  </p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatRate(reportData.turnoverRate.overall)}
                  </h3>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    reportData.turnoverRate.overall > 15
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-green-100 dark:bg-green-900/20'
                  }`}
                >
                  {reportData.turnoverRate.overall > 15 ? (
                    <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Voluntary Turnover */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Voluntary Turnover
                  </p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatRate(reportData.turnoverRate.voluntary)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {reportData.terminations.voluntary} employees
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Involuntary Turnover */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Involuntary Turnover
                  </p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatRate(reportData.turnoverRate.involuntary)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {reportData.terminations.involuntary} employees
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>

            {/* Average Headcount */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg. Headcount
                  </p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {reportData.headcount.average.toFixed(0)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {reportData.headcount.startOfPeriod} → {reportData.headcount.endOfPeriod}
                  </p>
                </div>
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Turnover Details</h2>
              <button
                onClick={exportReport}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Period Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Period</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(reportData.period.startDate).toLocaleDateString()} -{' '}
                      {new Date(reportData.period.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Terminations
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {reportData.terminations.total} employees
                    </p>
                  </div>
                </div>

                {/* By Department */}
                {reportData.byDepartment && reportData.byDepartment.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Turnover by Department
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Turnover Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Terminations
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Headcount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.byDepartment.map((dept) => (
                            <tr key={dept.departmentId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dept.departmentName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    dept.turnoverRate > 15
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {formatRate(dept.turnoverRate)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {dept.terminations}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {dept.headcount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Insights */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Insight:</strong>{' '}
                    {reportData.turnoverRate.overall > 15
                      ? 'Your turnover rate is above the industry average of 15%. Consider reviewing retention strategies.'
                      : 'Your turnover rate is within healthy range. Continue monitoring trends.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Report Generated
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select a date range and click "Generate Report" to view turnover data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
