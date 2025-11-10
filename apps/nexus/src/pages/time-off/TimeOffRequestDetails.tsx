/**
 * Time Off Request Details Page
 * Displays detailed information about a single time-off request
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Ban,
} from 'lucide-react';
import {
  useTimeOffRequest,
  useDeleteTimeOffRequest,
  useReviewTimeOffRequest,
  useCancelTimeOffRequest,
} from '@/hooks/useTimeOff';
import type { TimeOffRequestStatus, TimeOffType } from '@/types/timeOff.types';
import { useState } from 'react';

const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: 'Vacation',
  sick: 'Sick Leave',
  personal: 'Personal',
  bereavement: 'Bereavement',
  maternity: 'Maternity',
  paternity: 'Paternity',
  unpaid: 'Unpaid',
};

const STATUS_CONFIG: Record<TimeOffRequestStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: Ban,
  },
};

export default function TimeOffRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: request, isLoading } = useTimeOffRequest(id);
  const deleteMutation = useDeleteTimeOffRequest();
  const reviewMutation = useReviewTimeOffRequest();
  const cancelMutation = useCancelTimeOffRequest();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate('/time-off/requests');
    }
  };

  const handleApprove = async () => {
    if (id) {
      await reviewMutation.mutateAsync({
        id,
        review: { status: 'approved' },
      });
    }
  };

  const handleReject = async () => {
    if (id && rejectNotes.trim()) {
      await reviewMutation.mutateAsync({
        id,
        review: {
          status: 'rejected',
          reviewNotes: rejectNotes,
        },
      });
      setShowRejectModal(false);
      setRejectNotes('');
    }
  };

  const handleCancel = async () => {
    if (id) {
      await cancelMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Request not found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The time-off request you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/time-off/requests"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <ArrowLeft size={20} />
          Back to Requests
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[request.status].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/time-off/requests"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Off Request</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Request ID: {request.id}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {request.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={20} />
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle size={20} />
                Reject
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Ban size={20} />
                Cancel
              </button>
            </>
          )}
          {request.status === 'pending' && (
            <Link
              to={`/time-off/requests/${request.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Edit size={20} />
              Edit
            </Link>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={20} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h2>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  STATUS_CONFIG[request.status].className
                }`}
              >
                <StatusIcon size={18} />
                {STATUS_CONFIG[request.status].label}
              </span>
              {request.reviewedAt && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Reviewed on {format(new Date(request.reviewedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            {request.reviewNotes && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Notes:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{request.reviewNotes}</p>
              </div>
            )}
          </div>

          {/* Request Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Type</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {TIME_OFF_TYPE_LABELS[request.timeOffType]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Days</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {request.totalDays} days
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {format(new Date(request.startDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {format(new Date(request.endDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {request.reason && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                  <p className="text-base text-gray-900 dark:text-white">{request.reason}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {format(new Date(request.createdAt), 'MMMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee</h2>
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {request.employee?.firstName} {request.employee?.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {request.employee?.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  #{request.employee?.employeeNumber}
                </p>
                {request.employee?.department && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {request.employee.department.departmentName}
                  </p>
                )}
                <Link
                  to={`/employees/${request.employeeId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-block"
                >
                  View Profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Reviewer Card */}
          {request.reviewer && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reviewed By</h2>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {request.reviewer.firstName} {request.reviewer.lastName}
                  </h3>
                  {request.reviewedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(request.reviewedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Time-Off Request
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this time-off request? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reject Time-Off Request
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this request:
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectNotes.trim() || reviewMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

