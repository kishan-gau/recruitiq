/**
 * DataTable Component
 * 
 * Reusable data table with sorting, filtering, pagination, and selection
 */

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import Pagination from './Pagination';
import TableSkeleton from './TableSkeleton';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  error?: Error | null;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  getRowId?: (row: T) => string;
  
  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  
  // Actions
  actions?: (row: T) => React.ReactNode;
  bulkActions?: React.ReactNode;
  
  // Styling
  className?: string;
  emptyMessage?: string;
  compact?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder = 'asc',
  onSort,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  getRowId = (row: any) => row.id,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  bulkActions,
  className = '',
  emptyMessage = 'No data available',
  compact = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Handle sort
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  // Check if all rows are selected
  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every(row => selectedRows.has(getRowId(row)));
  }, [data, selectedRows, getRowId]);

  // Handle select all
  const handleSelectAll = () => {
    onSelectAll?.(!allSelected);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading data: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton rows={pageSize} columns={columns.length} />;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with search and bulk actions */}
      {(searchable || bulkActions) && (
        <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}
          
          {bulkActions && selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} selected
              </span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} w-12`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''}`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.sortKey || column.key)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      {column.header}
                      {getSortIcon(column.sortKey || column.key)}
                    </button>
                  ) : (
                    <span>{column.header}</span>
                  )}
                </th>
              ))}
              
              {actions && (
                <th className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} w-24 text-right`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.has(rowId);
                
                return (
                  <tr
                    key={rowId || index}
                    className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {selectable && (
                      <td className={`${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(rowId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} text-sm text-gray-900 ${
                          column.align === 'right' ? 'text-right' :
                          column.align === 'center' ? 'text-center' :
                          'text-left'
                        }`}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                    
                    {actions && (
                      <td className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} text-right`}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
            </span>
            
            {onPageSizeChange && (
              <div className="flex items-center gap-2 ml-4">
                <label htmlFor="pageSize" className="text-sm text-gray-600">
                  Per page:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange || (() => {})}
          />
        </div>
      )}
    </div>
  );
}

