import { useState } from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2, Eye } from 'lucide-react';
import clsx from 'clsx';
import WorkerAvatar from './WorkerAvatar';
import StatusBadge from './StatusBadge';
import Badge from './Badge';
import CurrencyDisplay from './CurrencyDisplay';
import DropdownMenu, { DropdownMenuItem } from './DropdownMenu';

export interface Worker {
  id: string;
  employeeNumber: string;
  fullName: string;
  type: string;
  compensationType: 'hourly' | 'salary';
  compensationAmount: number;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
}

type SortField = 'employeeNumber' | 'fullName' | 'type' | 'compensationAmount' | 'status';
type SortDirection = 'asc' | 'desc';

interface WorkerTableProps {
  workers: Worker[];
  onSort?: (field: SortField, direction: SortDirection) => void;
  onSelect?: (workerIds: string[]) => void;
  onView?: (workerId: string) => void;
  onEdit?: (workerId: string) => void;
  onDelete?: (workerId: string) => void;
  selectedIds?: string[];
  className?: string;
}

export default function WorkerTable({
  workers,
  onSort,
  onSelect,
  onView,
  onEdit,
  onDelete,
  selectedIds = [],
  className,
}: WorkerTableProps) {
  const [sortField, setSortField] = useState<SortField>('employeeNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === workers.length) {
      onSelect?.([]);
    } else {
      onSelect?.(workers.map((w) => w.id));
    }
  };

  const handleSelectOne = (workerId: string) => {
    if (selectedIds.includes(workerId)) {
      onSelect?.(selectedIds.filter((id) => id !== workerId));
    } else {
      onSelect?.([...selectedIds, workerId]);
    }
  };

  const getActionItems = (): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [];
    
    if (onView) {
      items.push({
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
      });
    }
    
    if (onEdit) {
      items.push({
        id: 'edit',
        label: 'Edit Worker',
        icon: <Edit className="w-4 h-4" />,
      });
    }
    
    if (onDelete) {
      items.push({
        id: 'delete',
        label: 'Delete Worker',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'danger',
      });
    }
    
    return items;
  };

  const handleAction = (workerId: string, actionId: string) => {
    switch (actionId) {
      case 'view':
        onView?.(workerId);
        break;
      case 'edit':
        onEdit?.(workerId);
        break;
      case 'delete':
        onDelete?.(workerId);
        break;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-500" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-500" />
    );
  };

  return (
    <div className={clsx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {onSelect && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === workers.length && workers.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                  />
                </th>
              )}
              
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('employeeNumber')}
                  className="group flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-blue-500"
                >
                  <span>Employee #</span>
                  <SortIcon field="employeeNumber" />
                </button>
              </th>

              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('fullName')}
                  className="group flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-blue-500"
                >
                  <span>Name</span>
                  <SortIcon field="fullName" />
                </button>
              </th>

              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('type')}
                  className="group flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-blue-500"
                >
                  <span>Type</span>
                  <SortIcon field="type" />
                </button>
              </th>

              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('compensationAmount')}
                  className="group flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-blue-500"
                >
                  <span>Compensation</span>
                  <SortIcon field="compensationAmount" />
                </button>
              </th>

              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="group flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-blue-500"
                >
                  <span>Status</span>
                  <SortIcon field="status" />
                </button>
              </th>

              <th className="px-6 py-3 text-right">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {workers.map((worker) => {
              const isSelected = selectedIds.includes(worker.id);
              const actionItems = getActionItems();

              return (
                <tr
                  key={worker.id}
                  className={clsx(
                    'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  {onSelect && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(worker.id)}
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                      />
                    </td>
                  )}

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {worker.employeeNumber}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <WorkerAvatar fullName={worker.fullName} size="sm" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {worker.fullName}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="blue" size="sm">
                      {worker.type}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <CurrencyDisplay amount={worker.compensationAmount} className="font-medium" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {worker.compensationType === 'hourly' ? 'per hour' : 'per month'}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={worker.status} size="sm" />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {actionItems.length > 0 && (
                      <DropdownMenu
                        items={actionItems}
                        onSelect={(actionId) => handleAction(worker.id, actionId)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {workers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No workers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
