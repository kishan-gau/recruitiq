import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/contexts/ToastContext';
import { nexusApi } from '@/lib/api/nexus';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ArrowRight,
} from 'lucide-react';

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
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<TurnoverData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await nexusApi.reports.getTurnoverReport(
        dateRange.startDate,
        dateRange.endDate
      );
      setReportData(response.data);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || 'Failed to fetch turnover report'
      );
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    // TODO: Implement CSV/PDF export
    toast.info('Export functionality coming soon');
  };

  const formatRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Turnover Report</h1>
        <p className="mt-2 text-gray-600">
          Analyze employee turnover rates and trends
        </p>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchReport}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Overall Turnover Rate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Overall Turnover
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {formatRate(reportData.turnoverRate.overall)}
                    </h3>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      reportData.turnoverRate.overall > 15
                        ? 'bg-red-100'
                        : 'bg-green-100'
                    }`}
                  >
                    {reportData.turnoverRate.overall > 15 ? (
                      <TrendingUp className="h-6 w-6 text-red-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voluntary Turnover */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Voluntary Turnover
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {formatRate(reportData.turnoverRate.voluntary)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {reportData.terminations.voluntary} employees
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Involuntary Turnover */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Involuntary Turnover
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {formatRate(reportData.turnoverRate.involuntary)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {reportData.terminations.involuntary} employees
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            {/* Average Headcount */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg. Headcount
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {reportData.headcount.average.toFixed(0)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {reportData.headcount.startOfPeriod} → {reportData.headcount.endOfPeriod}
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Turnover Details</CardTitle>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
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
                <Alert>
                  <AlertDescription>
                    <strong>Insight:</strong>{' '}
                    {reportData.turnoverRate.overall > 15
                      ? 'Your turnover rate is above the industry average of 15%. Consider reviewing retention strategies.'
                      : 'Your turnover rate is within healthy range. Continue monitoring trends.'}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Report Generated
            </h3>
            <p className="text-gray-600">
              Select a date range and click "Generate Report" to view turnover data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
