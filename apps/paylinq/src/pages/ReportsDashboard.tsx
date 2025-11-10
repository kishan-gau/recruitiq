/**
 * Reports Dashboard Page
 * 
 * Comprehensive reporting interface with:
 * - Summary metric cards
 * - Payroll trends chart
 * - Department breakdown chart
 * - Compensation type distribution
 * - Export functionality (CSV, PDF)
 * - Date range filtering
 */

import { useState } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Download,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { DateRangePicker } from '@/components/form';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import { formatDate } from '@/utils/dateFormat';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${!trend.isPositive && 'rotate-180'}`} />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500">
        {title}
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

function BarChart({ data, height = 300, color = '#3B82F6' }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
        <span>{maxValue.toLocaleString()}</span>
        <span>{(maxValue * 0.75).toLocaleString()}</span>
        <span>{(maxValue * 0.5).toLocaleString()}</span>
        <span>{(maxValue * 0.25).toLocaleString()}</span>
        <span>0</span>
      </div>

      {/* Chart area */}
      <div className="absolute left-16 right-0 top-0 bottom-8">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={`${(1 - ratio) * 100}%`}
              x2="100%"
              y2={`${(1 - ratio) * 100}%`}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * 100;
            const x = (index * barWidth) + (barWidth * 0.1);
            const width = barWidth * 0.8;

            return (
              <g key={index}>
                <rect
                  x={`${x}%`}
                  y={`${100 - barHeight}%`}
                  width={`${width}%`}
                  height={`${barHeight}%`}
                  fill={color}
                  rx="4"
                  className="transition-all hover:opacity-80"
                />
                <text
                  x={`${x + width / 2}%`}
                  y={`${100 - barHeight - 2}%`}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {item.value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-16 right-0 bottom-0 h-8 flex">
        {data.map((item, index) => (
          <div
            key={index}
            className="text-xs text-gray-500 text-center"
            style={{ width: `${barWidth}%` }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

function PieChart({ data, size = 200 }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Start at top

  const slices = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate path for pie slice
    const startX = size / 2 + (size / 2) * Math.cos((startAngle * Math.PI) / 180);
    const startY = size / 2 + (size / 2) * Math.sin((startAngle * Math.PI) / 180);
    const endX = size / 2 + (size / 2) * Math.cos((endAngle * Math.PI) / 180);
    const endY = size / 2 + (size / 2) * Math.sin((endAngle * Math.PI) / 180);
    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${size / 2} ${size / 2}`,
      `L ${startX} ${startY}`,
      `A ${size / 2} ${size / 2} 0 ${largeArc} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      path,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex items-center justify-center space-x-8">
      <svg width={size} height={size} className="transform -rotate-0">
        {slices.map((slice, index) => (
          <path
            key={index}
            d={slice.path}
            fill={slice.color}
            className="transition-all hover:opacity-80 cursor-pointer"
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="space-y-2">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-gray-700">
              {slice.label}: {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const [startDate, setStartDate] = useState<Date | null>(
    startOfMonth(subMonths(new Date(), 2))
  );
  const [endDate, setEndDate] = useState<Date | null>(
    endOfMonth(new Date())
  );

  const [isLoading] = useState(false);

  // Mock summary data (replace with real API calls when hooks are ready)
  const mockSummary = {
    totalPayroll: 445000,
    activeEmployees: 165,
    averageSalary: 2697,
    payrollRuns: 3,
  };

  // Mock data for charts (replace with real data from API)
  const monthlyPayrollData = [
    { label: 'Sep', value: 145000 },
    { label: 'Oct', value: 152000 },
    { label: 'Nov', value: 148000 },
  ];

  const departmentData = [
    { label: 'Engineering', value: 65000, color: '#3B82F6' },
    { label: 'Sales', value: 45000, color: '#10B981' },
    { label: 'Marketing', value: 25000, color: '#F59E0B' },
    { label: 'Operations', value: 18000, color: '#8B5CF6' },
  ];

  const compensationTypeData = [
    { label: 'Salary', value: 85, color: '#3B82F6' },
    { label: 'Hourly', value: 65, color: '#10B981' },
    { label: 'Commission', value: 15, color: '#F59E0B' },
  ];

  const handleExportCSV = () => {
    // Create CSV content
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Payroll', mockSummary.totalPayroll],
      ['Active Employees', mockSummary.activeEmployees],
      ['Average Salary', mockSummary.averageSalary],
      ['Date Range', `${startDate ? formatDate(startDate) : ''} - ${endDate ? formatDate(endDate) : ''}`],
    ].map(row => row.join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // In a real implementation, use a library like jsPDF
    alert('PDF export functionality would be implemented here using jsPDF or similar library');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports Dashboard</h1>
        <p className="text-sm text-gray-500">
          View and analyze payroll metrics and trends
        </p>
      </div>

      {/* Filters and Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[300px]">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              label="Report Period"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Payroll"
              value={
                <CurrencyDisplay
                  amount={mockSummary.totalPayroll}
                  currency="SRD"
                />
              }
              icon={<DollarSign className="w-6 h-6" />}
              color="blue"
              trend={{ value: 5.2, isPositive: true }}
            />
            <MetricCard
              title="Active Employees"
              value={mockSummary.activeEmployees}
              icon={<Users className="w-6 h-6" />}
              color="green"
              trend={{ value: 2.1, isPositive: true }}
            />
            <MetricCard
              title="Average Salary"
              value={
                <CurrencyDisplay
                  amount={mockSummary.averageSalary}
                  currency="SRD"
                />
              }
              icon={<TrendingUp className="w-6 h-6" />}
              color="purple"
              trend={{ value: 1.8, isPositive: true }}
            />
            <MetricCard
              title="Payroll Runs"
              value={mockSummary.payrollRuns}
              icon={<Calendar className="w-6 h-6" />}
              color="orange"
            />
          </div>

          {/* Monthly Payroll Trend */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
                  Monthly Payroll Trend
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Total payroll amount per month
                </p>
              </div>
            </div>
            <BarChart data={monthlyPayrollData} height={300} color="#3B82F6" />
          </div>

          {/* Department and Compensation Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
                  Payroll by Department
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Department-wise payroll distribution
                </p>
              </div>
              <BarChart data={departmentData} height={250} color="#10B981" />
            </div>

            {/* Compensation Type Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2 text-gray-600" />
                  Compensation Types
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Distribution of compensation structures
                </p>
              </div>
              <PieChart data={compensationTypeData} size={180} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
