import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseSearchFiltersReturn<T> {
  filters: T;
  setFilter: (key: keyof T, value: string) => void;
  removeFilter: (key: keyof T) => void;
  clearFilters: () => void;
  activeFilters: Array<{ key: string; label: string; value: string }>;
  queryParams: Partial<T>;
}

/**
 * Hook for managing search filters with URL synchronization
 * Syncs filter state with URL search parameters
 * @param initialFilters - Initial filter state
 * @returns Filter state and controls
 */
export function useSearchFilters<T extends Record<string, string>>(
  initialFilters: T
): UseSearchFiltersReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<T>(() => {
    const urlFilters = { ...initialFilters };
    Object.keys(initialFilters).forEach((key) => {
      const urlValue = searchParams.get(key);
      if (urlValue) {
        (urlFilters as any)[key] = urlValue;
      }
    });
    return urlFilters;
  });

  // Set a single filter and update URL
  const setFilter = useCallback((key: keyof T, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL params
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key as string, value);
    } else {
      newSearchParams.delete(key as string);
    }
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // Remove a single filter
  const removeFilter = useCallback((key: keyof T) => {
    setFilter(key, '');
  }, [setFilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchParams(new URLSearchParams());
  }, [initialFilters, setSearchParams]);

  // Get active filters with labels
  const activeFilters = useMemo(() => Object.entries(filters)
      .filter(([_, value]) => value !== '')
      .map(([key, value]) => ({
        key,
        label: getFilterLabel(key, value),
        value: value as string
      })), [filters]);

  // Get query params object (non-empty values)
  const queryParams = useMemo(() => {
    const params: Partial<T> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') {
        (params as any)[key] = value;
      }
    });
    return params;
  }, [filters]);

  return {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    activeFilters,
    queryParams
  };
}

/**
 * Generate human-readable labels for filters
 */
function getFilterLabel(key: string, value: string): string {
  const labelMap: Record<string, Record<string, string>> = {
    status: {
      draft: 'Draft',
      open: 'Open',
      closed: 'Closed'
    },
    type: {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      'contract': 'Contract',
      'internship': 'Internship'
    },
    employmentType: {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      'contract': 'Contract',
      'internship': 'Internship'
    }
  };

  if (key === 'search') {
    return `Search: ${value}`;
  }

  const categoryLabels = labelMap[key];
  if (categoryLabels && categoryLabels[value]) {
    return categoryLabels[value];
  }

  // Fallback: capitalize first letter
  return value.charAt(0).toUpperCase() + value.slice(1);
}
