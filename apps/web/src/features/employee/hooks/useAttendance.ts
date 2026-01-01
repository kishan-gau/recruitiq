/**
 * React Query hooks for Attendance feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/employee/attendance.service';

// Query Keys
const attendanceKeys = {
  all: ['attendance'] as const,
  records: (params?: { startDate?: string; endDate?: string }) => [...attendanceKeys.all, 'records', params] as const,
  summary: (params?: { startDate?: string; endDate?: string }) => [...attendanceKeys.all, 'summary', params] as const,
  monthly: (year: number, month: number) => [...attendanceKeys.all, 'monthly', year, month] as const,
  timeOff: (params?: object) => [...attendanceKeys.all, 'time-off', params] as const,
  corrections: () => [...attendanceKeys.all, 'corrections'] as const,
  ytdStats: () => [...attendanceKeys.all, 'ytd-stats'] as const,
};

/**
 * Hook for attendance records with date range
 */
export function useAttendanceRecords(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: attendanceKeys.records(params),
    queryFn: () => attendanceService.listAttendanceRecords(params || {}),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for attendance summary
 */
export function useAttendanceSummary(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: attendanceKeys.summary(params),
    queryFn: () => attendanceService.getAttendanceSummary(params || {}),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for monthly attendance
 */
export function useMonthlyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: attendanceKeys.monthly(year, month),
    queryFn: () => attendanceService.getMonthlyAttendance(year, month),
    staleTime: 5 * 60 * 1000,
    enabled: !!year && !!month,
  });
}

/**
 * Hook for time-off requests
 */
export function useTimeOffRequests(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: attendanceKeys.timeOff(params),
    queryFn: () => attendanceService.listTimeOffRequests(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for YTD statistics
 */
export function useYTDStatistics() {
  return useQuery({
    queryKey: attendanceKeys.ytdStats(),
    queryFn: () => attendanceService.getYTDStatistics(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for correction requests
 */
export function useCorrectionRequests() {
  return useQuery({
    queryKey: attendanceKeys.corrections(),
    queryFn: () => attendanceService.listCorrectionRequests(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation hook for requesting time off
 */
export function useRequestTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'jury_duty' | 'other';
      startDate: string;
      endDate: string;
      notes?: string;
    }) => attendanceService.requestTimeOff(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timeOff() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.ytdStats() });
    },
  });
}

/**
 * Mutation hook for requesting attendance correction
 */
export function useRequestCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (correction: {
      recordId: string;
      requestedClockIn?: string;
      requestedClockOut?: string;
      reason: string;
    }) => attendanceService.requestCorrection(correction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.corrections() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    },
  });
}
