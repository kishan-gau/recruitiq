import React, { useState, useEffect } from 'react';
import { apiClient } from '../../utils/apiClient';

/**
 * Approval History Component
 * Shows approval history for a specific reference
 */
const ApprovalHistory = ({ referenceType, referenceId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (referenceType && referenceId) {
      fetchHistory();
    }
  }, [referenceType, referenceId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/paylinq/approvals/history/${referenceType}/${referenceId}`
      );
      setHistory(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching approval history:', err);
      setError(err.response?.data?.message || 'Failed to fetch approval history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[status] || colors.pending}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  const getActionIcon = (action) => {
    if (action === 'approved') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (action === 'rejected') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading approval history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No approval history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Approval History</h3>
      
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.request_id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-medium text-gray-900">
                  {item.request_type === 'conversion' && 'Currency Conversion'}
                  {item.request_type === 'rate_change' && 'Rate Change'}
                  {item.request_type === 'bulk_rate_import' && 'Bulk Import'}
                  {item.request_type === 'configuration_change' && 'Configuration Change'}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Requested by {item.requested_by} • {new Date(item.requested_at).toLocaleString()}
                </div>
              </div>
              <div>
                {getStatusBadge(item.status)}
              </div>
            </div>

            {/* Approval Progress */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.status === 'approved' ? 'bg-green-600' :
                    item.status === 'rejected' ? 'bg-red-600' :
                    'bg-blue-600'
                  }`}
                  style={{ width: `${(item.current_approvals / item.required_approvals) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 whitespace-nowrap">
                {item.current_approvals} / {item.required_approvals}
              </div>
            </div>

            {/* Actions Timeline */}
            {item.actions && item.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Actions:</div>
                <div className="space-y-2">
                  {item.actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5">{getActionIcon(action.action)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{action.created_by}</span>
                          <span className={`text-xs ${
                            action.action === 'approved' ? 'text-green-600' :
                            action.action === 'rejected' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {action.action}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(action.created_at).toLocaleString()}
                          </span>
                        </div>
                        {action.comments && (
                          <div className="text-xs text-gray-600 mt-1 italic">
                            "{action.comments}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalHistory;
