import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceStatistics,
  CreateAttendanceRecordDTO,
  UpdateAttendanceRecordDTO,
} from '@/types/attendance.types';

import { attendanceService } from '../services/attendance.service';

export function useAttendanceRecords(filters?: AttendanceFilters) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-records', filters],
    queryFn: () => attendanceService.listAttendanceRecords(filters),
  });
}

export function useAttendanceRecord(id: string) {
  return useQuery<AttendanceRecord>({
    queryKey: ['attendance-records', id],
    queryFn: () => attendanceService.getAttendanceRecord(id),
    enabled: !!id,
  });
}

export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceRecord, Error, CreateAttendanceRecordDTO>({
    mutationFn: attendanceService.createAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-statistics'] });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceRecord, Error, { id: string; data: UpdateAttendanceRecordDTO }>({
    mutationFn: ({ id, data }) =>
      attendanceService.updateAttendanceRecord(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', id] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-statistics'] });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: attendanceService.deleteAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-statistics'] });
    },
  });
}

export function useAttendanceStatistics() {
  return useQuery<AttendanceStatistics>({
    queryKey: ['attendance-statistics'],
    queryFn: () => attendanceService.getAttendanceStatistics(),
  });
}

/**
 * Hook for today's attendance records
 * Alias for useAttendanceRecords with today's date filter
 */
export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return useAttendanceRecords({ date: today });
}
