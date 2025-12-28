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
import { useEmployees, useContracts, useTimeOff, usePerformance, useDepartments } from '../hooks';

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

export default function HRISDashboard() {
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts({ status: 'active' });
  const { data: timeOffRequests = [], isLoading: timeOffLoading } = useTimeOff({ status: 'pending' });
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments();

  const activeContracts = contracts.length;
  const pendingTimeOff = timeOffRequests.length;
  const activeEmployees = employees.filter((e: any) => e.employmentStatus === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to HRIS - Overview of your organization
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

      {/* Alerts & Notifications */}
      {pendingTimeOff > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Action Required
          </h2>
          
          <div className="space-y-3">
            <Link
              to="/hris/time-off?status=pending"
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
            to="/hris/employees/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">Add Employee</span>
          </Link>
          <Link
            to="/hris/contracts/new"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">Create Contract</span>
          </Link>
          <Link
            to="/hris/performance"
            className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <Award className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-gray-900 dark:text-white">New Review</span>
          </Link>
          <Link
            to="/hris/time-off"
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
