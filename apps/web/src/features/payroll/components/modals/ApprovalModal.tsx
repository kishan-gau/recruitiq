import { User } from 'lucide-react';
import { useState } from 'react';

import Dialog from '@/components/ui/Dialog';
import FormField, { TextArea } from '@/components/ui/FormField';
import { useToast } from '@/contexts/ToastContext';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryIds: string[];
  action: 'approve' | 'reject';
  onSuccess: (action: 'approve' | 'reject', entryIds: string[], notes?: string) => Promise<void>;
}

export default function ApprovalModal({ isOpen, onClose, entryIds, action, onSuccess }: ApprovalModalProps) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Call parent's onSuccess handler which makes the API call
      await onSuccess(action, entryIds, notes);
      
      success(`Time ${entryIds.length === 1 ? 'entry' : 'entries'} ${action}d successfully`);
      onClose();
      setNotes('');
    } catch (err) {
      // Handle validation errors from API
      const apiError = err as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const fieldLabels: Record<string, string> = {
          entryIds: 'Time Entries',
          action: 'Action',
          notes: 'Notes',
          reason: 'Reason',
        };
        
        const errors = apiError.response.data.errors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        error(errors || 'Please fix the validation errors');
      } else {
        error(apiError.response?.data?.message || apiError.message || `Failed to ${action} time entries. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const title = action === 'approve' ? 'Approve Time Entries' : 'Reject Time Entries';
  const message =
    action === 'approve'
      ? `You are about to approve ${entryIds.length} time ${entryIds.length === 1 ? 'entry' : 'entries'}.`
      : `You are about to reject ${entryIds.length} time ${entryIds.length === 1 ? 'entry' : 'entries'}. Please provide a reason.`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>
              {entryIds.length} {entryIds.length === 1 ? 'entry' : 'entries'} selected
            </span>
          </div>
        </div>

        <FormField
          label={action === 'reject' ? 'Reason for Rejection' : 'Notes (Optional)'}
          required={action === 'reject'}
        >
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              action === 'reject'
                ? 'Please provide a reason for rejection...'
                : 'Add any notes or comments...'
            }
            rows={4}
          />
        </FormField>
      </div>
    </Dialog>
  );
}
