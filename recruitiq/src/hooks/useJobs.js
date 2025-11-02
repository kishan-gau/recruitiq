import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../context/ToastContext'

/**
 * Custom hook for managing jobs data with React Query
 * Provides automatic caching, background updates, and optimistic updates
 * 
 * @param {object} options - Query options
 * @param {number} options.page - Page number (1-based, optional)
 * @param {number} options.pageSize - Number of items per page (optional)
 * @param {string} options.search - Search query (optional)
 * @param {string} options.status - Filter by status (optional)
 */
export function useJobs(options = {}) {
  const { page, pageSize, search, status } = options
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
  if (status) params.status = status
  
  // Fetch jobs for current workspace (with optional pagination)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['jobs', currentWorkspaceId, params],
    queryFn: async () => {
      const response = await api.getJobs(currentWorkspaceId, params)
      // API should return { jobs: [], total: number, page: number, pageSize: number }
      return {
        jobs: response.jobs || [],
        total: response.total || response.jobs?.length || 0,
        page: response.page || page || 1,
        pageSize: response.pageSize || pageSize || response.jobs?.length || 0
      }
    },
    enabled: !!currentWorkspaceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
  
  // Create job mutation
  const createMutation = useMutation({
    mutationFn: async (newJob) => {
      const response = await api.createJob({
        ...newJob,
        workspaceId: currentWorkspaceId
      })
      return response.job
    },
    onMutate: async (newJob) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['jobs', currentWorkspaceId] })
      
      // Snapshot previous value
      const previousJobs = queryClient.getQueryData(['jobs', currentWorkspaceId])
      
      // Optimistically update with temp ID
      queryClient.setQueryData(['jobs', currentWorkspaceId], (old = []) => [
        { ...newJob, id: `temp-${Date.now()}`, status: newJob.status || 'draft' },
        ...old
      ])
      
      return { previousJobs }
    },
    onError: (err, newJob, context) => {
      // Rollback on error
      queryClient.setQueryData(['jobs', currentWorkspaceId], context.previousJobs)
      toast.show(`Failed to create job: ${err.message}`, { type: 'error' })
    },
    onSuccess: (job) => {
      toast.show('Job created successfully')
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['jobs', currentWorkspaceId] })
    }
  })
  
  // Update job mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.updateJob(id, updates)
      return response.job
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', currentWorkspaceId] })
      
      const previousJobs = queryClient.getQueryData(['jobs', currentWorkspaceId])
      
      // Optimistic update
      queryClient.setQueryData(['jobs', currentWorkspaceId], (old = []) =>
        old.map(job => job.id === id ? { ...job, ...updates } : job)
      )
      
      return { previousJobs }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['jobs', currentWorkspaceId], context.previousJobs)
      toast.show(`Failed to update job: ${err.message}`, { type: 'error' })
    },
    onSuccess: () => {
      toast.show('Job updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', currentWorkspaceId] })
    }
  })
  
  // Delete job mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteJob(id)
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', currentWorkspaceId] })
      
      const previousJobs = queryClient.getQueryData(['jobs', currentWorkspaceId])
      const deletedJob = previousJobs?.find(j => j.id === id)
      
      // Optimistic update
      queryClient.setQueryData(['jobs', currentWorkspaceId], (old = []) =>
        old.filter(job => job.id !== id)
      )
      
      return { previousJobs, deletedJob }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['jobs', currentWorkspaceId], context.previousJobs)
      toast.show(`Failed to delete job: ${err.message}`, { type: 'error' })
    },
    onSuccess: (id, variables, context) => {
      // Show undo toast
      const handleUndo = async () => {
        if (context.deletedJob) {
          await createMutation.mutateAsync(context.deletedJob)
        }
      }
      
      toast.show('Job deleted', {
        duration: 8000,
        action: handleUndo,
        actionLabel: 'Undo'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', currentWorkspaceId] })
    }
  })
  
  return {
    // Data (now includes pagination info)
    jobs: data?.jobs || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 0,
    
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
    createJob: createMutation.mutate,
    updateJob: (id, updates) => updateMutation.mutate({ id, updates }),
    deleteJob: deleteMutation.mutate,
    refetch,
    
    // Async actions (for await usage)
    createJobAsync: createMutation.mutateAsync,
    updateJobAsync: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteJobAsync: deleteMutation.mutateAsync,
  }
}

/**
 * Hook for fetching a single job by ID
 */
export function useJob(jobId) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', currentWorkspaceId, jobId],
    queryFn: async () => {
      // Try to get from cache first
      const jobs = queryClient.getQueryData(['jobs', currentWorkspaceId])
      const cachedJob = jobs?.find(j => j.id === jobId)
      if (cachedJob) return cachedJob
      
      // Otherwise fetch from API
      const response = await api.getJob(jobId)
      return response.job
    },
    enabled: !!jobId && !!currentWorkspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return {
    job: data || null,
    isLoading,
    error: error?.message || null
  }
}
