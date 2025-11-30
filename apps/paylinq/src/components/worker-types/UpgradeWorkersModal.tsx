import { useState, useMemo } from 'react';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle, Users, XCircle } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import { useWorkerTypeUpgradeStatus, usePreviewWorkerTypeUpgrade, useUpgradeWorkersToTemplate } from '@/hooks/useWorkerTypes';


interface UpgradeWorkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerTypeId: string;
  workerTypeName: string;
}

export default function UpgradeWorkersModal({
  isOpen,
  onClose,
  workerTypeId,
  workerTypeName,
}: UpgradeWorkersModalProps) {
  // ✅ Memoize default date to avoid recalculation on every render
  const defaultDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [effectiveDate, setEffectiveDate] = useState(defaultDate);
  const [notifyWorkers, setNotifyWorkers] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch upgrade status
  const { data: upgradeStatus, isLoading: isLoadingStatus } = useWorkerTypeUpgradeStatus(workerTypeId);
  const { data: preview, isLoading: isLoadingPreview } = usePreviewWorkerTypeUpgrade(
    workerTypeId,
    showPreview
  );
  const upgradeMutation = useUpgradeWorkersToTemplate();

  const handleUpgrade = async () => {
    if (!upgradeStatus) return;

    await upgradeMutation.mutateAsync({
      workerTypeId,
      data: {
        effectiveDate,
        notifyWorkers,
      },
    });

    onClose();
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Workers to New Template"
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={upgradeMutation.isPending}
          >
            Cancel
          </button>
          {!showPreview ? (
            <button
              type="button"
              onClick={handlePreview}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoadingStatus || !upgradeStatus?.needsUpgrade}
            >
              Preview Changes
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending || isLoadingStatus || !upgradeStatus?.needsUpgrade}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Loading State */}
        {isLoadingStatus && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading upgrade information...</p>
          </div>
        )}

        {/* No Upgrade Needed */}
        {!isLoadingStatus && upgradeStatus && !upgradeStatus.needsUpgrade && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  All Workers Up to Date
                </h3>
                <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                  All workers with worker type "{workerTypeName}" are already using the latest template version.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Information */}
        {!isLoadingStatus && upgradeStatus && upgradeStatus.needsUpgrade && (
          <>
            {/* Summary Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Template Update Available
                  </h3>
                  <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                    A new version of the pay structure template is available for this worker type.
                  </p>
                </div>
              </div>
            </div>

            {/* Template Version Info */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Current Template</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    v{upgradeStatus.currentTemplateVersion}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {upgradeStatus.currentTemplateName}
                  </p>
                </div>

                <ArrowRight className="w-8 h-8 text-gray-400 dark:text-gray-600 flex-shrink-0 mx-4" />

                <div className="flex-1 text-right">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">New Template</h4>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    v{upgradeStatus.latestTemplateVersion}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {upgradeStatus.latestTemplateName}
                  </p>
                </div>
              </div>

              {/* Workers Count */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Workers to Upgrade</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {upgradeStatus.workersNeedingUpgrade}
                  </span>
                </div>
              </div>
            </div>

            {/* Configuration */}
            {!showPreview && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  Upgrade Configuration
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Effective Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The date when the new template will take effect for all workers
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyWorkers}
                    onChange={(e) => setNotifyWorkers(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Notify Workers
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send email notifications to affected workers about the template update
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  Change Preview
                </h3>

                {isLoadingPreview ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                  </div>
                ) : preview ? (
                  <div className="space-y-4">
                    {/* Component Changes Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      {preview.componentsAdded > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            +{preview.componentsAdded}
                          </div>
                          <div className="text-sm text-green-800 dark:text-green-200 mt-1">
                            Components Added
                          </div>
                        </div>
                      )}

                      {preview.componentsRemoved > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            -{preview.componentsRemoved}
                          </div>
                          <div className="text-sm text-red-800 dark:text-red-200 mt-1">
                            Components Removed
                          </div>
                        </div>
                      )}

                      {preview.componentsModified > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {preview.componentsModified}
                          </div>
                          <div className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                            Components Modified
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Changes */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {preview.changes.map((change: any, index: number) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 py-3 ${
                            index !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                          }`}
                        >
                          {change.changeType === 'added' && (
                            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          {change.changeType === 'removed' && (
                            <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          {change.changeType === 'modified' && (
                            <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {change.componentName}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  change.changeType === 'added'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : change.changeType === 'removed'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                }`}
                              >
                                {change.changeType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Effective Date Reminder */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <Calendar className="w-4 h-4" />
                        <span>
                          These changes will take effect on <strong>{new Date(effectiveDate).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
