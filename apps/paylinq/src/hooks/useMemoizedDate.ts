/**
 * Custom hooks for memoized date operations
 * 
 * These hooks prevent unnecessary recalculation of dates on every render,
 * improving performance and preventing potential infinite render loops.
 * 
 * @module hooks/useMemoizedDate
 */

import { useMemo, useCallback } from 'react';

/**
 * Returns the current date as YYYY-MM-DD string, memoized
 * Only recalculates when component mounts (not on every render)
 * 
 * @returns {string} Current date in YYYY-MM-DD format
 */
export function useToday(): string {
  return useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []); // Empty deps = calculate once on mount
}

/**
 * Returns the current date as ISO string, memoized
 * 
 * @returns {string} Current date in ISO format
 */
export function useTodayISO(): string {
  return useMemo(() => {
    return new Date().toISOString();
  }, []);
}

/**
 * Returns the current year, memoized
 * 
 * @returns {number} Current year
 */
export function useCurrentYear(): number {
  return useMemo(() => {
    return new Date().getFullYear();
  }, []);
}

/**
 * Returns a date range calculator function, memoized
 * 
 * @param {string} period - Period type (current-month, last-month, etc.)
 * @returns {{ startDate: string; endDate: string }} Date range in YYYY-MM-DD format
 */
export function useDateRange(period: string): { startDate: string; endDate: string } {
  return useMemo(() => {
    const now = new Date();
    let startDate: string, endDate: string;

    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString().split('T')[0];
        break;

      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString().split('T')[0];
        break;

      case 'current-quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1)
          .toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), quarterMonth + 3, 0)
          .toISOString().split('T')[0];
        break;

      case 'current-year':
        startDate = new Date(now.getFullYear(), 0, 1)
          .toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31)
          .toISOString().split('T')[0];
        break;

      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;

      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;

      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }, [period]); // Only recalculate when period changes
}

/**
 * Returns a function to get Monday of the current week, memoized
 * 
 * @returns {() => Date} Function that returns Monday of current week
 */
export function useGetCurrentWeekMonday(): () => Date {
  return useCallback(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []); // Function is stable across renders
}

/**
 * Returns a function to add days to a date, memoized
 * 
 * @returns {(date: Date, days: number) => Date} Function to add days
 */
export function useAddDays(): (date: Date, days: number) => Date {
  return useCallback((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }, []);
}

/**
 * Returns a function to format a date as YYYY-MM-DD, memoized
 * 
 * @returns {(date: Date | string) => string} Format function
 */
export function useFormatDate(): (date: Date | string) => string {
  return useCallback((date: Date | string) => {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }, []);
}

/**
 * Returns tomorrow's date as YYYY-MM-DD string, memoized
 * 
 * @returns {string} Tomorrow's date
 */
export function useTomorrow(): string {
  return useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);
}

/**
 * Returns a function to get the first day of a month, memoized
 * 
 * @returns {(year: number, month: number) => string} Function returning YYYY-MM-DD
 */
export function useGetFirstDayOfMonth(): (year: number, month: number) => string {
  return useCallback((year: number, month: number) => {
    return new Date(year, month, 1).toISOString().split('T')[0];
  }, []);
}

/**
 * Returns a function to get the last day of a month, memoized
 * 
 * @returns {(year: number, month: number) => string} Function returning YYYY-MM-DD
 */
export function useGetLastDayOfMonth(): (year: number, month: number) => string {
  return useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).toISOString().split('T')[0];
  }, []);
}
