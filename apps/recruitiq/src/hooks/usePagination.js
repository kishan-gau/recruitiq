import { useState, useCallback, useMemo } from 'react'

/**
 * Custom hook for managing pagination state
 * Provides helpers for page navigation and size changes
 * 
 * @param {number} initialPage - Initial page number (default: 1)
 * @param {number} initialPageSize - Initial page size (default: 10)
 * @returns {object} Pagination state and helpers
 */
export function usePagination(initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  
  // Calculate offset for API calls
  const offset = useMemo(() => {
    return (page - 1) * pageSize
  }, [page, pageSize])
  
  // Reset to first page (useful when filters change)
  const resetPage = useCallback(() => {
    setPage(1)
  }, [])
  
  // Go to specific page
  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, newPage))
  }, [])
  
  // Go to next page
  const nextPage = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])
  
  // Go to previous page
  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1))
  }, [])
  
  // Change page size and reset to first page
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize)
    setPage(1)
  }, [])
  
  // Calculate total pages from total items
  const getTotalPages = useCallback((totalItems) => {
    return Math.ceil(totalItems / pageSize)
  }, [pageSize])
  
  return {
    // Current state
    page,
    pageSize,
    offset,
    
    // Navigation methods
    setPage: goToPage,
    nextPage,
    prevPage,
    resetPage,
    
    // Page size methods
    setPageSize: changePageSize,
    
    // Helpers
    getTotalPages,
  }
}
