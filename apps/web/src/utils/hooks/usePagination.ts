import { useState, useCallback } from 'react';

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getTotalPages: (totalItems: number) => number;
  resetPage: () => void;
}

/**
 * Hook for managing pagination state
 * @param initialPage - Initial page number (default: 1)
 * @param initialPageSize - Initial page size (default: 25)
 * @returns Pagination state and controls
 */
export function usePagination(
  initialPage: number = 1, 
  initialPageSize: number = 25
): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const getTotalPages = useCallback((totalItems: number) => Math.ceil(totalItems / pageSize), [pageSize]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when page size changes
  }, []);

  return {
    page,
    pageSize,
    setPage,
    setPageSize: handlePageSizeChange,
    getTotalPages,
    resetPage,
  };
}
