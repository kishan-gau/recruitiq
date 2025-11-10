import React, { createContext, useContext, useEffect, useState } from 'react'
import { getInitialData } from '../mockData'
import { useWorkspace } from './WorkspaceContext'
import { useAuth } from '@recruitiq/auth'
import api from '../services/api'

const DataContext = createContext(null)

export function DataProvider({children}){
  const { currentWorkspaceId, isInitialized } = useWorkspace()
  const { user } = useAuth()
  
  // Separate loading and error states for better UX
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [applications, setApplications] = useState([])
  const [interviews, setInterviews] = useState([])
  
  const [loading, setLoading] = useState({
    jobs: false,
    candidates: false,
    applications: false,
    interviews: false
  })
  
  const [error, setError] = useState({
    jobs: null,
    candidates: null,
    applications: null,
    interviews: null
  })

  // Load data from API when workspace changes
  useEffect(() => {
    if (!isInitialized || !currentWorkspaceId || !user) return
    
    loadAllData()
  }, [currentWorkspaceId, isInitialized, user])
  
  // Load all data from API
  const loadAllData = async () => {
    await Promise.all([
      loadJobs(),
      loadCandidates(),
      loadApplications(),
      loadInterviews()
    ])
  }
  
  // Load Jobs
  const loadJobs = async () => {
    if (!currentWorkspaceId) return
    
    try {
      setLoading(prev => ({ ...prev, jobs: true }))
      setError(prev => ({ ...prev, jobs: null }))
      
      const response = await api.getJobs(currentWorkspaceId)
      setJobs(response.jobs || [])
    } catch (err) {
      console.error('Failed to load jobs:', err)
      setError(prev => ({ ...prev, jobs: err.message }))
      setJobs([]) // Clear on error
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }))
    }
  }
  
  // Load Candidates
  const loadCandidates = async () => {
    if (!currentWorkspaceId) return
    
    try {
      setLoading(prev => ({ ...prev, candidates: true }))
      setError(prev => ({ ...prev, candidates: null }))
      
      const response = await api.getCandidates(currentWorkspaceId)
      setCandidates(response.candidates || [])
    } catch (err) {
      console.error('Failed to load candidates:', err)
      setError(prev => ({ ...prev, candidates: err.message }))
      setCandidates([])
    } finally {
      setLoading(prev => ({ ...prev, candidates: false }))
    }
  }
  
  // Load Applications
  const loadApplications = async () => {
    if (!currentWorkspaceId) return
    
    try {
      setLoading(prev => ({ ...prev, applications: true }))
      setError(prev => ({ ...prev, applications: null }))
      
      const response = await api.getApplications(currentWorkspaceId)
      setApplications(response.applications || [])
    } catch (err) {
      console.error('Failed to load applications:', err)
      setError(prev => ({ ...prev, applications: err.message }))
      setApplications([])
    } finally {
      setLoading(prev => ({ ...prev, applications: false }))
    }
  }
  
  // Load Interviews
  const loadInterviews = async () => {
    if (!currentWorkspaceId) return
    
    try {
      setLoading(prev => ({ ...prev, interviews: true }))
      setError(prev => ({ ...prev, interviews: null }))
      
      const response = await api.getInterviews({ workspaceId: currentWorkspaceId })
      setInterviews(response.interviews || [])
    } catch (err) {
      console.error('Failed to load interviews:', err)
      setError(prev => ({ ...prev, interviews: err.message }))
      setInterviews([])
    } finally {
      setLoading(prev => ({ ...prev, interviews: false }))
    }
  }

  
  // ============================================
  // JOB OPERATIONS
  // ============================================
  
  async function addJob(job){
    try {
      setLoading(prev => ({ ...prev, jobs: true }))
      setError(prev => ({ ...prev, jobs: null }))
      
      console.log('[DataContext] addJob called with:', job)
      console.log('[DataContext] currentWorkspaceId:', currentWorkspaceId, 'type:', typeof currentWorkspaceId)
      
      // Send API data in camelCase (industry standard)
      // Backend controller will convert to snake_case using DTO mapper
      const jobData = {
        workspaceId: currentWorkspaceId,
        title: job.title,
        department: job.department || '',
        location: job.location || '',
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel || '',
        description: job.description,
        requirements: job.requirements, // Already converted to array in JobRequisition.jsx
        isRemote: false,
        isPublic: false,
        flowTemplateId: job.flowTemplateId
      }
      
      console.log('[DataContext] Sending to API:', jobData)
      console.log('[DataContext] flowTemplateId value:', jobData.flowTemplateId, 'type:', typeof jobData.flowTemplateId)
      console.log('[DataContext] workspaceId value:', jobData.workspaceId, 'type:', typeof jobData.workspaceId)
      console.log('[DataContext] workspaceId EXACT STRING:', JSON.stringify(jobData.workspaceId))
      console.log('[DataContext] currentWorkspaceId EXACT STRING:', JSON.stringify(currentWorkspaceId))
      
      const response = await api.createJob(jobData)
      const created = response.job
      
      console.log('[DataContext] Job created successfully:', created)
      
      // Optimistically update UI
      setJobs(prev => [created, ...prev])
      
      return created
    } catch (err) {
      console.error('[DataContext] Failed to create job:', err)
      console.error('[DataContext] Error details:', {
        message: err.message,
        response: err.response,
        status: err.status
      })
      // Only set global error for non-validation errors (500, network issues, etc.)
      // Validation errors (400) should be handled by the calling component
      if (!err.status || err.status >= 500) {
        setError(prev => ({ ...prev, jobs: err.message }))
      }
      throw err
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }))
    }
  }

  async function updateJob(id, updates){
    try {
      setLoading(prev => ({ ...prev, jobs: true }))
      setError(prev => ({ ...prev, jobs: null }))
      
      const response = await api.updateJob(id, updates)
      const updated = response.job
      
      // Update in state
      setJobs(prev => prev.map(j => j.id === id ? updated : j))
      
      return updated
    } catch (err) {
      console.error('[DataContext] Failed to update job:', err)
      // Only set global error for non-validation errors (500, network issues, etc.)
      // Validation errors (400) should be handled by the calling component
      if (!err.status || err.status >= 500) {
        setError(prev => ({ ...prev, jobs: err.message }))
      }
      throw err
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }))
    }
  }
  
  async function deleteJob(id, opts = {}) {
    const job = jobs.find(j => j.id === id)
    if (!job) return
    
    try {
      // Optimistically remove from UI
      setJobs(prev => prev.filter(j => j.id !== id))
      
      await api.deleteJob(id)
      
      if (opts.toast) {
        const undo = async () => {
          // Restore locally (re-create via API)
          try {
            const response = await api.createJob(job)
            setJobs(prev => [response.job, ...prev])
          } catch (err) {
            console.error('Failed to undo job deletion:', err)
          }
        }
        opts.toast.show('Job deleted', { duration: 8000, action: undo })
      }
    } catch (err) {
      console.error('Failed to delete job:', err)
      // Restore on error
      setJobs(prev => [job, ...prev])
      if (opts.toast) {
        opts.toast.show('Failed to delete job: ' + err.message, { type: 'error' })
      }
      throw err
    }
  }
  
  // ============================================
  // CANDIDATE OPERATIONS
  // ============================================

  async function addCandidate(candidate){
    try {
      setLoading(prev => ({ ...prev, candidates: true }))
      setError(prev => ({ ...prev, candidates: null }))
      
      // Parse name into firstName and lastName if provided as single field
      let firstName = candidate.firstName || ''
      let lastName = candidate.lastName || ''
      
      if (candidate.name && !candidate.firstName && !candidate.lastName) {
        const nameParts = candidate.name.trim().split(/\s+/)
        firstName = nameParts[0] || ''
        lastName = nameParts.slice(1).join(' ') || ''
      }
      
      // Generate temporary email if not provided (backend requires email)
      const email = candidate.email?.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@temp.recruitiq.local`
      
      const candidateData = {
        firstName,
        lastName,
        email,
        phone: candidate.phone || '',
        location: candidate.location || '',
        currentJobTitle: candidate.title || candidate.currentJobTitle || '',
        // Backend will derive organization from user context
        source: candidate.source || 'manual',
        linkedinUrl: candidate.linkedinUrl || '',
        portfolioUrl: candidate.portfolioUrl || '',
        resumeUrl: candidate.resume || '',
        // Include job and stage for automatic application creation
        jobId: candidate.jobId || null,
        stage: candidate.stage || null,
        workspaceId: currentWorkspaceId || null
      }
      
      console.log('[DataContext] addCandidate - sending:', candidateData)
      
      const response = await api.createCandidate(candidateData)
      const created = response.candidate
      
      // Optimistically update UI
      setCandidates(prev => [created, ...prev])
      
      return created
    } catch (err) {
      console.error('Failed to create candidate:', err)
      setError(prev => ({ ...prev, candidates: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, candidates: false }))
    }
  }
  
  async function updateCandidate(id, updates) {
    try {
      setLoading(prev => ({ ...prev, candidates: true }))
      setError(prev => ({ ...prev, candidates: null }))
      
      const response = await api.updateCandidate(id, updates)
      const updated = response.candidate
      
      // Update in state
      setCandidates(prev => prev.map(c => c.id === id ? updated : c))
      
      return updated
    } catch (err) {
      console.error('Failed to update candidate:', err)
      setError(prev => ({ ...prev, candidates: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, candidates: false }))
    }
  }

  // optimistic move with undo callback
  async function moveCandidate(id, newStage, opts={showUndo:true, toast}){
    const prev = candidates.find(c=>c.id===id)?.stage
    
    // Optimistically update UI
    setCandidates(prevCandidates => 
      prevCandidates.map(c=> c.id===id? {...c, stage:newStage}: c)
    )
    
    try {
      await api.updateCandidate(id, { stage: newStage })
      
      if(opts.showUndo && opts.toast){
        const undo = async ()=> {
          setCandidates(prevCandidates => 
            prevCandidates.map(c=> c.id===id? {...c, stage:prev}: c)
          )
          // Revert on server
          try {
            await api.updateCandidate(id, { stage: prev })
          } catch (err) {
            console.error('Failed to undo stage change:', err)
          }
        }
        opts.toast.show(`Moved to ${newStage}`, {duration: 5000, action: undo})
      }
    } catch (err) {
      console.error('Failed to move candidate:', err)
      // Revert optimistic update
      setCandidates(prevCandidates => 
        prevCandidates.map(c=> c.id===id? {...c, stage:prev}: c)
      )
      if (opts.toast) {
        opts.toast.show('Failed to move candidate: ' + err.message, { type: 'error' })
      }
    }
  }

  async function deleteCandidate(id, opts={toast}){
    const candidate = candidates.find(c=> c.id===id)
    if(!candidate) return
    
    try {
      // Optimistically remove from UI
      setCandidates(prev => prev.filter(c=> c.id!==id))
      
      await api.deleteCandidate(id)
      
      if(opts.toast){
        const undo = async ()=>{
          // Restore locally (re-create via API)
          try {
            const response = await api.createCandidate(candidate)
            setCandidates(prev => [response.candidate, ...prev])
          } catch (err) {
            console.error('Failed to undo candidate deletion:', err)
          }
        }
        opts.toast.show('Candidate deleted', {duration: 8000, action: undo})
      }
    } catch (err) {
      console.error('Failed to delete candidate:', err)
      // Restore on error
      setCandidates(prev => [candidate, ...prev])
      if (opts.toast) {
        opts.toast.show('Failed to delete candidate: ' + err.message, { type: 'error' })
      }
      throw err
    }
  }
  
  // ============================================
  // APPLICATION OPERATIONS
  // ============================================
  
  async function addApplication(application) {
    try {
      setLoading(prev => ({ ...prev, applications: true }))
      setError(prev => ({ ...prev, applications: null }))
      
      const applicationData = {
        ...application,
        workspaceId: currentWorkspaceId
      }
      
      const response = await api.createApplication(applicationData)
      const created = response.application
      
      setApplications(prev => [created, ...prev])
      
      return created
    } catch (err) {
      console.error('Failed to create application:', err)
      setError(prev => ({ ...prev, applications: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, applications: false }))
    }
  }
  
  async function updateApplication(id, updates) {
    try {
      setLoading(prev => ({ ...prev, applications: true }))
      setError(prev => ({ ...prev, applications: null }))
      
      const response = await api.updateApplication(id, updates)
      const updated = response.application
      
      setApplications(prev => prev.map(a => a.id === id ? updated : a))
      
      return updated
    } catch (err) {
      console.error('Failed to update application:', err)
      setError(prev => ({ ...prev, applications: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, applications: false }))
    }
  }
  
  async function deleteApplication(id, opts = {}) {
    const application = applications.find(a => a.id === id)
    if (!application) return
    
    try {
      setApplications(prev => prev.filter(a => a.id !== id))
      
      await api.deleteApplication(id)
      
      if (opts.toast) {
        const undo = async () => {
          try {
            const response = await api.createApplication(application)
            setApplications(prev => [response.application, ...prev])
          } catch (err) {
            console.error('Failed to undo application deletion:', err)
          }
        }
        opts.toast.show('Application deleted', { duration: 8000, action: undo })
      }
    } catch (err) {
      console.error('Failed to delete application:', err)
      setApplications(prev => [application, ...prev])
      if (opts.toast) {
        opts.toast.show('Failed to delete application: ' + err.message, { type: 'error' })
      }
      throw err
    }
  }
  
  // ============================================
  // INTERVIEW OPERATIONS
  // ============================================
  
  async function addInterview(interview) {
    try {
      setLoading(prev => ({ ...prev, interviews: true }))
      setError(prev => ({ ...prev, interviews: null }))
      
      const interviewData = {
        ...interview,
        workspaceId: currentWorkspaceId
      }
      
      const response = await api.createInterview(interviewData)
      const created = response.interview
      
      setInterviews(prev => [created, ...prev])
      
      return created
    } catch (err) {
      console.error('Failed to create interview:', err)
      setError(prev => ({ ...prev, interviews: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, interviews: false }))
    }
  }
  
  async function updateInterview(id, updates) {
    try {
      setLoading(prev => ({ ...prev, interviews: true }))
      setError(prev => ({ ...prev, interviews: null }))
      
      const response = await api.updateInterview(id, updates)
      const updated = response.interview
      
      setInterviews(prev => prev.map(i => i.id === id ? updated : i))
      
      return updated
    } catch (err) {
      console.error('Failed to update interview:', err)
      setError(prev => ({ ...prev, interviews: err.message }))
      throw err
    } finally {
      setLoading(prev => ({ ...prev, interviews: false }))
    }
  }
  
  async function deleteInterview(id, opts = {}) {
    const interview = interviews.find(i => i.id === id)
    if (!interview) return
    
    try {
      setInterviews(prev => prev.filter(i => i.id !== id))
      
      await api.deleteInterview(id)
      
      if (opts.toast) {
        const undo = async () => {
          try {
            const response = await api.createInterview(interview)
            setInterviews(prev => [response.interview, ...prev])
          } catch (err) {
            console.error('Failed to undo interview deletion:', err)
          }
        }
        opts.toast.show('Interview deleted', { duration: 8000, action: undo })
      }
    } catch (err) {
      console.error('Failed to delete interview:', err)
      setInterviews(prev => [interview, ...prev])
      if (opts.toast) {
        opts.toast.show('Failed to delete interview: ' + err.message, { type: 'error' })
      }
      throw err
    }
  }
  
  // ============================================
  // CONTEXT VALUE
  // ============================================
  
  const value = { 
    // Data
    jobs,
    candidates,
    applications,
    interviews,
    
    // Loading states
    loading,
    
    // Error states
    error,
    
    // Refresh methods
    loadJobs,
    loadCandidates,
    loadApplications,
    loadInterviews,
    loadAllData,
    
    // Job operations
    addJob, 
    updateJob,
    deleteJob,
    
    // Candidate operations
    addCandidate, 
    updateCandidate,
    moveCandidate, 
    deleteCandidate,
    
    // Application operations
    addApplication,
    updateApplication,
    deleteApplication,
    
    // Interview operations
    addInterview,
    updateInterview,
    deleteInterview,
    
    // Legacy compatibility (for gradual migration)
    state: { jobs, candidates, applications, interviews },
    setState: (updater) => {
      const newState = typeof updater === 'function' ? updater({ jobs, candidates, applications, interviews }) : updater
      if (newState.jobs) setJobs(newState.jobs)
      if (newState.candidates) setCandidates(newState.candidates)
      if (newState.applications) setApplications(newState.applications)
      if (newState.interviews) setInterviews(newState.interviews)
    }
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(){
  const ctx = useContext(DataContext)
  if(!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

export default DataContext
