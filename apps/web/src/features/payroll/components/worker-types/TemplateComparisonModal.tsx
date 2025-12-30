import { ArrowRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import Dialog from '@/components/ui/Dialog';
import { useCompareTemplates } from '@/hooks/useWorkerTypes';

interface TemplateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromTemplateCode: string;
  toTemplateCode: string;
  fromTemplateName?: string;
  toTemplateName?: string;
}

export default function TemplateComparisonModal({
  isOpen,
  onClose,
  fromTemplateCode,
  toTemplateCode,
  fromTemplateName,
  toTemplateName,
}: TemplateComparisonModalProps) {
  const { data: comparison, isLoading } = useCompareTemplates(
    fromTemplateCode,
    toTemplateCode,
    isOpen
  );

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Template Versions"
      size="xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      }
    >
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Comparing templates...</p>
          </div>
        )}

        {/* Comparison Results */}
        {!isLoading && comparison && (
          <>
            {/* Template Headers */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Current Template
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fromTemplateName || fromTemplateCode}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  v{comparison.fromVersion}
                </p>
              </div>

              <ArrowRight className="w-8 h-8 text-gray-400 dark:text-gray-600" />

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  New Template
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {toTemplateName || toTemplateCode}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  v{comparison.toVersion}
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {comparison.componentsAdded > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{comparison.componentsAdded}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Components Added
                  </div>
                </div>
              )}

              {comparison.componentsRemoved > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    -{comparison.componentsRemoved}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200 mt-1">
                    Components Removed
                  </div>
                </div>
              )}

              {comparison.componentsModified > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {comparison.componentsModified}
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Components Modified
                  </div>
                </div>
              )}
            </div>

            {/* No Changes */}
            {comparison.differences.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The templates are identical. No differences found.
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Differences */}
            {comparison.differences.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  Detailed Changes
                </h3>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {comparison.differences.map((diff: any, index: number) => (
                    <div
                      key={index}
                      className={`py-3 ${
                        index !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {diff.changeType === 'added' && (
                          <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {diff.changeType === 'removed' && (
                          <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                        {diff.changeType === 'modified' && (
                          <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {diff.componentName}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                diff.changeType === 'added'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : diff.changeType === 'removed'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              }`}
                            >
                              {diff.changeType}
                            </span>
                          </div>

                          {/* Field Changes */}
                          {diff.fieldChanges && diff.fieldChanges.length > 0 && (
                            <div className="space-y-2 ml-2">
                              {diff.fieldChanges.map((fieldChange: any, fieldIndex: number) => (
                                <div
                                  key={fieldIndex}
                                  className="text-sm bg-white dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {fieldChange.field}:
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Old: </span>
                                      <span className="text-red-600 dark:text-red-400">
                                        {fieldChange.oldValue ?? 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">New: </span>
                                      <span className="text-green-600 dark:text-green-400">
                                        {fieldChange.newValue ?? 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Description */}
                          {diff.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {diff.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Summary */}
            {comparison.differences.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Impact Summary
                </h4>
                <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  {comparison.componentsAdded > 0 && (
                    <li>• {comparison.componentsAdded} new component(s) will be added to worker pay structures</li>
                  )}
                  {comparison.componentsRemoved > 0 && (
                    <li>• {comparison.componentsRemoved} component(s) will be removed from worker pay structures</li>
                  )}
                  {comparison.componentsModified > 0 && (
                    <li>• {comparison.componentsModified} component(s) will have their settings updated</li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
