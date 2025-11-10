/**
 * Time Off Balance Page
 * Displays employee time-off balances with detailed breakdown
 */

import { useState } from 'react';
import { Calendar, TrendingUp, User, Clock } from 'lucide-react';
import { useTimeOffBalances } from '@/hooks/useTimeOff';
import type { TimeOffType } from '@/types/timeOff.types';

const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: 'Vacation',
  sick: 'Sick Leave',
  personal: 'Personal',
  bereavement: 'Bereavement',
  maternity: 'Maternity',
  paternity: 'Paternity',
  unpaid: 'Unpaid',
};

const TIME_OFF_TYPE_COLORS: Record<TimeOffType, { bg: string; text: string; icon: string }> = {
  vacation: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-500',
  },
  sick: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    icon: 'bg-red-500',
  },
  personal: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'bg-purple-500',
  },
  bereavement: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'bg-gray-500',
  },
  maternity: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-600 dark:text-pink-400',
    icon: 'bg-pink-500',
  },
  paternity: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: 'bg-indigo-500',
  },
  unpaid: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'bg-yellow-500',
  },
};

export default function TimeOffBalance() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch balances
  const { data: balances = [], isLoading } = useTimeOffBalances(selectedYear);

  // Group balances by employee
  const employeeBalances = balances.reduce((acc, balance) => {
    const employeeId = balance.employeeId;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: balance.employee!,
        balances: [],
      };
    }
    acc[employeeId].balances.push(balance);
    return acc;
  }, {} as Record<string, { employee: NonNullable<typeof balances[0]['employee']>; balances: typeof balances }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Off Balances</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View employee time-off balances and usage
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Balances Grid */}
      {Object.keys(employeeBalances).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No balances found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Time-off balances will appear here once they are configured
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(employeeBalances).map(({ employee, balances: empBalances }) => (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Employee Header */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      #{employee.employeeNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balances Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {empBalances.map((balance) => {
                  const colors = TIME_OFF_TYPE_COLORS[balance.timeOffType];
                  const usagePercentage = (balance.used / balance.totalAllowance) * 100;
                  
                  return (
                    <div
                      key={balance.id}
                      className={`p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 ${colors.bg}`}
                    >
                      {/* Type Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`h-3 w-3 rounded-full ${colors.icon}`}></div>
                        <h4 className={`font-semibold ${colors.text}`}>
                          {TIME_OFF_TYPE_LABELS[balance.timeOffType]}
                        </h4>
                      </div>

                      {/* Stats Grid */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total Allowance:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {balance.totalAllowance} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Used:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {balance.used} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                          <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                            {balance.pending} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Clock size={14} />
                            Available:
                          </span>
                          <span className={`font-bold ${colors.text}`}>
                            {balance.available} days
                          </span>
                        </div>
                      </div>

                      {/* Usage Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>Usage</span>
                          <span>{usagePercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors.icon} transition-all duration-300`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {Object.keys(employeeBalances).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold mt-2">{Object.keys(employeeBalances).length}</p>
              </div>
              <User className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Days Available</p>
                <p className="text-3xl font-bold mt-2">
                  {balances.reduce((sum, b) => sum + b.available, 0)}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Days Used</p>
                <p className="text-3xl font-bold mt-2">
                  {balances.reduce((sum, b) => sum + b.used, 0)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
