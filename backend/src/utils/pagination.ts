/**
 * Pagination Utilities
 * 
 * Provides pagination helpers for list endpoints
 * Supports both offset-based and cursor-based pagination
 * 
 * @module utils/pagination
 */

/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

/**
 * Pagination metadata for response
 */
export interface PaginationMeta {
  page?: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev?: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

/**
 * Normalizes offset-based pagination parameters
 * 
 * Validates and constrains pagination values to safe ranges
 * 
 * @param page - Page number (1-indexed, optional)
 * @param limit - Items per page (optional)
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @param defaultLimit - Default limit if not provided (default: 20)
 * @returns Normalized pagination parameters
 * 
 * @example
 * const { page, limit, offset } = normalizePagination(
 *   req.query.page,
 *   req.query.limit
 * );
 */
export function normalizePagination(
  page?: any,
  limit?: any,
  maxLimit: number = 100,
  defaultLimit: number = 20
): OffsetPaginationParams {
  // Parse and validate page
  let pageNum = parseInt(page) || 1;
  pageNum = Math.max(1, pageNum); // Minimum page 1

  // Parse and validate limit
  let limitNum = parseInt(limit) || defaultLimit;
  limitNum = Math.min(maxLimit, Math.max(1, limitNum)); // Between 1 and maxLimit

  // Calculate offset
  const offset = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
}

/**
 * Calculates pagination metadata for response
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items in dataset
 * @returns Pagination metadata
 * 
 * @example
 * const meta = getPaginationMeta(1, 20, 150);
 * // Returns: { page: 1, limit: 20, total: 150, totalPages: 8, hasNext: true, hasPrev: false }
 */
export function getPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Calculates offset for database queries
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for OFFSET clause
 * 
 * @example
 * const offset = calculateOffset(2, 20); // Returns 20
 * // SQL: SELECT * FROM table LIMIT 20 OFFSET 20
 */
export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

/**
 * Cursor-based pagination - encodes a cursor from item data
 * 
 * Cursor should be created from the sort field of the last item
 * in the result set
 * 
 * @param sortValue - Value of the sort field (e.g., timestamp, ID)
 * @param itemId - Unique identifier of the item
 * @returns Encoded cursor string
 * 
 * @example
 * const lastItem = items[items.length - 1];
 * const cursor = encodeCursor(lastItem.createdAt, lastItem.id);
 */
export function encodeCursor(sortValue: string | number | Date, itemId: string): string {
  const timestamp =
    sortValue instanceof Date ? sortValue.toISOString() : String(sortValue);

  const cursorData = {
    ts: timestamp,
    id: itemId,
  };

  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Cursor-based pagination - decodes a cursor back to components
 * 
 * @param cursor - Encoded cursor string
 * @returns Cursor data containing timestamp and item ID
 * @throws Error if cursor is invalid
 * 
 * @example
 * const { ts, id } = decodeCursor(cursorFromRequest);
 */
export interface DecodedCursor {
  ts: string;
  id: string;
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (_error) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Applies cursor-based pagination to query builder
 * 
 * Useful for pagination over very large datasets
 * or when you need consistent ordering across requests
 * 
 * @param items - Array of items from database
 * @param cursor - Optional cursor from request
 * @param limit - Number of items to return (actual limit + 1 for hasNext detection)
 * @param direction - Pagination direction
 * @returns Paginated items and metadata
 * 
 * @example
 * const items = await db.query('SELECT * FROM jobs ORDER BY created_at DESC');
 * const result = applyCursorPagination(items, req.query.cursor, 20, 'forward');
 * // Returns: { items: [...], hasNext: true, nextCursor: '...' }
 */
export interface CursorPaginationResult<T> {
  items: T[];
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
  currentCursor?: string;
}

export function applyCursorPagination<T extends Record<string, any>>(
  items: T[],
  cursor: string | undefined,
  limit: number,
  direction: 'forward' | 'backward' = 'forward'
): CursorPaginationResult<T> {
  if (items.length === 0) {
    return {
      items: [],
      hasNext: false,
      hasPrev: false,
    };
  }

  // Check if we have more items than requested (indicates hasNext)
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  // Calculate cursors from first and last items
  const firstItem = resultItems[0];
  const lastItem = resultItems[resultItems.length - 1];

  const nextCursor =
    hasMore && lastItem ? encodeCursor(lastItem.createdAt || lastItem.id, lastItem.id) : undefined;

  const prevCursor = firstItem ? encodeCursor(firstItem.createdAt || firstItem.id, firstItem.id) : undefined;

  return {
    items: resultItems,
    hasNext: hasMore,
    hasPrev: !!cursor, // If cursor was provided, there are previous items
    nextCursor,
    prevCursor,
    currentCursor: cursor,
  };
}

/**
 * Builds SQL LIMIT and OFFSET clauses
 * 
 * @param page - Page number
 * @param limit - Items per page
 * @returns SQL fragment for LIMIT OFFSET
 * 
 * @example
 * const sql = `SELECT * FROM jobs WHERE status = 'open' ${buildLimitOffsetClause(1, 20)}`;
 * // Returns: "LIMIT 20 OFFSET 0"
 */
export function buildLimitOffsetClause(page: number, limit: number): string {
  const offset = calculateOffset(page, limit);
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Builds SQL COUNT query for pagination
 * 
 * @param table - Table name
 * @param where - WHERE clause conditions
 * @returns SQL COUNT query
 * 
 * @example
 * const countQuery = buildCountQuery('jobs', 'status = $1 AND organization_id = $2');
 * // Returns: "SELECT COUNT(*) as total FROM jobs WHERE status = $1 AND organization_id = $2"
 */
export function buildCountQuery(table: string, where?: string): string {
  let query = `SELECT COUNT(*) as total FROM ${table}`;

  if (where) {
    query += ` WHERE ${where}`;
  }

  return query;
}

/**
 * Validates pagination parameters for security
 * 
 * Prevents abuse through extreme pagination values
 * 
 * @param page - Page number
 * @param limit - Items per page
 * @returns true if valid, false otherwise
 * 
 * @example
 * if (!isValidPagination(req.query.page, req.query.limit)) {
 *   return res.status(400).json({ error: 'Invalid pagination parameters' });
 * }
 */
export function isValidPagination(page: any, limit: any): boolean {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Page must be positive integer
  if (isNaN(pageNum) || pageNum < 1) {
    return true; // Allow missing, defaults are safe
  }

  // Limit must be positive integer
  if (isNaN(limitNum) || limitNum < 1) {
    return true; // Allow missing, defaults are safe
  }

  // Prevent DoS through excessive pagination
  if (pageNum > 1000000) {
    // More than 1 million pages is suspicious
    return false;
  }

  if (limitNum > 1000) {
    // More than 1000 items per page is suspicious
    return false;
  }

  return true;
}

/**
 * Gets recommended pagination based on data characteristics
 * 
 * Helps optimize pagination for different use cases
 * 
 * @param dataSize - Approximate number of items in dataset
 * @param useCase - Use case type: 'list' | 'search' | 'export'
 * @returns Recommended page and limit values
 * 
 * @example
 * const { page, limit } = getRecommendedPagination(10000, 'list');
 * // For list view: { page: 1, limit: 20 }
 */
export interface PaginationRecommendation {
  page: number;
  limit: number;
  suggestedMaxLimit: number;
}

export function getRecommendedPagination(
  dataSize: number,
  useCase: 'list' | 'search' | 'export' = 'list'
): PaginationRecommendation {
  const recommendations: Record<string, PaginationRecommendation> = {
    list: {
      page: 1,
      limit: dataSize < 100 ? 20 : dataSize < 1000 ? 50 : 100,
      suggestedMaxLimit: 100,
    },
    search: {
      page: 1,
      limit: dataSize < 1000 ? 10 : 20,
      suggestedMaxLimit: 50,
    },
    export: {
      page: 1,
      limit: dataSize < 10000 ? 1000 : 5000,
      suggestedMaxLimit: 10000,
    },
  };

  return recommendations[useCase] || recommendations.list;
}

/**
 * Formats pagination metadata for API response
 * 
 * @param currentPage - Current page number
 * @param pageSize - Items per page
 * @param totalCount - Total items in dataset
 * @returns Formatted pagination object for JSON response
 * 
 * @example
 * const pagination = formatPaginationResponse(1, 20, 150);
 * res.json({
 *   success: true,
 *   jobs: items,
 *   pagination
 * });
 */
export interface FormattedPagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function formatPaginationResponse(
  currentPage: number,
  pageSize: number,
  totalCount: number
): FormattedPagination {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    currentPage,
    pageSize,
    totalItems: totalCount,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}
