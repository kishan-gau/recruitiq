import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../context/ToastContext'

/**
 * Custom hook for managing interviews data with React Query
 * Provides automatic caching, background updates, and optimistic updates
 */
export function useInterviews(params = {}) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const toast = useToast()
  
  // Fetch interviews with optional filters
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['interviews', currentWorkspaceId, params],
    queryFn: async () => {
      const response = await api.getInterviews({
        workspaceId: currentWorkspaceId,
        ...params
      })
      return response.interviews || []
    },
    enabled: !!currentWorkspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for time-sensitive data)
  })
  
  // Create interview mutation
  const createMutation = useMutation({
    mutationFn: async (newInterview) => {
      const response = await api.createInterview({
        ...newInterview,
        workspaceId: currentWorkspaceId
      })
      return response.interview
    },
    onMutate: async (newInterview) => {
      await queryClient.cancelQueries({ queryKey: ['interviews', currentWorkspaceId] })
      
      const previousInterviews = queryClient.getQueryData(['interviews', currentWorkspaceId, params])
      
      // Optimistic update
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], (old = []) => [
        { ...newInterview, id: `temp-${Date.now()}`, status: 'scheduled' },
        ...old
      ])
      
      return { previousInterviews }
    },
    onError: (err, newInterview, context) => {
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], context.previousInterviews)
      toast.show(`Failed to schedule interview: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Interview scheduled successfully')
    },
    onSettled: () => {
      // Invalidate all interview queries
      queryClient.invalidateQueries({ queryKey: ['interviews', currentWorkspaceId] })
    }
  })
  
  // Update interview mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.updateInterview(id, updates)
      return response.interview
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['interviews', currentWorkspaceId] })
      
      const previousInterviews = queryClient.getQueryData(['interviews', currentWorkspaceId, params])
      
      // Optimistic update
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], (old = []) =>
        old.map(interview => 
          interview.id === id ? { ...interview, ...updates } : interview
        )
      )
      
      return { previousInterviews }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], context.previousInterviews)
      toast.show(`Failed to update interview: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Interview updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', currentWorkspaceId] })
    }
  })
  
  // Delete interview mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteInterview(id)
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['interviews', currentWorkspaceId] })
      
      const previousInterviews = queryClient.getQueryData(['interviews', currentWorkspaceId, params])
      const deletedInterview = previousInterviews?.find(i => i.id === id)
      
      // Optimistic update
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], (old = []) =>
        old.filter(interview => interview.id !== id)
      )
      
      return { previousInterviews, deletedInterview }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['interviews', currentWorkspaceId, params], context.previousInterviews)
      toast.show(`Failed to cancel interview: ${err.message}`, { type: 'error' })
    },
    onSuccess: (id, variables, context) => {
      const handleUndo = async () => {
        if (context.deletedInterview) {
          await createMutation.mutateAsync(context.deletedInterview)
        }
      }
      
      toast.show('Interview cancelled', {
        duration: 8000,
        action: handleUndo,
        actionLabel: 'Undo'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', currentWorkspaceId] })
    }
  })
  
  return {
    // Data
    interviews: data || [],
    
    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Error states
    error: error?.message || null,
    createError: createMutation.error?.message || null,
    updateError: updateMutation.error?.message || null,
    deleteError: deleteMutation.error?.message || null,
    
    // Actions
    scheduleInterview: createMutation.mutate,
    updateInterview: (id, updates) => updateMutation.mutate({ id, updates }),
    cancelInterview: deleteMutation.mutate,
    refetch,
    
    // Async actions
    scheduleInterviewAsync: createMutation.mutateAsync,
    updateInterviewAsync: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    cancelInterviewAsync: deleteMutation.mutateAsync,
  }
}

/**
 * Hook for fetching a single interview by ID
 */
export function useInterview(interviewId) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['interviews', currentWorkspaceId, interviewId],
    queryFn: async () => {
      // Try cache first
      const interviews = queryClient.getQueryData(['interviews', currentWorkspaceId, {}])
      const cachedInterview = interviews?.find(i => i.id === interviewId)
      if (cachedInterview) return cachedInterview
      
      // Otherwise fetch
      const response = await api.getInterview(interviewId)
      return response.interview
    },
    enabled: !!interviewId && !!currentWorkspaceId,
    staleTime: 2 * 60 * 1000,
  })
  
  return {
    interview: data || null,
    isLoading,
    error: error?.message || null
  }
}
