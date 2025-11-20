import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../context/ToastContext'

/**
 * Custom hook for managing applications data with React Query
 * Provides automatic caching, background updates, and optimistic updates
 */
export function useApplications() {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const toast = useToast()
  
  // Fetch all applications for current workspace
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['applications', currentWorkspaceId],
    queryFn: async () => {
      const response = await api.getApplications(currentWorkspaceId)
      return response.applications || []
    },
    enabled: !!currentWorkspaceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
  
  // Create application mutation
  const createMutation = useMutation({
    mutationFn: async (newApplication) => {
      const response = await api.createApplication({
        ...newApplication,
        workspaceId: currentWorkspaceId
      })
      return response.application
    },
    onMutate: async (newApplication) => {
      await queryClient.cancelQueries({ queryKey: ['applications', currentWorkspaceId] })
      
      const previousApplications = queryClient.getQueryData(['applications', currentWorkspaceId])
      
      // Optimistic update
      queryClient.setQueryData(['applications', currentWorkspaceId], (old = []) => [
        { ...newApplication, id: `temp-${Date.now()}`, status: 'pending' },
        ...old
      ])
      
      return { previousApplications }
    },
    onError: (err, newApplication, context) => {
      queryClient.setQueryData(['applications', currentWorkspaceId], context.previousApplications)
      toast.show(`Failed to create application: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Application created successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', currentWorkspaceId] })
    }
  })
  
  // Update application mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.updateApplication(id, updates)
      return response.application
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', currentWorkspaceId] })
      
      const previousApplications = queryClient.getQueryData(['applications', currentWorkspaceId])
      
      // Optimistic update
      queryClient.setQueryData(['applications', currentWorkspaceId], (old = []) =>
        old.map(application => 
          application.id === id ? { ...application, ...updates } : application
        )
      )
      
      return { previousApplications }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['applications', currentWorkspaceId], context.previousApplications)
      toast.show(`Failed to update application: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Application updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', currentWorkspaceId] })
    }
  })
  
  // Delete application mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteApplication(id)
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['applications', currentWorkspaceId] })
      
      const previousApplications = queryClient.getQueryData(['applications', currentWorkspaceId])
      const deletedApplication = previousApplications?.find(a => a.id === id)
      
      // Optimistic update
      queryClient.setQueryData(['applications', currentWorkspaceId], (old = []) =>
        old.filter(application => application.id !== id)
      )
      
      return { previousApplications, deletedApplication }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['applications', currentWorkspaceId], context.previousApplications)
      toast.show(`Failed to delete application: ${err.message}`, { type: 'error' })
    },
    onSuccess: (id, variables, context) => {
      const handleUndo = async () => {
        if (context.deletedApplication) {
          await createMutation.mutateAsync(context.deletedApplication)
        }
      }
      
      toast.show('Application deleted', {
        duration: 8000,
        action: handleUndo,
        actionLabel: 'Undo'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', currentWorkspaceId] })
    }
  })
  
  return {
    // Data
    applications: data || [],
    
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
    createApplication: createMutation.mutate,
    updateApplication: (id, updates) => updateMutation.mutate({ id, updates }),
    deleteApplication: deleteMutation.mutate,
    refetch,
    
    // Async actions
    createApplicationAsync: createMutation.mutateAsync,
    updateApplicationAsync: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteApplicationAsync: deleteMutation.mutateAsync,
  }
}

/**
 * Hook for fetching a single application by ID
 */
export function useApplication(applicationId) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', currentWorkspaceId, applicationId],
    queryFn: async () => {
      // Try cache first
      const applications = queryClient.getQueryData(['applications', currentWorkspaceId])
      const cachedApplication = applications?.find(a => a.id === applicationId)
      if (cachedApplication) return cachedApplication
      
      // Otherwise fetch
      const response = await api.getApplication(applicationId)
      return response.application
    },
    enabled: !!applicationId && !!currentWorkspaceId,
    staleTime: 5 * 60 * 1000,
  })
  
  return {
    application: data || null,
    isLoading,
    error: error?.message || null
  }
}
