/**
 * ShiftSwapApprovalQueue Component
 * 
 * Displays pending shift swap requests requiring manager approval
 * 
 * Features:
 * - List of pending approvals with filtering
 * - Quick approve/reject actions
 * - Detailed view for each swap request
 * - Bulk approval support
 * - Priority indicators
 * 
 * @component
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePendingApprovals,
  useApproveSwap,
  useRejectSwap,
} from '@/hooks/schedulehub/useShiftSwaps';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

interface ShiftSwapApprovalQueueProps {
  stationId?: string;
  roleId?: string;
}

export const ShiftSwapApprovalQueue: React.FC<ShiftSwapApprovalQueueProps> = ({
  stationId,
  roleId,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedSwaps, setSelectedSwaps] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch pending approvals
  const { data, isLoading, error } = usePendingApprovals({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    stationId,
    roleId,
  });

  const approveSwapMutation = useApproveSwap();
  const rejectSwapMutation = useRejectSwap();

  const swaps = data?.shiftSwaps || [];
  const pagination = data?.pagination;

  // Filter swaps based on search and priority
  const filteredSwaps = swaps.filter((swap: any) => {
    const matchesSearch =
      !searchQuery ||
      swap.offerEmployee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      swap.requestEmployee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      swap.shift?.role?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === 'all' ||
      (priorityFilter === 'urgent' && swap.isUrgent) ||
      (priorityFilter === 'normal' && !swap.isUrgent);

    return matchesSearch && matchesPriority;
  });

  const handleApprove = async (swapId: string, notes?: string) => {
    try {
      await approveSwapMutation.mutateAsync({ swapId, notes });
      setSelectedSwaps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(swapId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to approve swap:', error);
    }
  };

  const handleReject = async (swapId: string, reason: string) => {
    try {
      await rejectSwapMutation.mutateAsync({ swapId, reason });
      setSelectedSwaps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(swapId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to reject swap:', error);
    }
  };

  const handleBulkApprove = async () => {
    const promises = Array.from(selectedSwaps).map((swapId) =>
      approveSwapMutation.mutateAsync({ swapId })
    );

    try {
      await Promise.all(promises);
      setSelectedSwaps(new Set());
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const toggleSwapSelection = (swapId: string) => {
    setSelectedSwaps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(swapId)) {
        newSet.delete(swapId);
      } else {
        newSet.add(swapId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSwaps.size === filteredSwaps.length) {
      setSelectedSwaps(new Set());
    } else {
      setSelectedSwaps(new Set(filteredSwaps.map((swap: any) => swap.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'yellow', label: 'Pending Approval' },
      approved: { color: 'green', label: 'Approved' },
      rejected: { color: 'red', label: 'Rejected' },
      completed: { color: 'blue', label: 'Completed' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.color as any} size="sm">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Failed to load approvals</p>
          <p className="text-sm text-gray-600 mt-2">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Shift Swap Approvals
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredSwaps.length} pending approval{filteredSwaps.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedSwaps.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              variant="primary"
              size="sm"
              disabled={approveSwapMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected ({selectedSwaps.size})
            </Button>
          )}

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search employees, roles..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <Select
                value={priorityFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {filteredSwaps.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedSwaps.size === filteredSwaps.length && filteredSwaps.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({filteredSwaps.length})
              </span>
            </label>

            {selectedSwaps.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedSwaps.size} selected
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Swap List */}
      {filteredSwaps.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold">No pending approvals</p>
            <p className="text-sm mt-2">
              All shift swap requests have been processed
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSwaps.map((swap: any) => (
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
                        <h3 className="text-lg font-semibold text-gray-900">
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
                      <p className="text-sm text-gray-600">
                        {swap.shift?.station?.name || 'Unknown Station'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(swap.shift?.shiftDate)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatTime(swap.shift?.startTime)} -{' '}
                        {formatTime(swap.shift?.endTime)}
                      </p>
                    </div>
                  </div>

                  {/* Swap Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Offering
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {swap.offerEmployee?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {swap.offerEmployee?.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Requesting
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {swap.requestEmployee?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {swap.requestEmployee?.email}
                      </p>
                    </div>
                  </div>

                  {swap.reason && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Reason
                      </p>
                      <p className="text-sm text-gray-700">{swap.reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => navigate(`/schedulehub/shift-swaps/${swap.id}`)}
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
          <p className="text-sm text-gray-600">
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
