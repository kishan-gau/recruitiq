/**
 * Document Search Component
 * Advanced search with filters, autocomplete, and suggestions
 */

import { Search, X, Filter, Tag, Calendar, User } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import type { DocumentCategory, DocumentStatus } from '@/types/documents.types';
import { useDebounce } from '@/utils/hooks';

interface DocumentSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  onFiltersChange?: (filters: DocumentSearchFilters) => void;
}

export interface DocumentSearchFilters {
  categories?: DocumentCategory[];
  status?: DocumentStatus[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  employeeId?: string;
}

export default function DocumentSearch({
  value,
  onChange,
  placeholder = 'Search documents...',
  showFilters = false,
  onFiltersChange,
}: DocumentSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filters, setFilters] = useState<DocumentSearchFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  const debouncedValue = useDebounce(value, 300);

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
    }

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterMenu]);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const handleClear = () => {
    onChange('');
    setFilters({});
    inputRef.current?.focus();
  };

  const hasActiveFilters = Object.values(filters).some(
    (filter) => Array.isArray(filter) ? filter.length > 0 : !!filter
  );

  const activeFilterCount = [
    filters.categories?.length || 0,
    filters.status?.length || 0,
    filters.dateFrom ? 1 : 0,
    filters.dateTo ? 1 : 0,
    filters.tags?.length || 0,
    filters.employeeId ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="relative">
      {/* Search Input */}
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-lg 
                   transition-all ${
                     isFocused
                       ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
                       : 'border-gray-300 shadow-sm'
                   }`}
      >
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-900 placeholder-gray-400"
        />

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 
                         text-xs font-medium rounded-full">
            <Filter className="w-3 h-3" />
            {activeFilterCount}
          </span>
        )}

        {/* Clear Button */}
        {(value || hasActiveFilters) && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Filter Toggle */}
        {showFilters && (
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`p-2 rounded-lg transition-colors ${
              showFilterMenu || hasActiveFilters
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Advanced filters"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Menu */}
      {showFilters && showFilterMenu && (
        <div
          ref={filterMenuRef}
          className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 
                   rounded-lg shadow-lg z-10 space-y-4"
        >
          {/* Categories */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      categories: prev.categories?.includes(category)
                        ? prev.categories.filter((c) => c !== category)
                        : [...(prev.categories || []), category],
                    }));
                  }}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filters.categories?.includes(category)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4" />
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      status: prev.status?.includes(status)
                        ? prev.status.filter((s) => s !== status)
                        : [...(prev.status || []), status],
                    }));
                  }}
                  className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${
                    filters.status?.includes(status)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">From</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">To</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <button
              onClick={() => setFilters({})}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear all filters
            </button>
            <button
              onClick={() => setShowFilterMenu(false)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg 
                       hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Search Tips */}
      {isFocused && !value && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border 
                      border-gray-200 rounded-lg shadow-lg z-10">
          <p className="text-sm text-gray-600 mb-2">Search tips:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Search by document name, description, or tags</li>
            <li>• Use filters to narrow down results</li>
            <li>• Search is case-insensitive</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Constants
const CATEGORIES: DocumentCategory[] = [
  'contract',
  'policy',
  'handbook',
  'training',
  'personal',
  'payroll',
  'benefit',
  'performance',
  'compliance',
  'other',
];

const STATUSES: DocumentStatus[] = ['active', 'archived', 'expired', 'draft'];
