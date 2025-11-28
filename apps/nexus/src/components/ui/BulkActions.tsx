import { useState } from 'react';
import { CheckSquare, Square, Trash2, Download, Edit, Archive, MoreHorizontal } from 'lucide-react';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (selectedIds: string[]) => Promise<void> | void;
  variant?: 'default' | 'danger' | 'success';
  requireConfirmation?: boolean;
  confirmMessage?: string;
}

interface BulkActionsProps<T extends { id: string }> {
  items: T[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  actions: BulkAction[];
  idKey?: keyof T;
}

export default function BulkActions<T extends { id: string }>({
  items,
  selectedIds,
  onSelectionChange,
  actions,
  idKey = 'id' as keyof T,
}: BulkActionsProps<T>) {
  const [isProcessing, setIsProcessing] = useState(false);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => String(item[idKey])));
    }
  };

  const handleAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) return;

    if (action.requireConfirmation) {
      const message = action.confirmMessage || `Are you sure you want to ${action.label.toLowerCase()} ${selectedIds.length} item(s)?`;
      if (!confirm(message)) return;
    }

    setIsProcessing(true);
    try {
      await action.action(selectedIds);
      onSelectionChange([]); // Clear selection after action
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Action failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Select All Checkbox */}
      <button
        onClick={handleSelectAll}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        disabled={isProcessing}
      >
        {allSelected ? (
          <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        ) : someSelected ? (
          <div className="h-5 w-5 flex items-center justify-center">
            <div className="h-3 w-3 bg-indigo-600 dark:bg-indigo-400 rounded" />
          </div>
        ) : (
          <Square className="h-5 w-5" />
        )}
        <span>
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : 'Select all'}
        </span>
      </button>

      {/* Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  action.variant === 'danger'
                    ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50'
                    : action.variant === 'success'
                    ? 'text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50'
                    : 'text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                }
              `}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Common bulk actions for reuse
 */
export const COMMON_BULK_ACTIONS = {
  DELETE: (onDelete: (ids: string[]) => Promise<void>): BulkAction => ({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    action: onDelete,
    variant: 'danger',
    requireConfirmation: true,
    confirmMessage: 'Are you sure you want to delete the selected items? This action cannot be undone.',
  }),

  EXPORT: (onExport: (ids: string[]) => Promise<void>): BulkAction => ({
    id: 'export',
    label: 'Export',
    icon: <Download className="h-4 w-4" />,
    action: onExport,
    variant: 'default',
  }),

  ARCHIVE: (onArchive: (ids: string[]) => Promise<void>): BulkAction => ({
    id: 'archive',
    label: 'Archive',
    icon: <Archive className="h-4 w-4" />,
    action: onArchive,
    variant: 'default',
    requireConfirmation: true,
  }),

  EDIT: (onEdit: (ids: string[]) => Promise<void>): BulkAction => ({
    id: 'edit',
    label: 'Edit',
    icon: <Edit className="h-4 w-4" />,
    action: onEdit,
    variant: 'default',
  }),
};
