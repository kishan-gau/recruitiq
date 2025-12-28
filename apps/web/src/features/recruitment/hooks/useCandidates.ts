import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesService } from '../services/candidates.service';

export function useCandidates(filters?: any) {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: () => candidatesService.listCandidates(filters),
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: () => candidatesService.getCandidate(id),
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: candidatesService.createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      candidatesService.updateCandidate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['candidates', id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: candidatesService.deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
