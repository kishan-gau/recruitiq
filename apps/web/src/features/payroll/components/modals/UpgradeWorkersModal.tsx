import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField } from '@recruitiq/ui';
import { useToast } from '@/contexts/ToastContext';


interface UpgradeWorkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVersion: {
    template_id: number;
    versionString: string;
    activeWorkersCount: number;
  };
  onUpgradeComplete: () => void;
}

export default function UpgradeWorkersModal({
  isOpen,
  onClose,
  sourceVersion,
  onUpgradeComplete, // Callback for when upgrade completes successfully
}: UpgradeWorkersModalProps) {
  const toast = useToast();
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    toast.info('Bulk worker upgrade feature coming soon');
    // TODO: Call API when backend endpoint is ready
    // await paylinq.upgradeWorkers({ effectiveDate, reason, ... });
    onUpgradeComplete(); // Notify parent of success
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Workers to New Version"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                Upgrading workers from version <strong>v{sourceVersion.versionString}</strong>
              </p>
              <p className="text-sm text-blue-800 mt-1">
                {sourceVersion.activeWorkersCount} worker(s) currently on this version
              </p>
            </div>
          </div>
        </div>

        <FormField label="Effective From" required>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </FormField>

        <FormField label="Reason (Optional)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={3}
            placeholder="Provide a reason for this upgrade..."
          />
        </FormField>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Worker selection and batch upgrade functionality will be available soon.
            This will allow you to select specific workers and upgrade them in bulk.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Preview Upgrade
        </button>
      </div>
    </Dialog>
  );
}

