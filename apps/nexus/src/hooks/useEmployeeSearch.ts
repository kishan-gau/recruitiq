import { useQuery } from '@tanstack/react-query';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  locationName?: string;
  status: string;
}

// Mock search function - replace with actual API call
const searchEmployees = async (query: string): Promise<Employee[]> => {
  // This would be replaced with actual API call
  // For now, return empty array
  return [];
};

export function useEmployeeSearch(query: string) {
  return useQuery({
    queryKey: ['employees', 'search', query],
    queryFn: () => searchEmployees(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}
