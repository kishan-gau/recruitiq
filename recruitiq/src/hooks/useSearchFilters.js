import { useState, useCallback, useMemo } from 'react'

/**
 * Custom hook for managing search and filter state
 * Provides helpers for adding/removing filters and building filter objects
 * 
 * @param {object} initialFilters - Initial filter values
 * @returns {object} Filter state and helpers
 * 
 * @example
 * const {
 *   filters,
 *   setFilter,
 *   removeFilter,
 *   clearFilters,
 *   activeFilters,
 *   hasActiveFilters
 * } = useSearchFilters({ search: '', status: '', location: '' })
 */
export function useSearchFilters(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters)

  // Set a single filter
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Remove a single filter
  const removeFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  // Get array of active filters (for filter chips)
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: String(value)
      }))
  }, [filters])

  // Check if any filters are active
  const hasActiveFilters = activeFilters.length > 0

  // Get filters as query params (excludes empty values)
  const queryParams = useMemo(() => {
    const params = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params[key] = value
      }
    })
    return params
  }, [filters])

  return {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    activeFilters,
    hasActiveFilters,
    queryParams,
  }
}
