/**
 * ShiftSwapApprovalQueue Component
 * 
 * Displays pending shift swap requests requiring manager approval with bulk operations.
 * Features include advanced filtering, search, bulk approve/reject, and detailed swap views.
 */

import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useErrorHandler } from '../../../shared/hooks/useErrorHandler';
import {
  usePendingSwaps,
  useApproveSwap,
  useRejectSwap,
  useBulkApproveSwaps,
  useBulkRejectSwaps,
} from '../hooks';
import { schedulingService } from '../services';
import type { ShiftSwap, ShiftSwapStatus } from '../types';

// UI Components
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {children}
  </div>;
}

function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ 
  children, 
  variant = 'default', 
  size = 'md' 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
  size?: 'sm' | 'md';
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    red: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
}

interface ShiftSwapApprovalQueueProps {
  className?: string;
}

export const ShiftSwapApprovalQueue: React.FC<ShiftSwapApprovalQueueProps> = ({
  className = '',
}) => {
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShiftSwapStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'normal'>('all');
  const [selectedSwaps, setSelectedSwaps] = useState<Set<string>>(new Set());

  // Queries
  const {
    data: swapData,
    isLoading,
    error,
    refetch,
  } = usePendingSwaps();

  // Mutations
  const approveSwapMutation = useApproveSwap();
  const rejectSwapMutation = useRejectSwap();
  const bulkApproveMutation = useBulkApproveSwaps();
  const bulkRejectMutation = useBulkRejectSwaps();

  // Handle query error
  React.useEffect(() => {
    if (error) {
      handleError(error, 'Failed to load pending swap requests');
    }
  }, [error, handleError]);

  // Extract data
  const swaps = swapData?.swaps || [];
  const pagination = swapData?.pagination;

  // Filtered swaps
  const filteredSwaps = useMemo(() => swaps.filter((swap: ShiftSwap) => {
      const matchesSearch = searchTerm === '' || 
        swap.shift?.role?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.shift?.station?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.offerEmployee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.requestEmployee?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || swap.status === statusFilter;
      
      const matchesPriority = priorityFilter === 'all' || 
        (priorityFilter === 'urgent' && swap.isUrgent) ||
        (priorityFilter === 'normal' && !swap.isUrgent);

      return matchesSearch && matchesStatus && matchesPriority;
    }), [swaps, searchTerm, statusFilter, priorityFilter]);

  // Selection handlers
  const toggleSwapSelection = (swapId: string) => {
    const newSelection = new Set(selectedSwaps);
    if (newSelection.has(swapId)) {
      newSelection.delete(swapId);
    } else {
      newSelection.add(swapId);
    }
    setSelectedSwaps(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedSwaps.size === filteredSwaps.length) {
      setSelectedSwaps(new Set());
    } else {
      setSelectedSwaps(new Set(filteredSwaps.map((swap: ShiftSwap) => swap.id)));
    }
  };

  // Action handlers
  const handleApprove = async (swapId: string) => {
    try {
      await approveSwapMutation.mutateAsync(swapId);
      setSelectedSwaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(swapId);
        return newSet;
      });
    } catch (error) {
      handleError(error, 'Failed to approve swap request');
    }
  };

  const handleReject = async (swapId: string, reason: string) => {
    try {
      await rejectSwapMutation.mutateAsync({ swapId, reason });
      setSelectedSwaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(swapId);
        return newSet;
      });
    } catch (error) {
      handleError(error, 'Failed to reject swap request');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedSwaps.size === 0) return;

    try {
      await bulkApproveMutation.mutateAsync(Array.from(selectedSwaps));
      setSelectedSwaps(new Set());
    } catch (error) {
      handleError(error, 'Failed to approve selected swap requests');
    }
  };

  const handleBulkReject = async () => {
    if (selectedSwaps.size === 0) return;

    const reason = prompt('Enter rejection reason for selected swaps:');
    if (!reason) return;

    try {
      await bulkRejectMutation.mutateAsync({
        swapIds: Array.from(selectedSwaps),
        reason,
      });
      setSelectedSwaps(new Set());
    } catch (error) {
      handleError(error, 'Failed to reject selected swap requests');
    }
  };

  // Utility functions
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return '--';
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getStatusBadge = (status: ShiftSwapStatus) => {
    const statusConfig = {
      pending: { variant: 'yellow' as const, label: 'Pending' },
      approved: { variant: 'green' as const, label: 'Approved' },
      rejected: { variant: 'red' as const, label: 'Rejected' },
      cancelled: { variant: 'default' as const, label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shift Swap Approval Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve pending shift swap requests
          </p>
        </div>

        <Button
          onClick={() => refetch()}
          variant="outline"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search swaps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShiftSwapStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'urgent' | 'normal')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent Only</option>
            <option value="normal">Normal Priority</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Filter className="h-4 w-4 mr-2" />
            {filteredSwaps.length} swap{filteredSwaps.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedSwaps.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSwaps.size === filteredSwaps.length && filteredSwaps.length > 0}
                  onChange={toggleSelectAll}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Select All
                </span>
              </label>

              <Button
                onClick={handleBulkApprove}
                variant="primary"
                size="sm"
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Selected
              </Button>

              <Button
                onClick={handleBulkReject}
                variant="danger"
                size="sm"
                disabled={bulkRejectMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Selected
              </Button>
            </div>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSwaps.size} selected
            </span>
          </div>
        </Card>
      )}

      {/* Swap List */}
      {filteredSwaps.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold">No pending approvals</p>
            <p className="text-sm mt-2">
              All shift swap requests have been processed
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSwaps.map((swap: ShiftSwap) => (
            <Card key={swap.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedSwaps.has(swap.id)}
                  onChange={() => toggleSwapSelection(swap.id)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1"
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {swap.shift?.role?.name || 'Unknown Role'}
                        </h3>
                        {swap.isUrgent && (
                          <Badge variant="red" size="sm">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                        {getStatusBadge(swap.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {swap.shift?.station?.name || 'Unknown Station'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(swap.shift?.shiftDate)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(swap.shift?.startTime)} -{' '}
                        {formatTime(swap.shift?.endTime)}
                      </p>
                    </div>
                  </div>

                  {/* Swap Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Offering
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {swap.offerEmployee?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {swap.offerEmployee?.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Requesting
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {swap.requestEmployee?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {swap.requestEmployee?.email}
                      </p>
                    </div>
                  </div>

                  {swap.reason && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Reason
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{swap.reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => navigate(`/scheduling/shift-swaps/${swap.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>

                    <Button
                      onClick={() => handleApprove(swap.id)}
                      variant="primary"
                      size="sm"
                      disabled={approveSwapMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>

                    <Button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleReject(swap.id, reason);
                        }
                      }}
                      variant="danger"
                      size="sm"
                      disabled={rejectSwapMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {/* Handle previous page */}}
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
            >
              Previous
            </Button>
            <Button
              onClick={() => {/* Handle next page */}}
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSwapApprovalQueue;