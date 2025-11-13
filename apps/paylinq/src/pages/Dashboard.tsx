import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardSummaryCard from '@/components/ui/DashboardSummaryCard';
import PayrollTimeline from '@/components/ui/PayrollTimeline';
import type { TimelineRun } from '@/components/ui/PayrollTimeline';
import { formatCurrency } from '@/utils/helpers';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { paylinq } = usePaylinqAPI();
  const { error: showError } = useToast();
  
  // const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // setIsLoading(true);
        const data = await paylinq.getDashboard();
        
        if (data.success && data.data) {
          setDashboardData(data.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        showError(err.message || 'Failed to load dashboard data');
      } finally {
        // setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [paylinq, showError]);

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { summary, recentActivity, pendingApprovals } = dashboardData;
  
  // Format next payroll date
  const formatNextPayrollDate = (upcomingPayrolls: any[]) => {
    if (!upcomingPayrolls || upcomingPayrolls.length === 0) return 'Not scheduled';
    const nextPayroll = upcomingPayrolls[0];
    if (!nextPayroll.payment_date) return 'Not scheduled';
    return new Date(nextPayroll.payment_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const nextPayrollDate = formatNextPayrollDate(dashboardData.upcomingPayrolls || []);

  // Timeline data for payroll runs
  const timelineRuns: TimelineRun[] = [
    {
      id: '1',
      period: 'Oct 2024',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-15'),
      status: 'completed',
    },
    {
      id: '2',
      period: 'Nov 2024',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-15'),
      status: 'current',
    },
    {
      id: '3',
      period: 'Dec 2024',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-15'),
      status: 'upcoming',
    },
    {
      id: '4',
      period: 'Jan 2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-15'),
      status: 'upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome to Paylinq - Your Surinamese payroll management platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardSummaryCard
          title="Total Workers"
          value={summary.totalWorkers}
          icon={<Users />}
          variant="blue"
          trend={{ value: summary.workersTrend, label: 'vs last month' }}
        />
        <DashboardSummaryCard
          title="Next Payroll"
          value={`${summary.daysUntilPayroll} days`}
          icon={<Calendar />}
          variant="green"
        />
        <DashboardSummaryCard
          title="Pending Approvals"
          value={summary.pendingApprovals}
          icon={<Clock />}
          variant="yellow"
        />
        <DashboardSummaryCard
          title="Monthly Cost"
          value={formatCurrency(summary.monthlyCost)}
          icon={<DollarSign />}
          variant="purple"
          trend={{ value: summary.costTrend, label: 'vs last month' }}
        />
      </div>

      {/* Payroll Timeline */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payroll Timeline</h2>
          <button
            onClick={() => navigate('/payroll')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>View All Payroll Runs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <PayrollTimeline runs={timelineRuns} onSelect={(runId) => console.log('Selected run:', runId)} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Approvals</h2>
            <button
              onClick={() => navigate('/time-entries')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {pendingApprovals.map((approval: any, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{approval.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {approval.count} items • <span className={
                      approval.urgency === 'high' ? 'text-red-600 dark:text-red-400' :
                      approval.urgency === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-600 dark:text-gray-400'
                    }>{approval.urgency} priority</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate('/time-entries')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Payroll Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Next Payroll: {nextPayrollDate}
            </h3>
            <p className="mt-2 text-blue-700 dark:text-blue-300 text-sm">
              Due in <span className="font-medium">{summary.daysUntilPayroll} days</span> • Employees:{' '}
              <span className="font-medium">{summary.totalWorkers}</span> • Estimated Cost:{' '}
              <span className="font-medium">{formatCurrency(summary.monthlyCost)}</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/payroll')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
          >
            Process Payroll
          </button>
        </div>
      </div>
    </div>
  );
}

