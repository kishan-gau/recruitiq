import { MapPin, Users, Building2, TrendingUp } from 'lucide-react';
import StatisticsCard from '../ui/StatisticsCard';

interface LocationStatistics {
  locationId: string;
  locationName: string;
  totalEmployees: number;
  activeEmployees: number;
  departmentCount: number;
  attendanceRate: number;
  monthlyTrend: number;
}

interface LocationStatisticsProps {
  stats: LocationStatistics;
  onViewEmployees?: () => void;
}

export default function LocationStatistics({ stats, onViewEmployees }: LocationStatisticsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MapPin className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {stats.locationName}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          color="blue"
          onClick={onViewEmployees}
        />

        <StatisticsCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={Users}
          color="green"
          trend={{
            value: stats.monthlyTrend,
            label: 'vs last month',
            isPositive: stats.monthlyTrend > 0,
          }}
        />

        <StatisticsCard
          title="Departments"
          value={stats.departmentCount}
          icon={Building2}
          color="purple"
        />

        <StatisticsCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={TrendingUp}
          color={stats.attendanceRate >= 90 ? 'green' : stats.attendanceRate >= 75 ? 'orange' : 'red'}
        />
      </div>

      <div className="mt-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Employee Status Distribution
          </h4>
          <div className="flex items-center">
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${(stats.activeEmployees / stats.totalEmployees) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="ml-4 flex items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
                <span className="text-gray-600 dark:text-gray-400">
                  Active: {stats.activeEmployees}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full mr-1" />
                <span className="text-gray-600 dark:text-gray-400">
                  Inactive: {stats.totalEmployees - stats.activeEmployees}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
