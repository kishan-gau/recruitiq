import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { useFlow } from '../../context/FlowContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useJobForm } from './hooks/useJobForm'
import { validateJobForm, hasErrors } from './utils/validation'
import StepNavigation, { STEPS } from './components/StepNavigation'
import JobBasicsStep from './components/JobBasicsStep'
import JobDescriptionStep from './components/JobDescriptionStep'
import JobRequirementsStep from './components/JobRequirementsStep'
import JobComplianceStep from './components/JobComplianceStep'
import JobDistributionStep from './components/JobDistributionStep'

/**
 * JobRequisition - Main component for creating/editing job postings
 * Orchestrates multi-step form with validation and submission
 */
import api from '../../services/api'

export default function JobRequisition() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobs, candidates, loading, error, addJob, updateJob } = useData()
  const toast = useToast()
  const { flowTemplates, ensureLoaded } = useFlow()
  const { currentWorkspaceId } = useWorkspace()
  
  const isEdit = !!id
  
  // State for full job details (when editing)
  const [fullJobDetails, setFullJobDetails] = useState(null)
  const [loadingJobDetails, setLoadingJobDetails] = useState(false)
  
  // Get existing job - use full details if available, otherwise fall back to summary from jobs list
  const existingJob = isEdit ? (fullJobDetails || jobs.find(j => String(j.id) === id)) : null
  
  // Fetch full job details when editing
  useEffect(() => {
    if (isEdit && id) {
      const fetchJobDetails = async () => {
        try {
          setLoadingJobDetails(true)
          const response = await api.getJob(id)
          setFullJobDetails(response.job)
        } catch (err) {
          console.error('Failed to load job details:', err)
          toast.show(err.message || 'Failed to load job details', 'error')
        } finally {
          setLoadingJobDetails(false)
        }
      }
      fetchJobDetails()
    }
  }, [isEdit, id, toast])
  
  // Trigger lazy loading of flow templates when component mounts
  // Only loads data when user actually accesses job creation/editing
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  // State
  const [activeStep, setActiveStep] = useState('basics')
  const [complianceData, setComplianceData] = useState({
    eeoStatement: true,
    gdprCompliance: true,
    workAuthorization: false,
    backgroundCheck: false
  })
  const [distributionData, setDistributionData] = useState({
    publicPortal: {
      enabled: false,
      companyName: '',
      companyLogo: '',
      companyDescription: '',
      salaryMin: '',
      salaryMax: '',
      salaryPublic: false
    },
    jobBoards: {
      careerPage: true,
      linkedin: true,
      indeed: false,
      glassdoor: false,
      ziprecruiter: false
    }
  })
  
  // Refs for focus management
  const titleRef = useRef(null)
  const descriptionRef = useRef(null)
  const requirementsRef = useRef(null)
  
  // Form management hook
  const {
    formData,
    errors,
    touched,
    updateField,
    touchField,
    touchAllFields,
    validateForm,
    isValid,
    resetForm,
    getJobData
  } = useJobForm(existingJob)
  
  // Load existing job data
  useEffect(() => {
    if (existingJob) {
      resetForm(existingJob)
      
      // Load compliance data if exists
      if (existingJob.compliance) {
        setComplianceData(existingJob.compliance)
      }
      
      // Load distribution data if exists
      if (existingJob.distribution) {
        setDistributionData(existingJob.distribution)
      }
    }
  }, [existingJob, resetForm])
  
  // Get candidates for this job (if editing)
  const jobCandidates = isEdit && existingJob 
    ? candidates.filter(c => c.jobId === existingJob.id)
    : []
  
  // Get recent activity
  const getRecentActivity = () => {
    if (!isEdit || !existingJob) return []
    
    const activities = []
    
    jobCandidates
      .sort((a, b) => new Date(b.appliedDate || 0) - new Date(a.appliedDate || 0))
      .slice(0, 3)
      .forEach(candidate => {
        activities.push({
          type: 'application',
          candidate: candidate.name,
          message: `Applied for ${existingJob.title}`,
          time: '3 hours ago',
          avatar: candidate.avatar
        })
      })
    
    return activities
  }
  
  const recentActivity = getRecentActivity()
  
  // Get upcoming interviews
  const upcomingInterviews = isEdit && existingJob
    ? jobCandidates
        .filter(c => c.stage === 'Interview' || c.stage === 'Phone Screen')
        .slice(0, 3)
    : []
  
  // Handle field changes
  const handleFieldChange = (field, value) => {
    updateField(field, value)
  }
  
  const handleFieldBlur = (field) => {
    touchField(field)
  }
  
  // Navigation handlers
  const handleStepChange = (stepId) => {
    setActiveStep(stepId)
  }
  
  const handlePreviousStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === activeStep)
    if (currentIndex > 0) {
      setActiveStep(STEPS[currentIndex - 1].id)
    }
  }
  
  const handleNextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === activeStep)
    if (currentIndex < STEPS.length - 1) {
      setActiveStep(STEPS[currentIndex + 1].id)
    }
  }
  
  // Focus helper with animation
  const focusFieldWithAnimation = (ref, stepId) => {
    setActiveStep(stepId)
    
    if (ref?.current) {
      setTimeout(() => {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ref.current.classList.add('animate-shake')
        setTimeout(() => {
          ref.current?.classList.remove('animate-shake')
          ref.current?.focus()
        }, 400)
      }, 100)
    }
  }
  
  // Save as draft
  const handleSaveDraft = async () => {
    touchAllFields()
    
    const validationErrors = validateForm()
    
    // Check required fields only for draft
    if (validationErrors.title) {
      toast.show('Please enter a job title')
      focusFieldWithAnimation(titleRef, 'basics')
      return
    }
    
    if (validationErrors.description) {
      toast.show('Please enter a job description')
      focusFieldWithAnimation(descriptionRef, 'description')
      return
    }
    
    if (validationErrors.flowTemplateId) {
      toast.show('Please select a flow template')
      setActiveStep('basics')
      return
    }
    
    const jobData = getJobData()
    jobData.workspaceId = currentWorkspaceId
    jobData.status = 'draft'
    jobData.compliance = complianceData
    jobData.distribution = distributionData
    
    try {
      if (isEdit) {
        await updateJob(existingJob.id, jobData)
        toast.show('Draft saved')
      } else {
        await addJob(jobData)
        toast.show('Draft saved')
        navigate('/jobs')
      }
    } catch (err) {
      console.error('Failed to save draft:', err)
      // Show the actual error message from the backend
      const errorMessage = err.message || 'Failed to save draft'
      toast.show(errorMessage, 'error')
      
      // If it's a validation error about description, navigate to that step
      if (errorMessage.toLowerCase().includes('description')) {
        focusFieldWithAnimation(descriptionRef, 'description')
      } else if (errorMessage.toLowerCase().includes('title')) {
        focusFieldWithAnimation(titleRef, 'basics')
      } else if (errorMessage.toLowerCase().includes('requirements')) {
        focusFieldWithAnimation(requirementsRef, 'requirements')
      }
    }
  }
  
  // Publish job
  const handlePublish = async () => {
    touchAllFields()
    
    const validationErrors = validateForm()
    console.log('[JobRequisition] Validation errors:', validationErrors)
    
    // Validate all required fields for publish
    if (hasErrors(validationErrors)) {
      // Navigate to the first step with an error
      if (validationErrors.title || validationErrors.flowTemplateId) {
        setActiveStep('basics')
        if (validationErrors.title) {
          setTimeout(() => titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
        }
      } else if (validationErrors.description) {
        setActiveStep('description')
        setTimeout(() => descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      } else if (validationErrors.requirements) {
        setActiveStep('requirements')
        setTimeout(() => requirementsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      }
      return
    }
    
    const jobData = getJobData()
    jobData.workspaceId = currentWorkspaceId
    jobData.status = 'open'
    jobData.compliance = complianceData
    jobData.distribution = distributionData
    
    console.log('[JobRequisition] Publishing job with data:', jobData)
    
    // Handle errors inline with the promise - MUST RETURN to prevent unhandled rejection
    if (isEdit) {
      return updateJob(existingJob.id, jobData)
        .then(() => {
          toast.show('Job published')
          navigate(`/jobs/${existingJob.id}`)
        })
        .catch(err => {
          console.log('=== ERROR HANDLER EXECUTING (UPDATE) ===')
          handlePublishError(err)
        })
    } else {
      return addJob(jobData)
        .then(newJob => {
          console.log('[JobRequisition] Job published successfully:', newJob)
          toast.show('Job published')
          navigate(`/jobs/${newJob.id}`)
        })
        .catch(err => {
          console.log('=== ERROR HANDLER EXECUTING (CREATE) ===')
          handlePublishError(err)
        })
    }
  }
  
  // Separate error handler function
  const handlePublishError = (err) => {
    console.log('=== INSIDE handlePublishError ===')
      console.error('[JobRequisition] Failed to publish job:', err)
      console.error('[JobRequisition] Error details:', {
        message: err.message,
        response: err.response,
        status: err.status
      })
      
      // Extract error message - handle both string and structured errors
      let errorMessage = 'Failed to publish job'
      let fieldName = null
      
      // Try to parse structured validation errors
      if (err.response && typeof err.response === 'object') {
        // Check for Joi validation errors
        if (err.response.message) {
          if (typeof err.response.message === 'string') {
            errorMessage = err.response.message
          } else if (typeof err.response.message === 'object') {
            // Joi validation error format
            const validationDetails = err.response.message.details || err.response.message
            if (Array.isArray(validationDetails) && validationDetails.length > 0) {
              errorMessage = validationDetails[0].message
              fieldName = validationDetails[0].path?.[0] || validationDetails[0].context?.key
            }
          }
        } else if (err.response.error) {
          errorMessage = typeof err.response.error === 'string' ? err.response.error : JSON.stringify(err.response.error)
        }
      } else if (err.message && err.message !== '[object Object]') {
        errorMessage = err.message
      }
      
      // Extract field name from error message if not already found
      if (!fieldName) {
        const lowerMessage = errorMessage.toLowerCase()
        console.log('[JobRequisition] Checking error message for field name:', lowerMessage)
        if (lowerMessage.includes('description')) fieldName = 'description'
        else if (lowerMessage.includes('title')) fieldName = 'title'
        else if (lowerMessage.includes('requirements') || lowerMessage.includes('required')) fieldName = 'requirements'
        else if (lowerMessage.includes('employment') || lowerMessage.includes('type')) fieldName = 'type'
        else if (lowerMessage.includes('department')) fieldName = 'department'
        else if (lowerMessage.includes('location')) fieldName = 'location'
      }
      
      console.log('[JobRequisition] Extracted field name:', fieldName)
      console.log('[JobRequisition] Error message:', errorMessage)
      
      // Show toast with error
      toast.show(errorMessage, 'error')
      
      // Set field error and navigate to it
      if (fieldName) {
        console.log('[JobRequisition] Setting error for field:', fieldName)
        setErrors(prev => {
          const newErrors = { ...prev, [fieldName]: errorMessage }
          console.log('[JobRequisition] New errors state:', newErrors)
          return newErrors
        })
        setTouched(prev => {
          const newTouched = { ...prev, [fieldName]: true }
          console.log('[JobRequisition] New touched state:', newTouched)
          return newTouched
        })
        
        // Navigate to appropriate step
        if (fieldName === 'title' || fieldName === 'flowTemplateId' || fieldName === 'type' || fieldName === 'department' || fieldName === 'location') {
          console.log('[JobRequisition] Navigating to basics step')
          setActiveStep('basics')
          setTimeout(() => titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
        } else if (fieldName === 'description') {
          console.log('[JobRequisition] Navigating to description step')
          setActiveStep('description')
          setTimeout(() => {
            console.log('[JobRequisition] Scrolling to description field')
            descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            descriptionRef.current?.focus()
          }, 100)
        } else if (fieldName === 'requirements') {
          console.log('[JobRequisition] Navigating to requirements step')
          setActiveStep('requirements')
          setTimeout(() => requirementsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
        }
      } else {
        console.log('[JobRequisition] No field name detected, cannot set field error')
      }
  }
  
  // Loading state
  // Loading state
  if (loading.jobs || loading.candidates || loadingJobDetails) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            {loadingJobDetails ? 'Loading job details...' : 'Loading job...'}
          </p>
        </div>
      </div>
    )
  }
  
  // In edit mode, wait for full job details to load
  if (isEdit && !existingJob) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading job details...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error.jobs || error.candidates) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Failed to load job</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">{error.jobs || error.candidates}</p>
        <button
          onClick={() => navigate('/jobs')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors"
        >
          Back to Jobs
        </button>
      </div>
    )
  }
  
  // Not found state (for edit mode)
  if (isEdit && !existingJob) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Job not found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">The job you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors"
        >
          Back to Jobs
        </button>
      </div>
    )
  }
  
  return (
    <div key={isEdit ? (existingJob?.id || 'loading') : 'new'} className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/50 border-b dark:border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/jobs"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Edit Job Posting' : 'Create Job Posting'}
              </h1>
              {isEdit && existingJob && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {existingJob.title}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                // Defer to next tick to avoid React's error boundary
                setTimeout(() => handlePublish(), 0)
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isEdit ? 'Update Job' : 'Publish Job'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* Step Navigation Sidebar */}
          <div className="flex-shrink-0">
            <StepNavigation
              activeStep={activeStep}
              onStepChange={handleStepChange}
              errors={errors}
              touched={touched}
            />
          </div>
          
          {/* Form Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
              {/* Basics Step */}
              {activeStep === 'basics' && (
                <JobBasicsStep
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                  titleRef={titleRef}
                  flowTemplates={flowTemplates}
                />
              )}
              
              {/* Description Step */}
              {activeStep === 'description' && (
                <JobDescriptionStep
                  description={formData.description}
                  error={errors.description}
                  touched={touched.description}
                  onChange={(value) => handleFieldChange('description', value)}
                  onBlur={() => handleFieldBlur('description')}
                  descriptionRef={descriptionRef}
                  toast={toast}
                />
              )}
              
              {/* Requirements Step */}
              {activeStep === 'requirements' && (
                <JobRequirementsStep
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                  requirementsRef={requirementsRef}
                  toast={toast}
                />
              )}
              
              {/* Compliance Step */}
              {activeStep === 'compliance' && (
                <JobComplianceStep
                  complianceData={complianceData}
                  onChange={setComplianceData}
                />
              )}
              
              {/* Distribution Step */}
              {activeStep === 'distribution' && (
                <JobDistributionStep
                  distributionData={distributionData}
                  onChange={setDistributionData}
                  isEdit={isEdit}
                  jobId={existingJob?.id}
                />
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t dark:border-slate-700">
                <button
                  onClick={handlePreviousStep}
                  disabled={activeStep === 'basics'}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={activeStep === 'distribution'}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Activity (only for existing jobs) */}
          {isEdit && existingJob && (
            <div className="w-80 space-y-6">
              {/* Upcoming Interviews */}
              {upcomingInterviews.length > 0 && (
                <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Upcoming Interviews</h3>
                  <div className="space-y-3">
                    {upcomingInterviews.map(candidate => (
                      <Link
                        key={candidate.id}
                        to={`/candidates/${candidate.id}`}
                        className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-100">{existingJob.title}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{candidate.name}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {activity.candidate.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{activity.candidate}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{activity.message}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
