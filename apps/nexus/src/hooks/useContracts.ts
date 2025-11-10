/**
 * Contracts React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '@/services/contracts.service';
import type {
  CreateContractDTO,
  UpdateContractDTO,
  ContractFilters,
} from '@/types/contract.types';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook to fetch all contracts with optional filters
 */
export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ['contracts', 'list', filters],
    queryFn: () => contractsService.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single contract by ID
 */
export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsService.get(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all contracts for a specific employee
 */
export function useEmployeeContracts(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', 'employee', employeeId],
    queryFn: () => contractsService.getByEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch the current active contract for an employee
 */
export function useCurrentContract(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', 'employee', employeeId, 'current'],
    queryFn: () => contractsService.getCurrentContract(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new contract
 */
export function useCreateContract() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (contract: CreateContractDTO) => contractsService.create(contract),
    onSuccess: (newContract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'employee', newContract.employeeId] });
      success('Contract created successfully');
    },
    onError: (err: Error) => {
      error(`Failed to create contract: ${err.message}`);
    },
  });
}

/**
 * Hook to update a contract
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateContractDTO }) =>
      contractsService.update(id, updates),
    onSuccess: (updatedContract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', updatedContract.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'employee', updatedContract.employeeId] });
      success('Contract updated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to update contract: ${err.message}`);
    },
  });
}

/**
 * Hook to delete a contract
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => contractsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      success('Contract deleted successfully');
    },
    onError: (err: Error) => {
      error(`Failed to delete contract: ${err.message}`);
    },
  });
}

/**
 * Hook to activate a contract
 */
export function useActivateContract() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => contractsService.activate(id),
    onSuccess: (updatedContract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', updatedContract.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'employee', updatedContract.employeeId] });
      success('Contract activated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to activate contract: ${err.message}`);
    },
  });
}

/**
 * Hook to terminate a contract
 */
export function useTerminateContract() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, terminationDate }: { id: string; terminationDate: string }) =>
      contractsService.terminate(id, terminationDate),
    onSuccess: (updatedContract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', updatedContract.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'employee', updatedContract.employeeId] });
      success('Contract terminated successfully');
    },
    onError: (err: Error) => {
      error(`Failed to terminate contract: ${err.message}`);
    },
  });
}

/**
 * Hook to upload contract document
 */
export function useUploadContractDocument() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      contractsService.uploadDocument(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] });
      success('Contract document uploaded successfully');
    },
    onError: (err: Error) => {
      error(`Failed to upload document: ${err.message}`);
    },
  });
}
