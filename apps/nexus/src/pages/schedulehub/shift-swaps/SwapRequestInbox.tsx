/**
 * SwapRequestInbox Component
 * 
 * Employee view for managing their received shift swap requests
 */

import React, { useState } from 'react';
import { useShiftSwaps } from '../../../hooks/schedulehub/useShiftSwaps';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatTime } from '../../../utils/dateUtils';

const SwapRequestInbox: React.FC = () => {
  const { data: receivedSwaps, isLoading } = useShiftSwaps({ 
    type: 'received',
    status: 'pending' 
  });
  const { acceptSwapRequest, rejectSwapRequest } = useShiftSwaps();
  const { toast } = useToast();
  const [selectedSwap, setSelectedSwap] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleAccept = async (swapId: string) => {
    try {
      await acceptSwapRequest.mutateAsync(swapId);
      toast.success('Shift swap request accepted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept swap request');
    }
  };

  const handleRejectClick = (swapId: string) => {
    setSelectedSwap(swapId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedSwap) return;

    try {
      await rejectSwapRequest.mutateAsync({
        swapId: selectedSwap,
        reason: rejectReason,
      });
      toast.success('Shift swap request rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedSwap(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject swap request');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Swap Requests</h1>
        <p className="text-gray-600 mt-2">
          Review shift swap requests from your colleagues
        </p>
      </div>

      {receivedSwaps && receivedSwaps.length > 0 ? (
        <div className="space-y-4">
          {receivedSwaps.map((swap: any) => (
            <div
              key={swap.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Swap Request from {swap.requestorName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested: {formatDate(swap.requestedAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* You would give up */}
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    Your Shift (Give Up)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-blue-700">Date:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {formatDate(swap.targetShift.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Time:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {formatTime(swap.targetShift.startTime)} -{' '}
                        {formatTime(swap.targetShift.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Station:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {swap.targetShift.stationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Role:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {swap.targetShift.roleName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* You would receive */}
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 17l-5-5m0 0l5-5m-5 5h12"
                      />
                    </svg>
                    Their Shift (Receive)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-green-700">Date:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {formatDate(swap.requestorShift.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Time:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {formatTime(swap.requestorShift.startTime)} -{' '}
                        {formatTime(swap.requestorShift.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Station:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {swap.requestorShift.stationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Role:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {swap.requestorShift.roleName}
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

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleAccept(swap.id)}
                  disabled={acceptSwapRequest.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {acceptSwapRequest.isPending ? 'Accepting...' : 'Accept Swap'}
                </button>
                <button
                  onClick={() => handleRejectClick(swap.id)}
                  disabled={rejectSwapRequest.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No swap requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any pending shift swap requests
          </p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Shift Swap Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this request:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="Enter reason for rejection..."
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedSwap(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || rejectSwapRequest.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {rejectSwapRequest.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapRequestInbox;
