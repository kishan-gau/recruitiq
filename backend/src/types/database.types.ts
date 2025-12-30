/**
 * Database-related types
 */

import { QueryResult } from 'pg';

export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface QueryOptions {
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'JOIN';
  table: string;
  userId?: string;
}

export interface DatabaseError {
  code: string;
  detail?: string;
  hint?: string;
  message: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface QueryError extends Error {
  code?: string;
  detail?: string;
}
