import { Plus, Minus, Edit } from 'lucide-react';

import { StatusBadge, Dialog } from '@recruitiq/ui';
import { useCompareVersions } from '@/hooks/useCompareVersions';


interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromId: string;
  toId: string;
}

interface ComponentChange {
  componentCode: string;
  componentName: string;
  changeType: 'added' | 'removed' | 'modified';
  differences?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export default function VersionComparisonModal({
  isOpen,
  onClose,
  fromId,
  toId,
}: VersionComparisonModalProps) {
  const { comparison, isLoading, error } = useCompareVersions(fromId, toId);
  
  // Debug logging
  console.log('VersionComparisonModal - comparison data:', comparison);
  console.log('VersionComparisonModal - isLoading:', isLoading);
  console.log('VersionComparisonModal - error:', error);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getChangeVariant = (changeType: string): 'green' | 'red' | 'yellow' | 'gray' => {
    switch (changeType) {
      case 'added':
        return 'green';
      case 'removed':
        return 'red';
      case 'modified':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      component_name: 'Name',
      component_category: 'Category',
      component_type: 'Type',
      base_amount: 'Base Amount',
      percentage: 'Percentage',
      formula: 'Formula',
      display_sequence: 'Display Sequence',
      is_taxable: 'Taxable',
      is_pro_ratable: 'Pro-ratable',
    };
    return labels[field] || field;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Template Versions"
    >
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">Failed to compare versions: {error.message}</p>
        </div>
      )}

      {comparison && (comparison.fromVersion || comparison.from) && (comparison.toVersion || comparison.to) && (
        <div className="space-y-4">
          {/* Version Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase mb-1">From Version</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">v{(comparison.fromVersion || comparison.from).versionString}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge variant="gray">{(comparison.fromVersion || comparison.from).status.toUpperCase()}</StatusBadge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {(comparison.fromVersion || comparison.from).componentCount || (comparison.fromVersion || comparison.from).componentsCount} components
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase mb-1">To Version</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">v{(comparison.toVersion || comparison.to).versionString}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge variant="gray">{(comparison.toVersion || comparison.to).status.toUpperCase()}</StatusBadge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {(comparison.toVersion || comparison.to).componentCount || (comparison.toVersion || comparison.to).componentsCount} components
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {comparison.summary && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Summary of Changes</p>
              <div className="flex gap-3">
                <StatusBadge variant="green">
                  {comparison.summary.addedCount || 0} Added
                </StatusBadge>
                <StatusBadge variant="yellow">
                  {comparison.summary.modifiedCount || 0} Modified
                </StatusBadge>
                <StatusBadge variant="red">
                  {comparison.summary.removedCount || 0} Removed
                </StatusBadge>
              </div>
            </div>
          )}

          {/* Component Changes */}
          {comparison.changes && Array.isArray(comparison.changes) && comparison.changes.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Component Changes</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {comparison.changes.map((change: ComponentChange, index: number) => (
                    <div
                      key={index}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start gap-3">
                        <div className="mt-0.5">{getChangeIcon(change.changeType)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                              {change.componentCode}
                            </span>
                            <StatusBadge variant={getChangeVariant(change.changeType)}>
                              {change.changeType.toUpperCase()}
                            </StatusBadge>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{change.componentName}</p>
                          
                          {change.differences && change.differences.length > 0 && (
                            <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                              {change.differences.map((diff, diffIndex) => (
                                <div key={diffIndex} className="text-xs">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {renderFieldLabel(diff.field)}:
                                  </span>
                                  <div className="flex gap-2 mt-0.5">
                                    <span className="text-red-600 dark:text-red-400 line-through">
                                      {formatValue(diff.oldValue)}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500">→</span>
                                    <span className="text-green-600 dark:text-green-400">
                                      {formatValue(diff.newValue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                No component changes detected between these versions.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
