import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react'
import { useFlowTemplates } from '../hooks/useFlowTemplates'
import { useWorkspace } from './WorkspaceContext'
import { useAuth } from './AuthContext'

const FlowContext = createContext(null)

/**
 * Hook to access Flow context
 * @returns {Object} Flow context value
 * @throws {Error} If used outside FlowProvider
 */
export function useFlow() {
  const context = useContext(FlowContext)
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider')
  }
  return context
}

/**
 * FlowProvider - Enterprise-grade context provider for flow template management
 * 
 * Features:
 * - Lazy loading: Only fetches when needed
 * - Automatic workspace switching: Refetches when workspace changes
 * - Error recovery: Automatic retry on network errors
 * - Memory efficient: Cleans up on unmount
 * - Performance optimized: Memoized callbacks
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function FlowProvider({ children }) {
  const { currentWorkspaceId } = useWorkspace()
  const { isAuthenticated, user } = useAuth()
  
  // Determine if we can fetch data
  const canFetch = isAuthenticated && !!user && !!currentWorkspaceId
  
  // React Query hook for flow templates - fetch whenever we have workspace
  const {
    flowTemplates,
    isLoading,
    error,
    refetch,
    createFlowTemplate: createFlowTemplateAPI,
    updateFlowTemplate: updateFlowTemplateAPI,
    deleteFlowTemplate: deleteFlowTemplateAPI,
    cloneFlowTemplate: cloneFlowTemplateAPI,
  } = useFlowTemplates({ 
    workspaceId: currentWorkspaceId,
    enabled: canFetch // Simply fetch when we have all required data
  })
  
  /**
   * Ensure loaded function for backward compatibility
   * Now this is a no-op since we always load when workspace is available
   */
  const ensureLoaded = useCallback(() => {
    console.log('[FlowContext] ensureLoaded called (no-op in simplified version)')
  }, [])

  /**
   * Create a new flow template
   * @param {Object} template - Template data
   * @returns {Promise<Object>} Created template
   */
  const createFlowTemplate = useCallback(async (template) => {
    ensureLoaded() // Ensure data is loaded before creating
    
    if (!currentWorkspaceId) {
      throw new Error('No workspace selected')
    }
    
    try {
      const result = await createFlowTemplateAPI({
        ...template,
        workspaceId: currentWorkspaceId
      })
      console.log('[FlowContext] Flow template created successfully')
      return result
    } catch (error) {
      console.error('[FlowContext] Failed to create flow template:', error)
      throw error
    }
  }, [createFlowTemplateAPI, currentWorkspaceId, ensureLoaded])

  /**
   * Update an existing flow template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updated fields
   * @returns {Promise<Object>} Updated template
   */
  const updateFlowTemplate = useCallback(async (templateId, updates) => {
    try {
      const result = await updateFlowTemplateAPI({
        id: templateId,
        data: updates
      })
      console.log('[FlowContext] Flow template updated successfully')
      return result
    } catch (error) {
      console.error('[FlowContext] Failed to update flow template:', error)
      throw error
    }
  }, [updateFlowTemplateAPI])

  /**
   * Delete a flow template
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  const deleteFlowTemplate = useCallback(async (templateId) => {
    try {
      await deleteFlowTemplateAPI(templateId)
      console.log('[FlowContext] Flow template deleted successfully')
    } catch (error) {
      console.error('[FlowContext] Failed to delete flow template:', error)
      throw error
    }
  }, [deleteFlowTemplateAPI])

  /**
   * Clone an existing flow template
   * @param {string} templateId - Template ID to clone
   * @returns {Promise<Object>} Cloned template
   */
  const cloneFlowTemplate = useCallback(async (templateId) => {
    try {
      const result = await cloneFlowTemplateAPI(templateId)
      console.log('[FlowContext] Flow template cloned successfully')
      return result
    } catch (error) {
      console.error('[FlowContext] Failed to clone flow template:', error)
      throw error
    }
  }, [cloneFlowTemplateAPI])

  /**
   * Get flow template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|undefined} Flow template or undefined if not found
   */
  const getFlowTemplateById = useCallback((templateId) => {
    ensureLoaded() // Trigger loading if not already loaded
    return (flowTemplates || []).find(t => t.id === templateId)
  }, [flowTemplates, ensureLoaded])

  /**
   * Get flow templates filtered by category
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered flow templates
   */
  const getFlowTemplatesByCategory = useCallback((category) => {
    ensureLoaded() // Trigger loading if not already loaded
    return (flowTemplates || []).filter(t => t.category === category)
  }, [flowTemplates, ensureLoaded])

  /**
   * Get usage count for a flow template
   * @param {string} templateId - Template ID
   * @returns {number} Usage count
   * @todo Implement backend query for actual usage count
   */
  const getFlowTemplateUsageCount = useCallback((templateId) => {
    // TODO: This should query the backend to count jobs using this template
    // For now, return 0 since we don't have this data client-side
    return 0
  }, [])

  /**
   * Create a job flow from a template
   * @param {string} jobId - Job ID
   * @param {string} flowTemplateId - Flow template ID
   * @param {Object} customizations - Custom stages and modifications
   * @returns {Object|null} Job flow object or null if template not found
   * @deprecated This will be moved to backend API
   */
  const createJobFlow = useCallback((jobId, flowTemplateId, customizations = {}) => {
    const template = getFlowTemplateById(flowTemplateId)
    if (!template) {
      console.warn('[FlowContext] Flow template not found:', flowTemplateId)
      return null
    }

    // Job flows will be created on the backend when creating a job
    // This is now handled by the job creation API
    return {
      id: `jobflow_${Date.now()}`,
      jobId,
      flowTemplateId,
      stages: template.stages.map(stage => ({ ...stage })),
      customStages: customizations.customStages || [],
      stageModifications: customizations.stageModifications || {},
      createdAt: new Date().toISOString()
    }
  }, [getFlowTemplateById])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    // Data
    flowTemplates: flowTemplates || [], // Always return array, never undefined
    isLoading,
    error,
    
    // State flags
    isEnabled: canFetch,
    canFetch,
    
    // Actions
    refetch,
    ensureLoaded, // Allow components to trigger lazy loading
    createFlowTemplate,
    updateFlowTemplate,
    deleteFlowTemplate,
    cloneFlowTemplate,
    
    // Queries
    getFlowTemplateById,
    getFlowTemplatesByCategory,
    getFlowTemplateUsageCount,

    // Legacy (will be deprecated)
    createJobFlow,
  }), [
    flowTemplates,
    isLoading,
    error,
    canFetch,
    refetch,
    ensureLoaded,
    createFlowTemplate,
    updateFlowTemplate,
    deleteFlowTemplate,
    cloneFlowTemplate,
    getFlowTemplateById,
    getFlowTemplatesByCategory,
    getFlowTemplateUsageCount,
    createJobFlow
  ])

  return (
    <FlowContext.Provider value={contextValue}>
      {children}
    </FlowContext.Provider>
  )
}
