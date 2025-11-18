import { useState } from 'react';
import { Plus, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import {
  useTimeOffRequests,
  useReviewTimeOff,
} from '@/hooks/schedulehub/useScheduleStats';
import { useToast } from '@/contexts/ToastContext';
import type { TimeOffRequest } from '@/types/schedulehub';

export default function TimeOffRequests() {
  const [showPending, setShowPending] = useState(false);
  const toast = useToast();

  const { data, isLoading, error } = useTimeOffRequests({
    pending: showPending,
  });

  const reviewTimeOff = useReviewTimeOff();

  const handleReview = async (id: string, decision: 'approved' | 'denied') => {
    try {
      await reviewTimeOff.mutateAsync({ id, decision });
      toast.success(`Request ${decision} successfully!`);
    } catch (error) {
      toast.error('Failed to review request');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading time off requests</p>
      </div>
    );
  }

  const requests = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Time Off Requests
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage time off requests and approvals
          </p>
        </div>
        <button
          onClick={() => toast.info('Time off request form coming soon')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Request Time Off
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {requests.filter((r: TimeOffRequest) => r.status === 'pending').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {requests.filter((r: TimeOffRequest) => r.status === 'approved').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Denied
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {requests.filter((r: TimeOffRequest) => r.status === 'denied').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Requests
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {requests.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showPending}
            onChange={(e) => setShowPending(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Show only pending requests
          </span>
        </label>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {requests.map((request: TimeOffRequest) => (
            <li key={request.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {request.request_type.charAt(0).toUpperCase() +
                        request.request_type.slice(1)}{' '}
                      Leave
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : request.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : request.status === 'denied'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(request.start_date).toLocaleDateString()} -{' '}
                    {new Date(request.end_date).toLocaleDateString()}
                  </div>

                  {request.reason && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {request.reason}
                    </p>
                  )}

                  {request.review_notes && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Review Notes:</span> {request.review_notes}
                      </p>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => handleReview(request.id, 'approved')}
                      disabled={reviewTimeOff.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(request.id, 'denied')}
                      disabled={reviewTimeOff.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {requests.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No time off requests
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {showPending
                ? 'No pending requests at this time.'
                : 'Get started by requesting time off.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
