/**
 * useShiftTypes Hook
 * Hook for managing shift types
 */

import { useQuery } from '@tanstack/react-query';

export interface ShiftType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

/**
 * Hook to get all shift types
 */
export function useShiftTypes() {
  return useQuery({
    queryKey: ['shift-types'],
    queryFn: async () => 
      // TODO: Implement shift types API
       [] as ShiftType[]
    ,
  });
}
