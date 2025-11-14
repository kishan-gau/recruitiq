import React, { useState, useEffect } from 'react';
import { apiClient } from '../../utils/apiClient';

/**
 * Approval Queue Page
 * Shows pending currency approval requests
 */
const ApprovalQueuePage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ requestType: '', priority: '' });
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch pending approvals
  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.requestType) params.append('requestType', filter.requestType);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await apiClient.get(`/api/paylinq/approvals/pending?${params}`);
      setApprovals(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err.response?.data?.message || 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId, comments = '') => {
    try {
      setActionLoading(true);
      await apiClient.post(`/api/paylinq/approvals/${approvalId}/approve`, { comments });
      
      // Refresh list
      await fetchApprovals();
      setSelectedApproval(null);
      alert('Approval granted successfully');
    } catch (err) {
      console.error('Error approving request:', err);
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId, comments) => {
    if (!comments || comments.trim() === '') {
      alert('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await apiClient.post(`/api/paylinq/approvals/${approvalId}/reject`, { comments });
      
      // Refresh list
      await fetchApprovals();
      setSelectedApproval(null);
      alert('Request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      conversion: 'Currency Conversion',
      rate_change: 'Rate Change',
      bulk_rate_import: 'Bulk Rate Import',
      configuration_change: 'Configuration Change'
    };
    return labels[type] || type;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[priority] || colors.normal}`}>
        {priority?.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatHours = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  if (loading && approvals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve currency operations</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Type
            </label>
            <select
              value={filter.requestType}
              onChange={(e) => setFilter({ ...filter, requestType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="conversion">Currency Conversion</option>
              <option value="rate_change">Rate Change</option>
              <option value="bulk_rate_import">Bulk Rate Import</option>
              <option value="configuration_change">Configuration Change</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchApprovals}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Approval List */}
      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Pending Approvals</h3>
          <p className="text-gray-500">All caught up! There are no pending approval requests.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Priority
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {approvals.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {getRequestTypeLabel(approval.request_type)}
                      </div>
                      <div>{getPriorityBadge(approval.priority)}</div>
                    </div>
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
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
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
                      onClick={() => setSelectedApproval(approval)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Detail Modal */}
      {selectedApproval && (
        <ApprovalDetailModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

/**
 * Display request data based on type
 */
const RequestDataDisplay = ({ requestType, requestData, reason }) => {
  if (requestType === 'conversion') {
    return (
      <div className="text-sm space-y-1">
        <div className="font-medium text-gray-900">
          {requestData.amount?.toLocaleString()} {requestData.from_currency} → {requestData.to_currency}
        </div>
        <div className="text-gray-500">
          Rate: {requestData.rate} = {(requestData.amount * requestData.rate)?.toLocaleString()} {requestData.to_currency}
        </div>
        {reason && <div className="text-gray-600 italic">{reason}</div>}
      </div>
    );
  }

  if (requestType === 'rate_change') {
    const variance = ((requestData.new_rate - requestData.old_rate) / requestData.old_rate * 100).toFixed(2);
    return (
      <div className="text-sm space-y-1">
        <div className="font-medium text-gray-900">
          {requestData.from_currency} / {requestData.to_currency}
        </div>
        <div className="text-gray-500">
          {requestData.old_rate} → {requestData.new_rate}
          <span className={`ml-2 ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ({variance > 0 ? '+' : ''}{variance}%)
          </span>
        </div>
        {reason && <div className="text-gray-600 italic">{reason}</div>}
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-900">
      {reason || 'No details available'}
    </div>
  );
};

/**
 * Approval Detail Modal
 */
const ApprovalDetailModal = ({ approval, onClose, onApprove, onReject, loading }) => {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState(null);

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(approval.id, comments);
    } else if (action === 'reject') {
      onReject(approval.id, comments);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Approval Request Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Request Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                <div className="text-base text-gray-900">
                  {approval.request_type === 'conversion' && 'Currency Conversion'}
                  {approval.request_type === 'rate_change' && 'Exchange Rate Change'}
                  {approval.request_type === 'bulk_rate_import' && 'Bulk Rate Import'}
                  {approval.request_type === 'configuration_change' && 'Configuration Change'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    approval.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    approval.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    approval.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {approval.priority?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Request Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Details</label>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <RequestDataDisplay 
                  requestType={approval.request_type}
                  requestData={approval.request_data}
                  reason={approval.reason}
                />
              </div>
            </div>

            {/* Requested By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested By</label>
                <div className="text-base text-gray-900">{approval.requested_by_name}</div>
                <div className="text-sm text-gray-500">{approval.requested_by_email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested At</label>
                <div className="text-base text-gray-900">
                  {new Date(approval.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Approval Progress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Progress</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${(approval.current_approvals / approval.required_approvals) * 100}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {approval.current_approvals} / {approval.required_approvals}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments {action === 'reject' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={action === 'reject' ? 'Please provide a reason for rejection...' : 'Optional comments...'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setAction('reject');
                handleSubmit();
              }}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading && action === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={() => {
                setAction('approve');
                handleSubmit();
              }}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading && action === 'approve' ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueuePage;
