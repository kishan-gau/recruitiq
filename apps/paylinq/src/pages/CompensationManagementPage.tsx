/**
 * Compensation Management Page
 * 
 * Manage employee compensation with:
 * - Current compensation display
 * - Compensation history timeline
 * - Quick actions (change compensation, view details)
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  History,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  useCurrentCompensation,
  useCompensationHistory,
  useCompensationSummary,
} from '@/hooks/useCompensation';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import { formatDate, getRelativeTime } from '@/utils/dateFormat';
import type { CompensationType } from '@recruitiq/types';

const COMPENSATION_TYPE_COLORS: Record<CompensationType, string> = {
  hourly: 'bg-blue-100 text-blue-800',
  salary: 'bg-green-100 text-green-800',
  commission: 'bg-purple-100 text-purple-800',
  bonus: 'bg-orange-100 text-orange-800',
};

interface CompensationManagementPageProps {
  employeeId?: string;
}

export default function CompensationManagementPage({ employeeId: propEmployeeId }: CompensationManagementPageProps = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const employeeId = propEmployeeId || searchParams.get('employeeId') || '';

  const [showAllHistory, setShowAllHistory] = useState(false);

  // Fetch data
  const { data: currentCompensationResponse, isLoading: isLoadingCurrent, error: currentError } = 
    useCurrentCompensation(employeeId);
  const { data: history = [], isLoading: isLoadingHistory } = 
    useCompensationHistory(employeeId);
  const { data: summary, isLoading: isLoadingSummary } = 
    useCompensationSummary(employeeId);

  // Extract compensation data and context from the response
  const currentCompensation = currentCompensationResponse?.compensation || null;
  const compensationMessage = currentCompensationResponse?.message;
  const hasCompensationHistory = currentCompensationResponse?.hasHistory;
  const availableRecords = currentCompensationResponse?.availableRecords || 0;

  const handleChangeCompensation = () => {
    navigate(`/compensation/create?employeeId=${employeeId}`);
  };

  const displayHistory = showAllHistory ? history : history.slice(0, 5);

  if (!employeeId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-700">Please select an employee to view compensation</p>
        </div>
      </div>
    );
  }

  if (isLoadingCurrent || isLoadingSummary) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium mb-2">Unable to load compensation data</p>
          <p className="text-red-600 text-sm">Please try again or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compensation Management</h1>
          {currentCompensation?.employeeName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
              <User className="w-4 h-4 mr-1" />
              {currentCompensation.employeeName}
            </p>
          )}
        </div>
        
        <button
          onClick={handleChangeCompensation}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Change Compensation
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Years of Service */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {summary?.totalYearsOfService?.toFixed(1) || '0'} years
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Years of Service</div>
        </div>

        {/* Compensation Changes */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <History className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {summary?.historyCount || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Compensation Changes</div>
        </div>

        {/* Average Annual Increase */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {summary?.averageAnnualIncrease 
              ? `${summary.averageAnnualIncrease.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Annual Increase</div>
        </div>
      </div>

      {/* Current Compensation Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Current Compensation</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active compensation details</p>
          </div>
          {currentCompensation && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              COMPENSATION_TYPE_COLORS[currentCompensation.compensationType]
            }`}>
              {currentCompensation.compensationType.toUpperCase()}
            </span>
          )}
        </div>

        {currentCompensation ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Primary Amount</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                <CurrencyDisplay 
                  amount={currentCompensation.amount} 
                  currency={currentCompensation.currency as 'SRD' | 'USD'}
                />
              </dd>
              {currentCompensation.compensationType === 'hourly' && (
                <p className="text-xs text-gray-500 mt-1">per hour</p>
              )}
            </div>

            {currentCompensation.hourlyRate && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Hourly Rate</dt>
                <dd className="text-xl font-semibold text-gray-900 dark:text-white">
                  <CurrencyDisplay 
                    amount={currentCompensation.hourlyRate} 
                    currency={currentCompensation.currency as 'SRD' | 'USD'}
                  />
                </dd>
                {currentCompensation.overtimeRate && (
                  <p className="text-xs text-gray-500 mt-1">
                    OT: {currentCompensation.overtimeRate}x rate
                  </p>
                )}
              </div>
            )}

            {currentCompensation.annualAmount && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Annual Salary</dt>
                <dd className="text-xl font-semibold text-gray-900 dark:text-white">
                  <CurrencyDisplay 
                    amount={currentCompensation.annualAmount} 
                    currency={currentCompensation.currency as 'SRD' | 'USD'}
                  />
                </dd>
                <p className="text-xs text-gray-500 mt-1">per year</p>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Effective From</dt>
              <dd className="text-sm text-gray-900 dark:text-white font-medium">
                {formatDate(currentCompensation.effectiveFrom)}
              </dd>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getRelativeTime(currentCompensation.effectiveFrom)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            
            {/* Display user-friendly message from backend */}
            {compensationMessage ? (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                  {hasCompensationHistory ? 'No Current Compensation Set' : 'No Compensation Records'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  {compensationMessage}
                </p>
                
                {hasCompensationHistory && availableRecords > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 max-w-md mx-auto">
                    <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                      {availableRecords} existing compensation record{availableRecords !== 1 ? 's' : ''} found
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                      You can set one as current or create a new record
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-1">No formal compensation record</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  Create a compensation record to track changes and history
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleChangeCompensation}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {hasCompensationHistory ? 'Create New Record' : 'Create Compensation Record'}
              </button>
              
              {hasCompensationHistory && (
                <button
                  onClick={() => navigate(`/compensation/history?employeeId=${employeeId}`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <History className="w-4 h-4 mr-2" />
                  View History ({availableRecords})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compensation History Timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <History className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
            Compensation History
          </h2>
          {history.length > 5 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAllHistory ? 'Show Less' : `Show All (${history.length})`}
            </button>
          )}
        </div>

        {isLoadingHistory ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayHistory.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

            {/* Timeline items */}
            <div className="space-y-6">
              {displayHistory.map((comp, index) => (
                <div key={comp.id} className="relative flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${
                    comp.isCurrent 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      comp.isCurrent ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            COMPENSATION_TYPE_COLORS[comp.compensationType]
                          }`}>
                            {comp.compensationType.toUpperCase()}
                          </span>
                          {comp.isCurrent && (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Effective from {formatDate(comp.effectiveFrom)}
                          {comp.effectiveTo && ` to ${formatDate(comp.effectiveTo)}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          <CurrencyDisplay amount={comp.amount} currency={comp.currency as 'SRD' | 'USD'} />
                        </div>
                        {index > 0 && 'previousAmount' in comp && comp.previousAmount && (
                          <div className="text-xs text-gray-500">
                            {comp.amount > comp.previousAmount ? '↑' : '↓'}
                            {' '}
                            {Math.abs(
                              ((comp.amount - comp.previousAmount) / comp.previousAmount) * 100
                            ).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {comp.hourlyRate && (
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Hourly Rate</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">
                            <CurrencyDisplay amount={comp.hourlyRate} currency={comp.currency as 'SRD' | 'USD'} />
                          </dd>
                        </div>
                      )}
                      {comp.overtimeRate && (
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">OT Rate</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">
                            {comp.overtimeRate}x
                          </dd>
                        </div>
                      )}
                      {comp.annualAmount && (
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Annual</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">
                            <CurrencyDisplay amount={comp.annualAmount} currency={comp.currency as 'SRD' | 'USD'} />
                          </dd>
                        </div>
                      )}
                      {comp.payPeriodAmount && (
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Per Period</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">
                            <CurrencyDisplay amount={comp.payPeriodAmount} currency={comp.currency as 'SRD' | 'USD'} />
                          </dd>
                        </div>
                      )}
                    </div>

                    {'changeReason' in comp && comp.changeReason && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Reason for change:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comp.changeReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No compensation history available</p>
          </div>
        )}
      </div>
    </div>
  );
}

