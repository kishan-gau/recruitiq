/**
 * Example: PayrollRunsPage with API Integration
 * 
 * This example shows how to integrate TanStack Query hooks with loading and error states
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, DollarSign, Users } from 'lucide-react';

// Import API hooks from Phase 1
// import { usePayrollRuns } from '@recruitiq/api-client';

// Import UI components
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorAlert } from '../components/ui/ErrorDisplay';

// Types
type PayrollRunStatus = 'draft' | 'processing' | 'completed' | 'failed';

interface PayrollRun {
  id: string;
  runName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollRunStatus;
  totalAmount: number;
  employeeCount: number;
  currency: 'SRD' | 'USD' | 'EUR';
}

const PayrollRunsPageExample = () => {
  const navigate = useNavigate();
  
  // Filters
  const [status, setStatus] = useState<PayrollRunStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // API Integration with TanStack Query
  // Uncomment when API is ready:
  /*
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = usePayrollRuns({
    page,
    limit: pageSize,
    status: status || undefined,
    search: searchTerm || undefined,
  });
  
  const payrollRuns = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  */

  // Mock data for demonstration
  const isLoading = false;
  const isError = false;
  const error: Error | null = null;
  const payrollRuns: PayrollRun[] = [
    {
      id: '1',
      runName: 'November 2025 Payroll',
      payPeriodStart: '2025-11-01',
      payPeriodEnd: '2025-11-15',
      payDate: '2025-11-16',
      status: 'completed',
      totalAmount: 62250,
      employeeCount: 48,
      currency: 'SRD',
    },
    {
      id: '2',
      runName: 'October 2025 Payroll (2)',
      payPeriodStart: '2025-10-16',
      payPeriodEnd: '2025-10-31',
      payDate: '2025-11-01',
      status: 'completed',
      totalAmount: 61850,
      employeeCount: 47,
      currency: 'SRD',
    },
  ];
  const totalCount = 2;
  const refetch = () => console.log('Refetching...');

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'SRD' ? '$' : currency === 'USD' ? '$' : '€';
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Status badge colors
  const getStatusColor = (status: PayrollRunStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payroll Runs</h1>
            <p className="text-sm text-gray-500 mt-1">Loading payroll runs...</p>
          </div>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Runs</h1>
        </div>
        <ErrorAlert
          title="Failed to load payroll runs"
          message={error?.message || 'An unexpected error occurred'}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Runs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and process payroll runs
          </p>
        </div>
        <Link
          to="/payroll-runs/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Payroll Run
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search payroll runs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollRunStatus | '')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payroll Run
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pay Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employees
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payrollRuns.map((run) => (
              <tr
                key={run.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/payroll-runs/${run.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {run.runName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Pay date: {formatDate(run.payDate)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      run.status
                    )}`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    {run.employeeCount}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                    {formatCurrency(run.totalAmount, run.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/payroll-runs/${run.id}`);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {payrollRuns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No payroll runs found</p>
          </div>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, totalCount)} of {totalCount} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollRunsPageExample;

