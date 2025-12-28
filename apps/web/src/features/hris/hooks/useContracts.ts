import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '../services/contracts.service';

const CONTRACTS_QUERY_KEY = ['contracts'];

/**
 * Hook to fetch contracts list
 */
export function useContracts(filters?: { search?: string; employeeId?: string; status?: string; contractType?: string }) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, filters],
    queryFn: () => contractsService.listContracts(filters),
    enabled: true,
  });
}

/**
 * Hook to fetch a single contract
 */
export function useContract(contractId?: string) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, contractId],
    queryFn: () => contractsService.getContract(contractId!),
    enabled: !!contractId,
  });
}

/**
 * Hook to get contracts for an employee
 */
export function useEmployeeContracts(employeeId?: string) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, 'employee', employeeId],
    queryFn: () => contractsService.getEmployeeContracts(employeeId!),
    enabled: !!employeeId,
  });
}

/**
 * Hook to create a contract
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contractsService.createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a contract
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: any }) =>
      contractsService.updateContract(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a contract
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contractsService.deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to generate contract from template
 */
export function useGenerateContractFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, employeeId, data }: { templateId: string; employeeId: string; data?: any }) =>
      contractsService.generateFromTemplate(templateId, employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}
