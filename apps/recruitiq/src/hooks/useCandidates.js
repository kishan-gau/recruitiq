import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../context/ToastContext'

/**
 * Custom hook for managing candidates data with React Query
 * Provides automatic caching, background updates, and optimistic updates
 * 
 * @param {object} options - Query options
 * @param {number} options.page - Page number (1-based, optional)
 * @param {number} options.pageSize - Number of items per page (optional)
 * @param {string} options.search - Search query (optional)
 * @param {string} options.stage - Filter by stage (optional)
 * @param {string} options.jobId - Filter by job ID (optional)
 */
export function useCandidates(options = {}) {
  const { page, pageSize, search, stage, jobId } = options
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const toast = useToast()
  
  // Build query params
  const params = {}
  if (page && pageSize) {
    params.limit = pageSize
    params.offset = (page - 1) * pageSize
  }
  if (search) params.search = search
  if (stage) params.stage = stage
  if (jobId) params.jobId = jobId
  
  // Fetch candidates for current workspace (with optional pagination)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['candidates', currentWorkspaceId, params],
    queryFn: async () => {
      const response = await api.getCandidates(currentWorkspaceId, params)
      return {
        candidates: response.candidates || [],
        total: response.total || response.candidates?.length || 0,
        page: response.page || page || 1,
        pageSize: response.pageSize || pageSize || response.candidates?.length || 0
      }
    },
    enabled: !!currentWorkspaceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
  
  // Create candidate mutation
  const createMutation = useMutation({
    mutationFn: async (newCandidate) => {
      const response = await api.createCandidate({
        ...newCandidate,
        workspaceId: currentWorkspaceId
      })
      return response.candidate
    },
    onMutate: async (newCandidate) => {
      await queryClient.cancelQueries({ queryKey: ['candidates', currentWorkspaceId] })
      
      const previousCandidates = queryClient.getQueryData(['candidates', currentWorkspaceId])
      
      // Optimistic update
      queryClient.setQueryData(['candidates', currentWorkspaceId], (old = []) => [
        { ...newCandidate, id: `temp-${Date.now()}` },
        ...old
      ])
      
      return { previousCandidates }
    },
    onError: (err, newCandidate, context) => {
      queryClient.setQueryData(['candidates', currentWorkspaceId], context.previousCandidates)
      toast.show(`Failed to create candidate: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Candidate created successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', currentWorkspaceId] })
    }
  })
  
  // Update candidate mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.updateCandidate(id, updates)
      return response.candidate
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['candidates', currentWorkspaceId] })
      
      const previousCandidates = queryClient.getQueryData(['candidates', currentWorkspaceId])
      
      // Optimistic update
      queryClient.setQueryData(['candidates', currentWorkspaceId], (old = []) =>
        old.map(candidate => candidate.id === id ? { ...candidate, ...updates } : candidate)
      )
      
      return { previousCandidates }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['candidates', currentWorkspaceId], context.previousCandidates)
      toast.show(`Failed to update candidate: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Candidate updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', currentWorkspaceId] })
    }
  })
  
  // Move candidate to new stage mutation
  const moveMutation = useMutation({
    mutationFn: async ({ id, newStage }) => {
      const response = await api.moveCandidate(id, newStage)
      return response.candidate
    },
    onMutate: async ({ id, newStage }) => {
      await queryClient.cancelQueries({ queryKey: ['candidates', currentWorkspaceId] })
      
      const previousCandidates = queryClient.getQueryData(['candidates', currentWorkspaceId])
      const movedCandidate = previousCandidates?.find(c => c.id === id)
      
      // Optimistic update
      queryClient.setQueryData(['candidates', currentWorkspaceId], (old = []) =>
        old.map(candidate => 
          candidate.id === id 
            ? { ...candidate, stage: newStage }
            : candidate
        )
      )
      
      return { previousCandidates, movedCandidate }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['candidates', currentWorkspaceId], context.previousCandidates)
      toast.show(`Failed to move candidate: ${err.message}`, { type: 'error' })
    },
    onSuccess: (candidate, { showUndo = true }, context) => {
      if (showUndo && context.movedCandidate) {
        const handleUndo = async () => {
          await moveMutation.mutateAsync({
            id: candidate.id,
            newStage: context.movedCandidate.stage,
            showUndo: false
          })
        }
        
        toast.show(`Moved to ${candidate.stage}`, {
          duration: 8000,
          action: handleUndo,
          actionLabel: 'Undo'
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', currentWorkspaceId] })
    }
  })
  
  // Delete candidate mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteCandidate(id)
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['candidates', currentWorkspaceId] })
      
      const previousCandidates = queryClient.getQueryData(['candidates', currentWorkspaceId])
      const deletedCandidate = previousCandidates?.find(c => c.id === id)
      
      // Optimistic update
      queryClient.setQueryData(['candidates', currentWorkspaceId], (old = []) =>
        old.filter(candidate => candidate.id !== id)
      )
      
      return { previousCandidates, deletedCandidate }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['candidates', currentWorkspaceId], context.previousCandidates)
      toast.show(`Failed to delete candidate: ${err.message}`, { type: 'error' })
    },
    onSuccess: (id, variables, context) => {
      const handleUndo = async () => {
        if (context.deletedCandidate) {
          await createMutation.mutateAsync(context.deletedCandidate)
        }
      }
      
      toast.show('Candidate deleted', {
        duration: 8000,
        action: handleUndo,
        actionLabel: 'Undo'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', currentWorkspaceId] })
    }
  })
  
  return {
    // Data (now includes pagination info)
    candidates: data?.candidates || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 0,
    
    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isMoving: moveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Error states
    error: error?.message || null,
    createError: createMutation.error?.message || null,
    updateError: updateMutation.error?.message || null,
    moveError: moveMutation.error?.message || null,
    deleteError: deleteMutation.error?.message || null,
    
    // Actions
    createCandidate: createMutation.mutate,
    updateCandidate: (id, updates) => updateMutation.mutate({ id, updates }),
    moveCandidate: (id, newStage, options = {}) => moveMutation.mutate({ id, newStage, ...options }),
    deleteCandidate: deleteMutation.mutate,
    refetch,
    
    // Async actions
    createCandidateAsync: createMutation.mutateAsync,
    updateCandidateAsync: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    moveCandidateAsync: (id, newStage, options = {}) => moveMutation.mutateAsync({ id, newStage, ...options }),
    deleteCandidateAsync: deleteMutation.mutateAsync,
  }
}

/**
 * Hook for fetching a single candidate by ID
 */
export function useCandidate(candidateId) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidates', currentWorkspaceId, candidateId],
    queryFn: async () => {
      // Try cache first
      const candidates = queryClient.getQueryData(['candidates', currentWorkspaceId])
      const cachedCandidate = candidates?.find(c => c.id === candidateId)
      if (cachedCandidate) return cachedCandidate
      
      // Otherwise fetch
      const response = await api.getCandidate(candidateId)
      return response.candidate
    },
    enabled: !!candidateId && !!currentWorkspaceId,
    staleTime: 5 * 60 * 1000,
  })
  
  return {
    candidate: data || null,
    isLoading,
    error: error?.message || null
  }
}
