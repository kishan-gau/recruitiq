import { useState, useEffect } from 'react';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '../../hooks/usePaylinqAPI';

interface ApprovalAction {
  id: number;
  action: 'approved' | 'rejected';
  comments: string;
  actor_name: string;
  created_at: string;
}

interface ApprovalHistoryItem {
  request_id: number;
  request_type: string;
  status: string;
  requested_by: string;
  requested_at: string;
  current_approvals: number;
  required_approvals: number;
  actions: ApprovalAction[];
}

interface ApprovalHistoryProps {
  referenceType: string;
  referenceId: string;
}

const ApprovalHistory = ({ referenceType, referenceId }: ApprovalHistoryProps) => {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (referenceType && referenceId) {
      fetchHistory();
    }
  }, [referenceType, referenceId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await paylinq.getApprovalHistory(referenceType, referenceId);
      setHistory(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching approval history:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to fetch approval history',
      });
      setError('Failed to fetch approval history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[status] || colors['pending']}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  const getActionIcon = (action: string) => {
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
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600">Loading approval history...</div>
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

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No approval history found for this item.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>
      
      <div className="space-y-4">
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
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.status === 'approved' ? 'bg-green-600' :
                    item.status === 'rejected' ? 'bg-red-600' :
                    'bg-blue-600'
                  }`}
                  style={{ width: `${(item.current_approvals / item.required_approvals) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {item.current_approvals} / {item.required_approvals} approvals
              </div>
            </div>

            {/* Action History */}
            {item.actions && item.actions.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Actions</div>
                <div className="space-y-2">
                  {item.actions.map((action, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-sm">
                      <div className="mt-0.5">{getActionIcon(action.action)}</div>
                      <div className="flex-1">
                        <div className="text-gray-900">
                          <span className="font-medium">{action.actor_name}</span>
                          {' '}
                          <span className={action.action === 'approved' ? 'text-green-600' : 'text-red-600'}>
                            {action.action}
                          </span>
                        </div>
                        {action.comments && (
                          <div className="text-gray-600 italic mt-1">{action.comments}</div>
                        )}
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(action.created_at).toLocaleString()}
                        </div>
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
