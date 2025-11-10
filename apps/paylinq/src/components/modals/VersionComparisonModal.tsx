import { Dialog, Badge } from '@/components/ui';
import { useCompareVersions } from '@/hooks/useCompareVersions';
import { Plus, Minus, Edit } from 'lucide-react';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromId: number;
  toId: number;
}

interface ComponentChange {
  component_code: string;
  component_name: string;
  status: 'added' | 'removed' | 'modified';
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

  const getChangeIcon = (status: string) => {
    switch (status) {
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

  const getChangeVariant = (status: string): 'green' | 'red' | 'yellow' | 'gray' => {
    switch (status) {
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to compare versions: {error.message}</p>
        </div>
      )}

      {comparison && (
        <div className="space-y-4">
          {/* Version Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 uppercase mb-1">From Version</p>
              <p className="text-lg font-semibold">v{comparison.fromVersion.versionString}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="gray">{comparison.fromVersion.status.toUpperCase()}</Badge>
                <span className="text-sm text-gray-600">
                  {comparison.fromVersion.componentsCount} components
                </span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 uppercase mb-1">To Version</p>
              <p className="text-lg font-semibold">v{comparison.toVersion.versionString}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="gray">{comparison.toVersion.status.toUpperCase()}</Badge>
                <span className="text-sm text-gray-600">
                  {comparison.toVersion.componentsCount} components
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Summary of Changes</p>
            <div className="flex gap-3">
              <Badge variant="green">
                {comparison.summary.addedCount} Added
              </Badge>
              <Badge variant="yellow">
                {comparison.summary.modifiedCount} Modified
              </Badge>
              <Badge variant="red">
                {comparison.summary.removedCount} Removed
              </Badge>
            </div>
          </div>

          {/* Component Changes */}
          {comparison.changes && comparison.changes.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Component Changes</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {comparison.changes.map((change: ComponentChange, index: number) => (
                    <div
                      key={index}
                      className="border-b border-gray-200 last:border-b-0"
                    >
                      <div className="p-3 bg-white hover:bg-gray-50 flex items-start gap-3">
                        <div className="mt-0.5">{getChangeIcon(change.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">
                              {change.component_code}
                            </span>
                            <Badge variant={getChangeVariant(change.status)}>
                              {change.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{change.component_name}</p>
                          
                          {change.differences && change.differences.length > 0 && (
                            <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                              {change.differences.map((diff, diffIndex) => (
                                <div key={diffIndex} className="text-xs">
                                  <span className="font-medium text-gray-700">
                                    {renderFieldLabel(diff.field)}:
                                  </span>
                                  <div className="flex gap-2 mt-0.5">
                                    <span className="text-red-600 line-through">
                                      {formatValue(diff.oldValue)}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600">
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                No component changes detected between these versions.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
