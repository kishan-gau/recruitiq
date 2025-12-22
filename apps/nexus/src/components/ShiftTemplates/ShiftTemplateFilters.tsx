import React from 'react';
import { ShiftTemplateFilters, ShiftTemplateSortField, SortOrder } from '@/types/shift-templates';

interface ShiftTemplateFiltersProps {
  filters: ShiftTemplateFilters;
  onFilterChange: (filters: Partial<ShiftTemplateFilters>) => void;
  onSort: (sortBy: ShiftTemplateSortField, sortOrder: SortOrder) => void;
}

const ShiftTemplateFiltersComponent: React.FC<ShiftTemplateFiltersProps> = ({
  filters,
  onFilterChange,
  onSort
}) => {
  const handleSearchChange = (value: string) => {
    onFilterChange({ search: value });
  };

  const handleActiveFilterChange = (isActive: boolean | undefined) => {
    onFilterChange({ isActive });
  };

  const handleSortChange = (field: ShiftTemplateSortField, direction: SortOrder) => {
    onSort(field, direction);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 border-t">
      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
          Search Templates
        </label>
        <input
          type="text"
          id="search"
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or description..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Active Status Filter */}
        <div>
          <label htmlFor="activeFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="activeFilter"
            value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const value = e.target.value;
              handleActiveFilterChange(
                value === 'all' ? undefined : value === 'active'
              );
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Templates</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sortBy"
            onChange={(e) => {
              const field = e.target.value as ShiftTemplateSortField;
              handleSortChange(field, 'desc'); // Default to desc
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="duration">Duration</option>
            <option value="roleCount">Role Count</option>
            <option value="stationCount">Station Count</option>
            <option value="priority">Priority</option>
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      <div className="pt-2 border-t">
        <button
          onClick={() => onFilterChange({})}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default ShiftTemplateFiltersComponent;