import { useState, useEffect } from 'react';
import { usePaylinqAPI } from '../../hooks/usePaylinqAPI';

interface ApprovalItem {
  id: number;
  organization_id: string;
  request_type: string;
  request_data: Record<string, any>;
  reason: string | null;
  status: string;
  priority: string;
  requested_by: string;
  requested_by_name: string;
  requested_by_email: string;
  required_approvals: number;
  current_approvals: number;
  age_hours: number;
  hours_until_expiry: number | null;
  created_at: string;
}

interface RequestDataDisplayProps {
  requestType: string;
  requestData: Record<string, any>;
  reason: string | null;
}

interface ApprovalDetailModalProps {
  approval: ApprovalItem;
  onClose: () => void;
  onApprove: (id: number, comments: string) => void;
  onReject: (id: number, comments: string) => void;
  loading: boolean;
}

const ApprovalQueuePage = () => {
  const { paylinq } = usePaylinqAPI();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('age_hours');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await paylinq.getPendingApprovals();
      setApprovals(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: number, comments = '') => {
    try {
      setActionLoading(true);
      await paylinq.approveRequest(approvalId.toString(), comments);
      await fetchApprovals();
      setShowDetailModal(false);
      setSelectedApproval(null);
      alert('Request approved successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId: number, comments: string) => {
    if (!comments || comments.trim() === '') {
      alert('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await paylinq.rejectRequest(approvalId.toString(), comments);
      await fetchApprovals();
      setShowDetailModal(false);
      setSelectedApproval(null);
      alert('Request rejected successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const getRequestTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      conversion: 'Currency Conversion',
      rate_change: 'Rate Change',
      bulk_rate_import: 'Bulk Rate Import',
      configuration_change: 'Configuration Change',
    };
    return labels[type] || type;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-200 text-gray-800',
      normal: 'bg-blue-200 text-blue-800',
      high: 'bg-yellow-200 text-yellow-800',
      urgent: 'bg-red-200 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[priority] || colors['normal']}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatHours = (hours: number): string => {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  // Filter and sort approvals
  const filteredApprovals = approvals.filter((approval) => {
    if (filterType === 'all') return true;
    return approval.request_type === filterType;
  });

  const sortedApprovals = [...filteredApprovals].sort((a, b) => {
    const aVal = a[sortField as keyof ApprovalItem];
    const bVal = b[sortField as keyof ApprovalItem];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  const stats = {
    total: approvals.length,
    urgent: approvals.filter((a) => a.priority === 'urgent').length,
    expiringSoon: approvals.filter((a) => a.hours_until_expiry && a.hours_until_expiry < 24).length,
    activeRates: approvals.filter((a) => a.request_type === 'rate_change').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading approvals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and manage pending approval requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Pending</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Urgent</div>
          <div className="mt-2 text-3xl font-semibold text-red-600">{stats.urgent}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Expiring Soon</div>
          <div className="mt-2 text-3xl font-semibold text-orange-600">{stats.expiringSoon}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active Rates</div>
          <div className="mt-2 text-3xl font-semibold text-blue-600">
            {approvals.filter((r) => !r.hours_until_expiry).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="conversion">Currency Conversion</option>
              <option value="rate_change">Rate Change</option>
              <option value="bulk_rate_import">Bulk Rate Import</option>
              <option value="configuration_change">Configuration Change</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="age_hours">Age</option>
              <option value="priority">Priority</option>
              <option value="hours_until_expiry">Expiry</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Direction</label>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedApprovals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No pending approvals
                </td>
              </tr>
            ) : (
              sortedApprovals.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getRequestTypeLabel(approval.request_type)}
                    </div>
                    <div>{getPriorityBadge(approval.priority)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <RequestDataDisplay
                      requestType={approval.request_type}
                      requestData={approval.request_data}
                      reason={approval.reason}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{approval.requested_by_name}</div>
                    <div className="text-sm text-gray-500">{approval.requested_by_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {approval.current_approvals} / {approval.required_approvals}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(approval.current_approvals / approval.required_approvals) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatHours(approval.age_hours)}
                    </div>
                    {approval.hours_until_expiry && (
                      <div className="text-xs text-orange-600">
                        Expires in {formatHours(approval.hours_until_expiry)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApproval && (
        <ApprovalDetailModal
          approval={selectedApproval}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedApproval(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

// Request Data Display Component
const RequestDataDisplay = ({ requestType, requestData, reason }: RequestDataDisplayProps) => {
  if (requestType === 'conversion') {
    return (
      <div className="text-sm">
        <div className="text-gray-900 font-medium">
          {requestData.fromCurrency} → {requestData.toCurrency}
        </div>
        <div className="text-gray-500">Amount: {requestData.amount}</div>
      </div>
    );
  }

  if (requestType === 'rate_change') {
    const oldRate = Number(requestData.oldRate);
    const newRate = Number(requestData.newRate);
    const variance = ((newRate - oldRate) / oldRate * 100).toFixed(2);
    return (
      <div className="text-sm">
        <div className="text-gray-900 font-medium">
          {requestData.fromCurrency} → {requestData.toCurrency}
        </div>
        <div className="text-gray-500">
          Rate: {oldRate} → {newRate}
          <span className={`ml-2 ${Number(variance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ({Number(variance) > 0 ? '+' : ''}{variance}%)
          </span>
        </div>
        {reason && <div className="text-gray-600 italic mt-1">{reason}</div>}
      </div>
    );
  }

  if (requestType === 'bulk_rate_import') {
    return (
      <div className="text-sm">
        <div className="text-gray-900 font-medium">Bulk Import</div>
        <div className="text-gray-500">
          {requestData.rateCount || 0} rates from {requestData.source}
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-500">
      {reason || 'No details available'}
    </div>
  );
};

// Approval Detail Modal Component
const ApprovalDetailModal = ({ approval, onClose, onApprove, onReject, loading }: ApprovalDetailModalProps) => {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(approval.id, comments);
    } else if (action === 'reject') {
      if (!comments.trim()) {
        alert('Comments are required for rejection');
        return;
      }
      onReject(approval.id, comments);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Approval Request Details</h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Request Type</label>
            <p className="mt-1 text-sm text-gray-900">{approval.request_type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Requested By</label>
            <p className="mt-1 text-sm text-gray-900">
              {approval.requested_by_name} ({approval.requested_by_email})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Request Data</label>
            <pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-x-auto">
              {JSON.stringify(approval.request_data, null, 2)}
            </pre>
          </div>

          {approval.reason && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <p className="mt-1 text-sm text-gray-900">{approval.reason}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Add your comments here..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setAction('reject');
              handleSubmit();
            }}
            disabled={loading}
            className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
          >
            {loading && action === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            onClick={() => {
              setAction('approve');
              handleSubmit();
            }}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && action === 'approve' ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueuePage;
