/**
 * ShiftSwapApprovalQueue Component
 * 
 * Displays pending shift swap requests for managers to approve/deny
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePendingShiftSwapApprovals, useApproveShiftSwap, useRejectShiftSwap } from '../../../hooks/schedulehub/useShiftSwaps';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatTime } from '../../../utils/dateUtils';

const ShiftSwapApprovalQueue: React.FC = () => {
  const { data: swaps, isLoading } = usePendingShiftSwapApprovals({ status: 'pending' });
  const approveShiftSwap = useApproveShiftSwap();
  const denyShiftSwap = useRejectShiftSwap();
  const toast = useToast();
  const [selectedSwap, setSelectedSwap] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);

  const handleApprove = async (swapId: string) => {
    try {
      await approveShiftSwap.mutateAsync({ offerId: swapId });
      toast.success('Shift swap approved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve shift swap');
    }
  };

  const handleDenyClick = (swapId: string) => {
    setSelectedSwap(swapId);
    setShowDenyModal(true);
  };

  const handleDenySubmit = async () => {
    if (!selectedSwap) return;

    try {
      await denyShiftSwap.mutateAsync({
        offerId: selectedSwap,
        reason: denyReason,
      });
      toast.success('Shift swap denied');
      setShowDenyModal(false);
      setDenyReason('');
      setSelectedSwap(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deny shift swap');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'denied':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back to ScheduleHub */}
      <Link
        to="/schedulehub"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ScheduleHub
      </Link>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Swap Approval Queue</h1>
        <p className="text-gray-600 mt-2">Review and approve pending shift swap requests</p>
      </div>

      {swaps && swaps.length > 0 ? (
        <div className="space-y-4">
          {swaps.map((swap: any) => (
            <div
              key={swap.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Shift Swap Request
                  </h3>
                  <span className={getStatusBadgeClass(swap.status)}>
                    {swap.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Requested: {formatDate(swap.requestedAt)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Requestor's Shift */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Requestor: {swap.requestorName}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(swap.requestorShift.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-medium">
                        {formatTime(swap.requestorShift.startTime)} -{' '}
                        {formatTime(swap.requestorShift.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Station:</span>
                      <span className="ml-2 font-medium">
                        {swap.requestorShift.stationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <span className="ml-2 font-medium">
                        {swap.requestorShift.roleName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Employee's Shift */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Target: {swap.targetName}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(swap.targetShift.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-medium">
                        {formatTime(swap.targetShift.startTime)} -{' '}
                        {formatTime(swap.targetShift.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Station:</span>
                      <span className="ml-2 font-medium">
                        {swap.targetShift.stationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <span className="ml-2 font-medium">
                        {swap.targetShift.roleName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {swap.reason && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Reason:</span>
                  <p className="text-sm text-gray-600 mt-1">{swap.reason}</p>
                </div>
              )}

              {swap.status === 'pending' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleApprove(swap.id)}
                    disabled={approveShiftSwap.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {approveShiftSwap.isPending ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleDenyClick(swap.id)}
                    disabled={denyShiftSwap.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Deny
                  </button>
                </div>
              )}

              {swap.status === 'denied' && swap.denialReason && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-700">Denial Reason:</span>
                  <p className="text-sm text-red-600 mt-1">{swap.denialReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            All shift swap requests have been reviewed
          </p>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deny Shift Swap Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for denying this shift swap request:
            </p>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="Enter reason for denial..."
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setDenyReason('');
                  setSelectedSwap(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDenySubmit}
                disabled={!denyReason.trim() || denyShiftSwap.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {denyShiftSwap.isPending ? 'Denying...' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSwapApprovalQueue;
