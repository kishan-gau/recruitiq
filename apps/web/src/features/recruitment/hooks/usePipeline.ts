import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline.service';

export function usePipelines(filters?: any) {
  return useQuery({
    queryKey: ['pipelines', filters],
    queryFn: () => pipelineService.listPipelines(filters),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => pipelineService.getPipeline(id),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pipelineService.createPipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      pipelineService.updatePipeline(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pipelineService.deletePipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useMoveCandidateToPipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, pipelineId, stageId }: { candidateId: string; pipelineId: string; stageId: string }) =>
      pipelineService.moveCandidateToPipelineStage(candidateId, pipelineId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
