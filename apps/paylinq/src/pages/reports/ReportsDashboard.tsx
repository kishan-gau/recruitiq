import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Tabs, Badge } from '@/components/ui';
import type { Tab } from '@/components/ui';
import ReportConfigModal from '@/components/modals/ReportConfigModal';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'payroll' | 'tax' | 'time' | 'compliance';
  frequency: 'monthly' | 'quarterly' | 'annual' | 'on-demand';
  lastGenerated?: string;
}

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const reports: ReportCard[] = [
    {
      id: 'payroll-summary',
      title: 'Payroll Summary Report',
      description: 'Comprehensive overview of payroll runs, gross/net pay, and deductions',
      icon: <DollarSign className="w-6 h-6" />,
      category: 'payroll',
      frequency: 'monthly',
      lastGenerated: '2025-11-01',
    },
    {
      id: 'tax-summary',
      title: 'Tax Summary Report',
      description: 'Wage Tax, AOV, and AWW contributions for all employees',
      icon: <FileText className="w-6 h-6" />,
      category: 'tax',
      frequency: 'monthly',
      lastGenerated: '2025-11-01',
    },
    {
      id: 'employee-earnings',
      title: 'Employee Earnings Statement',
      description: 'Individual earnings breakdown with YTD totals',
      icon: <Users className="w-6 h-6" />,
      category: 'payroll',
      frequency: 'on-demand',
      lastGenerated: '2025-10-28',
    },
    {
      id: 'time-attendance',
      title: 'Time & Attendance Report',
      description: 'Hours worked, overtime, and absence tracking',
      icon: <Clock className="w-6 h-6" />,
      category: 'time',
      frequency: 'monthly',
      lastGenerated: '2025-11-01',
    },
    {
      id: 'labor-cost',
      title: 'Labor Cost Analysis',
      description: 'Department-wise labor costs and trends',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'payroll',
      frequency: 'monthly',
      lastGenerated: '2025-10-31',
    },
    {
      id: 'tax-declaration',
      title: 'Monthly Tax Declaration',
      description: 'Official tax declaration form for submission',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      category: 'tax',
      frequency: 'monthly',
      lastGenerated: '2025-10-31',
    },
    {
      id: 'aov-aww-report',
      title: 'AOV/AWW Contributions',
      description: 'Social security contributions report',
      icon: <BarChart3 className="w-6 h-6" />,
      category: 'tax',
      frequency: 'monthly',
      lastGenerated: '2025-11-01',
    },
    {
      id: 'deductions-report',
      title: 'Deductions Report',
      description: 'All employee deductions breakdown',
      icon: <PieChart className="w-6 h-6" />,
      category: 'payroll',
      frequency: 'monthly',
      lastGenerated: '2025-11-01',
    },
    {
      id: 'annual-income',
      title: 'Annual Income Statement',
      description: 'Year-end income statement for tax purposes',
      icon: <FileText className="w-6 h-6" />,
      category: 'compliance',
      frequency: 'annual',
    },
    {
      id: 'payroll-register',
      title: 'Payroll Register',
      description: 'Detailed payroll register for audit purposes',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      category: 'compliance',
      frequency: 'on-demand',
      lastGenerated: '2025-10-15',
    },
  ];

  // Define tabs
  const tabs: Tab[] = [
    { id: 'all', label: 'All Reports', count: reports.length },
    { id: 'payroll', label: 'Payroll', count: reports.filter((r) => r.category === 'payroll').length },
    { id: 'tax', label: 'Tax', count: reports.filter((r) => r.category === 'tax').length },
    { id: 'time', label: 'Time & Attendance', count: reports.filter((r) => r.category === 'time').length },
    { id: 'compliance', label: 'Compliance', count: reports.filter((r) => r.category === 'compliance').length },
  ];

  // Filter reports
  const filteredReports = activeTab === 'all' ? reports : reports.filter((r) => r.category === activeTab);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'payroll':
        return 'blue';
      case 'tax':
        return 'red';
      case 'time':
        return 'green';
      case 'compliance':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const handleGenerateReport = (reportId: string) => {
    console.log('Generate report:', reportId);
    // Implement report generation
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Generate payroll reports and analytics
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Download className="w-5 h-5" />
          <span>Export Center</span>
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reporting Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="current-month">Current Month (November 2025)</option>
            <option value="last-month">Last Month (October 2025)</option>
            <option value="current-quarter">Current Quarter (Q4 2025)</option>
            <option value="last-quarter">Last Quarter (Q3 2025)</option>
            <option value="ytd">Year to Date (2025)</option>
            <option value="last-year">Last Year (2024)</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow"
          >
            {/* Icon and Category */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-${getCategoryColor(report.category)}-100 dark:bg-${getCategoryColor(report.category)}-900/20 text-${getCategoryColor(report.category)}-600 dark:text-${getCategoryColor(report.category)}-400`}>
                {report.icon}
              </div>
              <Badge variant={getCategoryColor(report.category) as any} size="sm">
                {report.frequency}
              </Badge>
            </div>

            {/* Title and Description */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{report.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{report.description}</p>

            {/* Last Generated */}
            {report.lastGenerated && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleGenerateReport(report.id)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Generate
              </button>
              <button className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Reports Generated</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">127</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled Reports</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">8</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automated</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Export Formats</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">5</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, Excel, CSV, JSON, XML</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Storage Used</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">2.4 GB</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 12 months</p>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 All reports are generated in real-time using the selected period. You can schedule recurring reports or
          generate them on-demand. Exports are available in multiple formats.
        </p>
      </div>

      {/* Report Config Modal */}
      <ReportConfigModal
        isOpen={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        reportType={selectedReport}
      />
    </div>
  );
}
