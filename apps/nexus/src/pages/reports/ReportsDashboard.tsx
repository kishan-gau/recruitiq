import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingDown,
  Calendar,
  Umbrella,
  HeartPulse,
  Target,
  FileText,
  BarChart3,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  permission: string;
  color: string;
}

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const reports: ReportCard[] = [
    {
      id: 'headcount',
      title: 'Headcount Analysis',
      description: 'Employee headcount by department, location, and status with trend analysis',
      icon: <Users className="h-8 w-8" />,
      path: '/reports/headcount',
      permission: 'reports:view',
      color: 'blue',
    },
    {
      id: 'turnover',
      title: 'Turnover Analysis',
      description: 'Employee turnover rates with voluntary vs involuntary breakdown',
      icon: <TrendingDown className="h-8 w-8" />,
      path: '/reports/turnover',
      permission: 'reports:view',
      color: 'red',
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'Attendance tracking with late arrivals, early departures, and absences',
      icon: <Calendar className="h-8 w-8" />,
      path: '/reports/attendance',
      permission: 'reports:view',
      color: 'green',
    },
    {
      id: 'time-off',
      title: 'Time-Off Report',
      description: 'Time-off usage by type, balance summaries, and pending requests',
      icon: <Umbrella className="h-8 w-8" />,
      path: '/reports/time-off',
      permission: 'reports:view',
      color: 'purple',
    },
    {
      id: 'benefits',
      title: 'Benefits Report',
      description: 'Benefits enrollment statistics, cost analysis, and plan utilization',
      icon: <HeartPulse className="h-8 w-8" />,
      path: '/reports/benefits',
      permission: 'reports:view',
      color: 'pink',
    },
    {
      id: 'performance',
      title: 'Performance Report',
      description: 'Review completion rates, goal achievement, and competency scores',
      icon: <Target className="h-8 w-8" />,
      path: '/reports/performance',
      permission: 'reports:view',
      color: 'indigo',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      hover: 'hover:bg-blue-50',
      border: 'border-blue-200',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      hover: 'hover:bg-red-50',
      border: 'border-red-200',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      hover: 'hover:bg-green-50',
      border: 'border-green-200',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      hover: 'hover:bg-purple-50',
      border: 'border-purple-200',
    },
    pink: {
      bg: 'bg-pink-100',
      text: 'text-pink-600',
      hover: 'hover:bg-pink-50',
      border: 'border-pink-200',
    },
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      hover: 'hover:bg-indigo-50',
      border: 'border-indigo-200',
    },
  };

  const accessibleReports = reports.filter((report) =>
    hasPermission(report.permission)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Access comprehensive reports and analytics for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-3 bg-blue-100 rounded-full">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Reports</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {accessibleReports.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Report Categories</p>
              <p className="text-3xl font-bold text-green-600 mt-2">6</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Export Formats</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">2</p>
              <p className="text-xs text-gray-500 mt-1">CSV & PDF</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {accessibleReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleReports.map((report) => {
            const colors = colorClasses[report.color as keyof typeof colorClasses];
            return (
              <button
                key={report.id}
                onClick={() => navigate(report.path)}
                className={`bg-white rounded-lg shadow border-2 ${colors.border} p-6 text-left transition-all ${colors.hover} hover:shadow-lg`}
              >
                <div className={`inline-flex p-3 rounded-lg ${colors.bg} mb-4`}>
                  <div className={colors.text}>{report.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {report.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
                  View Report
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Reports Available
          </h3>
          <p className="text-gray-600">
            You don't have permission to view any reports. Contact your
            administrator for access.
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              About Reports
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Each report provides comprehensive insights into different aspects of
              your organization. Use the filters and date ranges to customize your
              view, and export data in CSV or PDF format for further analysis.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                All reports support date range filtering
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                Export functionality available for all reports
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                Interactive charts and visualizations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                Real-time data updates
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

