import { useQuery } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';

interface ShiftTemplate {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roleId: string;
  stationId: string;
  workersNeeded: number;
}

interface AvailabilityCheck {
  shiftId: string;
  available: number;
  required: number;
  conflicts: Array<{
    workerId: string;
    workerName: string;
    reason: 'time_off' | 'double_booking' | 'max_hours' | 'unavailable';
  }>;
}

/**
 * Hook to check worker availability for shift templates in real-time
 * Used during schedule building to provide immediate feedback
 */
export function useWorkerAvailabilityPreview(
  startDate: string | undefined,
  endDate: string | undefined,
  shifts: ShiftTemplate[]
) {
  return useQuery({
    queryKey: ['worker-availability-preview', startDate, endDate, shifts],
    queryFn: async () => {
      if (!startDate || !endDate || shifts.length === 0) {
        return [];
      }

      // Check availability for each shift template
      const checks = await Promise.all(
        shifts.map(async (shift, index) => {
          try {
            // Call backend to check availability
            const response = await schedulehubApi.schedules.checkAvailability({
              startDate,
              endDate,
              shifts: [shift],
            });

            return {
              shiftId: `shift-${index}`,
              available: response.availableWorkers || 0,
              required: shift.workersNeeded,
              conflicts: response.conflicts || [],
            } as AvailabilityCheck;
          } catch (error) {
            console.error('Error checking availability:', error);
            return {
              shiftId: `shift-${index}`,
              available: 0,
              required: shift.workersNeeded,
              conflicts: [],
            } as AvailabilityCheck;
          }
        })
      );

      return checks;
    },
    enabled: !!startDate && !!endDate && shifts.length > 0,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute while active
  });
}

/**
 * Hook to detect conflicts between shifts (overlapping times, double-booking)
 */
export function useShiftConflicts(shifts: ShiftTemplate[]) {
  return useQuery({
    queryKey: ['shift-conflicts', shifts],
    queryFn: async () => {
      const conflicts: Array<{
        shiftIndex: number;
        conflictsWith: number[];
        reason: string;
      }> = [];

      // Check for time overlaps on the same day
      shifts.forEach((shift, index) => {
        const overlapping = shifts
          .map((other, otherIndex) => ({ shift: other, index: otherIndex }))
          .filter(({ shift: other, index: otherIndex }) => {
            if (otherIndex === index) return false;
            if (other.dayOfWeek !== shift.dayOfWeek) return false;
            if (other.stationId !== shift.stationId) return false;

            // Check time overlap
            const start1 = parseTime(shift.startTime);
            const end1 = parseTime(shift.endTime);
            const start2 = parseTime(other.startTime);
            const end2 = parseTime(other.endTime);

            return (start1 < end2 && end1 > start2);
          })
          .map(({ index }) => index);

        if (overlapping.length > 0) {
          conflicts.push({
            shiftIndex: index,
            conflictsWith: overlapping,
            reason: 'Time overlap at the same station',
          });
        }
      });

      return conflicts;
    },
    enabled: shifts.length > 0,
  });
}

/**
 * Parse time string (HH:MM) to minutes since midnight for comparison
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
