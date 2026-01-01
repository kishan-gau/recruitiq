/**
 * React Query hooks for Attendance feature
 */

import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';

/**
 * Hook to fetch monthly attendance
 */
export const useMonthlyAttendance = (employeeId: string, year: number, month: number) => {
  return useQuery({
    queryKey: ['attendance', 'monthly', employeeId, year, month],
    queryFn: () => attendanceService.getMonthlyAttendance(employeeId, year, month),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId && !!year && !!month,
  });
};

/**
 * Hook to fetch year-to-date attendance
 */
export const useYTDAttendance = (employeeId: string) => {
  return useQuery({
    queryKey: ['attendance', 'ytd', employeeId],
    queryFn: () => attendanceService.getYTDAttendance(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch clock in/out history
 */
export const useClockInOutHistory = (employeeId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['attendance', 'clock-history', employeeId, startDate, endDate],
    queryFn: () => attendanceService.getClockInOutHistory(employeeId, startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch time attendance from PayLinQ
 */
export const useTimeAttendance = (employeeId: string) => {
  return useQuery({
    queryKey: ['attendance', 'time', employeeId],
    queryFn: () => attendanceService.getTimeAttendance(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch attendance statistics
 */
export const useAttendanceStatistics = (employeeId: string, period?: string) => {
  return useQuery({
    queryKey: ['attendance', 'statistics', employeeId, period],
    queryFn: () => attendanceService.getStatistics(employeeId, period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};
