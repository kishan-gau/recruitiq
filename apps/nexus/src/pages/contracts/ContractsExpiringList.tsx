/**
 * Contracts Expiring List Page
 * Displays contracts that are expiring soon with filtering and alerts
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  User,
  FileText,
  Clock,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { useExpiringContracts } from '@/hooks/useContracts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type TimeFrame = '30' | '60' | '90' | 'all';

const TIMEFRAME_CONFIG = {
  '30': { label: '30 Days', days: 30, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  '60': { label: '60 Days', days: 60, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  '90': { label: '90 Days', days: 90, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  'all': { label: 'All', days: undefined, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
};

export default function ContractsExpiringList() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('30');
  const [showFilters, setShowFilters] = useState(false);

  const { data: contracts, isLoading } = useExpiringContracts(
    TIMEFRAME_CONFIG[selectedTimeframe].days
  );

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyLevel = (daysUntilExpiry: number): 'critical' | 'warning' | 'normal' => {
    if (daysUntilExpiry <= 30) return 'critical';
    if (daysUntilExpiry <= 60) return 'warning';
    return 'normal';
  };

  const getUrgencyClassName = (level: 'critical' | 'warning' | 'normal') => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const sortedContracts = [...(contracts || [])].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.endDate);
    const daysB = getDaysUntilExpiry(b.endDate);
    return daysA - daysB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expiring Contracts</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage contracts that are approaching expiration
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Filter size={20} />
          Filters
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(Object.keys(TIMEFRAME_CONFIG) as TimeFrame[]).map((timeframe) => {
          const config = TIMEFRAME_CONFIG[timeframe];
          const count = timeframe === 'all' 
            ? contracts?.length || 0
            : contracts?.filter(c => getDaysUntilExpiry(c.endDate) <= (config.days || Infinity)).length || 0;

          return (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTimeframe === timeframe
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {config.label}
                </span>
                <AlertTriangle
                  size={20}
                  className={selectedTimeframe === timeframe ? 'text-emerald-600' : 'text-gray-400'}
                />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {count}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {timeframe === 'all' ? 'Total expiring' : 'Expiring soon'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Contracts List */}
      {sortedContracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No expiring contracts
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            There are no contracts expiring in the selected timeframe.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedContracts.map((contract) => {
            const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
            const urgencyLevel = getUrgencyLevel(daysUntilExpiry);
            const urgencyClassName = getUrgencyClassName(urgencyLevel);

            return (
              <div
                key={contract.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 ${urgencyClassName}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Contract Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {contract.contractType} Contract
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <User size={16} className="text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {contract.employee?.firstName} {contract.employee?.lastName}
                              </span>
                              {contract.employee?.jobTitle && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {contract.employee.jobTitle}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/contracts/${contract.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            View Details
                            <ExternalLink size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Contract Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          <Calendar size={14} />
                          {format(new Date(contract.startDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          <Calendar size={14} />
                          {format(new Date(contract.endDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Days Until Expiry</p>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={urgencyLevel === 'critical' ? 'text-red-600' : 'text-gray-400'} />
                          <span className={`text-sm font-bold ${
                            urgencyLevel === 'critical'
                              ? 'text-red-600 dark:text-red-400'
                              : urgencyLevel === 'warning'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    <div className="mt-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${urgencyClassName}`}
                      >
                        <AlertTriangle size={14} />
                        {urgencyLevel === 'critical'
                          ? 'Critical - Expiring Soon'
                          : urgencyLevel === 'warning'
                          ? 'Warning - Expiring in 30-60 Days'
                          : 'Notice - Expiring in 60-90 Days'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
