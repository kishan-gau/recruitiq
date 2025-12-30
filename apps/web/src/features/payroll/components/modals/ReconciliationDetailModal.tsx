import { CheckCircle, XCircle, AlertCircle, DollarSign, Calendar, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { Reconciliation, ReconciliationStatus } from '@recruitiq/types';

import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';
import { formatCurrency, formatDate } from '@/utils/formatting';

interface ReconciliationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconciliationId: string;
  onUpdate?: () => void;
}

interface ReconciliationItem {
  id: string;
  itemType: string;
  description: string;
  expectedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  status: 'pending' | 'resolved' | 'escalated';
  notes?: string;
}

export default function ReconciliationDetailModal({
  isOpen,
  onClose,
  reconciliationId,
  onUpdate,
}: ReconciliationDetailModalProps) {
  const { paylinq } = usePaylinqAPI();
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch reconciliation details
  useEffect(() => {
    if (isOpen && reconciliationId) {
      fetchReconciliationDetails();
    }
  }, [isOpen, reconciliationId]);

  const fetchReconciliationDetails = async () => {
    setIsLoading(true);
    try {
      const [reconResponse, itemsResponse] = await Promise.all([
        paylinq.getReconciliation(reconciliationId),
        paylinq.getReconciliationItems(reconciliationId),
      ]);

      // API client returns response.data directly, which has { success, reconciliation/items }
      if ((reconResponse as any).success && (reconResponse as any).reconciliation) {
        setReconciliation((reconResponse as any).reconciliation);
      }

      if ((itemsResponse as any).success && (itemsResponse as any).items) {
        setItems((itemsResponse as any).items);
      }
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load reconciliation details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!reconciliation) return;

    // Check if all items are resolved
    const unresolvedItems = items.filter(item => item.status === 'pending');
    if (unresolvedItems.length > 0) {
      showError(`Cannot complete reconciliation. ${unresolvedItems.length} item(s) are still pending.`);
      return;
    }

    setIsCompleting(true);
    try {
      const response = await paylinq.completeReconciliation({
        reconciliationId,
        actualTotal: reconciliation.actualTotal || 0,
        notes,
      });

      // API client returns response.data directly, which has { success }
      if ((response as any).success) {
        success('Reconciliation completed successfully');
        onUpdate?.();
        onClose();
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to complete reconciliation');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleResolveItem = async (itemId: string) => {
    try {
      const resolution = prompt('Enter resolution notes:');
      if (!resolution) return;

      const response = await (paylinq as any).resolveReconciliationItem(itemId, { resolution });

      // API client returns response.data directly, which has { success }
      if ((response as any).success) {
        success('Item resolved successfully');
        fetchReconciliationDetails(); // Refresh data
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to resolve item');
    }
  };

  const getStatusBadge = (status: ReconciliationStatus) => {
    const badges: Record<ReconciliationStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: {
        bg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        text: 'Pending',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      in_progress: {
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
        text: 'In Progress',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      completed: {
        bg: 'bg-green-100 text-green-800 border-green-200',
        text: 'Completed',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      failed: {
        bg: 'bg-red-100 text-red-800 border-red-200',
        text: 'Failed',
        icon: <XCircle className="w-4 h-4" />,
      },
    };

    const badge = badges[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const getItemStatusBadge = (status: 'pending' | 'resolved' | 'escalated') => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      escalated: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
      pending: 'Pending',
      resolved: 'Resolved',
      escalated: 'Escalated',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (isLoading || !reconciliation) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} title="Reconciliation Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Dialog>
    );
  }

  const canComplete = reconciliation.status !== 'completed' && items.every(item => item.status === 'resolved');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Reconciliation Details"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isCompleting ? 'Completing...' : 'Complete Reconciliation'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
              <span>Type</span>
            </div>
            <p className="font-medium capitalize">{reconciliation.reconciliationType}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span>Date</span>
            </div>
            <p className="font-medium">{formatDate(reconciliation.reconciliationDate)}</p>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div>{getStatusBadge(reconciliation.status)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Payroll Run</div>
            <p className="font-medium">{reconciliation.runNumber || reconciliation.runName || 'N/A'}</p>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium">Expected</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(reconciliation.expectedTotal || 0)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium">Actual</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(reconciliation.actualTotal || 0)}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium">Variance</span>
            </div>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(Math.abs(reconciliation.varianceAmount || 0))}
            </p>
          </div>
        </div>

        {/* Notes */}
        {reconciliation.notes && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
            <p className="text-sm text-gray-600">{reconciliation.notes}</p>
          </div>
        )}

        {/* Reconciliation Items */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Reconciliation Items</h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No items found</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.itemType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getItemStatusBadge(item.status)}
                      {item.status === 'pending' && reconciliation.status !== 'completed' && (
                        <button
                          onClick={() => handleResolveItem(item.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Expected:</span>
                      <span className="ml-2 font-medium">{formatCurrency(item.expectedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <span className="ml-2 font-medium">{formatCurrency(item.actualAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Variance:</span>
                      <span className={`ml-2 font-medium ${item.varianceAmount === 0 ? 'text-gray-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(item.varianceAmount))}
                      </span>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completion Notes */}
        {canComplete && (
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Completion Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Add any final notes about this reconciliation..."
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}

