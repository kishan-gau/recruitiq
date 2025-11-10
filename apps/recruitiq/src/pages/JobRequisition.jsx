import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useFlow } from '../context/FlowContext'

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'description', label: 'Description' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'distribution', label: 'Distribution' }
]

export default function JobRequisition() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobs, candidates, loading, error, addJob, updateJob } = useData()
  const toast = useToast()
  const { flowTemplates, createJobFlow, ensureLoaded } = useFlow()
  
  const isEdit = !!id
  const existingJob = isEdit && Array.isArray(jobs) ? jobs.find(j => j && j.id && String(j.id) === id) : null
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [activeStep, setActiveStep] = useState('basics')
  const [isDraft, setIsDraft] = useState(true)
  
  // Form data
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [location, setLocation] = useState('San Francisco')
  const [type, setType] = useState('full-time')
  const [openings, setOpenings] = useState(1)
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('mid')
  const [salary, setSalary] = useState('')
  const [flowTemplateId, setFlowTemplateId] = useState('')
  const [titleError, setTitleError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [touched, setTouched] = useState({ title: false, description: false })
  
  // Refs for textareas
  const descriptionRef = React.useRef(null)
  const requirementsRef = React.useRef(null)
  const titleRef = React.useRef(null)
  
  // Ensure flow templates are loaded when component mounts
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  // Load existing job data
  useEffect(() => {
    if (existingJob) {
      setTitle(existingJob.title || '')
      setDepartment(existingJob.department || 'Engineering')
      setLocation(existingJob.location || 'San Francisco')
      setType(existingJob.employmentType || existingJob.type || 'full-time') // Handle both field names
      setOpenings(existingJob.openings || 1)
      setDescription(existingJob.description || '')
      // Convert requirements array back to string for textarea
      const requirementsStr = Array.isArray(existingJob.requirements)
        ? existingJob.requirements.join('\n')
        : existingJob.requirements || ''
      setRequirements(requirementsStr)
      setExperienceLevel(existingJob.experienceLevel || 'mid')
      setSalary(existingJob.salary || '')
      setFlowTemplateId(existingJob.flowTemplateId || '')
      setIsDraft(existingJob.status === 'draft')
    }
  }, [existingJob])
  
  const validateTitle = (value) => {
    if (!value.trim()) {
      return 'Job title is required'
    }
    return ''
  }

  const validateDescription = (value) => {
    if (!value.trim()) {
      return 'Job description is required'
    }
    return ''
  }

  const handleTitleChange = (e) => {
    const value = e.target.value
    setTitle(value)
    if (touched.title) {
      setTitleError(validateTitle(value))
    }
  }

  const handleTitleBlur = () => {
    setTouched(prev => ({ ...prev, title: true }))
    setTitleError(validateTitle(title))
  }

  const handleDescriptionChange = (e) => {
    const value = e.target.value
    setDescription(value)
    if (touched.description) {
      setDescriptionError(validateDescription(value))
    }
  }

  const handleDescriptionBlur = () => {
    setTouched(prev => ({ ...prev, description: true }))
    setDescriptionError(validateDescription(description))
  }

  const handleSaveDraft = async () => {
    // Mark as touched
    setTouched({ title: true, description: true })
    
    const titleValidationError = validateTitle(title)
    const descriptionValidationError = validateDescription(description)
    setTitleError(titleValidationError)
    setDescriptionError(descriptionValidationError)
    
    if (titleValidationError) {
      toast.show('Please enter a job title')
      setActiveStep('basics')
      
      // Scroll to and focus with animation
      if (titleRef.current) {
        setTimeout(() => {
          titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          titleRef.current.classList.add('animate-shake')
          setTimeout(() => {
            titleRef.current?.classList.remove('animate-shake')
            titleRef.current?.focus()
          }, 400)
        }, 100)
      }
      return
    }

    if (descriptionValidationError) {
      toast.show('Please enter a job description')
      setActiveStep('description')
      
      // Scroll to and focus with animation
      if (descriptionRef.current) {
        setTimeout(() => {
          descriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          descriptionRef.current.classList.add('animate-shake')
          setTimeout(() => {
            descriptionRef.current?.classList.remove('animate-shake')
            descriptionRef.current?.focus()
          }, 400)
        }, 100)
      }
      return
    }
    
    if (!flowTemplateId) {
      toast.show('Please select a flow template')
      setActiveStep('distribution')
      return
    }
    
    const jobData = {
      title,
      department,
      location,
      employmentType: type, // Backend expects 'employmentType', not 'type'
      description,
      requirements,
      experienceLevel,
      flowTemplateId: flowTemplateId // Required flow template ID
    }
    
    try {
      if (isEdit) {
        await updateJob(existingJob.id, jobData)
        toast.show('Draft saved')
      } else {
        const newJob = await addJob(jobData)
        // Flow template is now sent with job data, no need for separate createJobFlow
        toast.show('Draft saved')
        navigate('/jobs')
      }
    } catch (err) {
      console.error(err)
      toast.show('Failed to save draft')
    }
  }
  
  const handlePublish = async () => {
    // Mark as touched
    setTouched({ title: true, description: true })
    
    const titleValidationError = validateTitle(title)
    const descriptionValidationError = validateDescription(description)
    setTitleError(titleValidationError)
    setDescriptionError(descriptionValidationError)
    
    if (titleValidationError) {
      toast.show('Please enter a job title')
      setActiveStep('basics')
      
      // Scroll to and focus with animation
      if (titleRef.current) {
        setTimeout(() => {
          titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          titleRef.current.classList.add('animate-shake')
          setTimeout(() => {
            titleRef.current?.classList.remove('animate-shake')
            titleRef.current?.focus()
          }, 400)
        }, 100)
      }
      return
    }

    if (descriptionValidationError) {
      toast.show('Please enter a job description')
      setActiveStep('description')
      
      // Scroll to and focus with animation
      if (descriptionRef.current) {
        setTimeout(() => {
          descriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          descriptionRef.current.classList.add('animate-shake')
          setTimeout(() => {
            descriptionRef.current?.classList.remove('animate-shake')
            descriptionRef.current?.focus()
          }, 400)
        }, 100)
      }
      return
    }
    
    if (!flowTemplateId) {
      toast.show('Please select a flow template before publishing')
      setActiveStep('distribution')
      return
    }
    
    console.log('[JobRequisition] type value:', type, 'type:', typeof type)
    console.log('[JobRequisition] requirements raw value:', requirements, 'type:', typeof requirements)
    
    // Convert requirements from string to array if needed
    const requirementsArray = typeof requirements === 'string' 
      ? requirements.split('\n').filter(r => r.trim()) 
      : requirements
    
    console.log('[JobRequisition] requirementsArray after conversion:', requirementsArray, 'length:', requirementsArray?.length)
    
    const jobData = {
      title,
      department,
      location,
      employmentType: type, // Backend expects 'employmentType', not 'type'
      description,
      requirements: requirementsArray,
      experienceLevel
    }
    
    // Only include flowTemplateId when creating a new job, not when updating
    if (!isEdit) {
      jobData.flowTemplateId = flowTemplateId
    }
    
    console.log('[JobRequisition] jobData before sending:', jobData)
    console.log('[JobRequisition] jobData.requirements:', jobData.requirements)
    
    try {
      if (isEdit) {
        await updateJob(existingJob.id, jobData)
        toast.show('Job updated successfully')
        navigate(`/jobs/${existingJob.id}`)
      } else {
        const newJob = await addJob(jobData)
        // Flow template is now sent with job data, no need for separate createJobFlow
        toast.show('Job published')
        navigate(`/jobs/${newJob.id}`)
      }
    } catch (err) {
      console.error(err)
      // Show the actual error message from the API if available
      const errorMessage = err.message || 'Failed to publish job'
      toast.show(errorMessage)
    }
  }
  
  // Get step status (completed, active, pending)
  const getStepStatus = (stepId) => {
    const stepIndex = STEPS.findIndex(s => s.id === stepId)
    const activeIndex = STEPS.findIndex(s => s.id === activeStep)
    
    if (stepIndex < activeIndex) return 'completed'
    if (stepIndex === activeIndex) return 'active'
    return 'pending'
  }
  
  // Get candidates for this job (if editing existing job)
  const jobCandidates = isEdit && existingJob 
    ? candidates.filter(c => c.jobId === existingJob.id)
    : []
  
  // Get recent activity for this job
  const getRecentActivity = () => {
    if (!isEdit || !existingJob) return []
    
    const activities = []
    
    // Get recent applications
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
  
  // Get upcoming interviews for this job
  const upcomingInterviews = isEdit && existingJob
    ? jobCandidates
        .filter(c => c.stage === 'Interview' || c.stage === 'Phone Screen')
        .slice(0, 3)
    : []
  
  // Text formatting functions for description
  const applyFormat = (formatType) => {
    const textarea = descriptionRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    
    if (!selectedText) {
      toast.show('Please select text to format')
      return
    }
    
    let formattedText = ''
    let newCursorPos = end
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`
        newCursorPos = end + 4
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        newCursorPos = end + 2
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        newCursorPos = end + 4
        break
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`
        newCursorPos = end + 4
        break
      default:
        formattedText = selectedText
    }
    
    const newDescription = description.substring(0, start) + formattedText + description.substring(end)
    setDescription(newDescription)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Text formatting functions for requirements
  const applyFormatRequirements = (formatType) => {
    const textarea = requirementsRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    if (!selectedText) {
      toast.show('Please select text to format')
      return
    }
    
    let formattedText = ''
    let newCursorPos = end
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`
        newCursorPos = end + 4
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        newCursorPos = end + 2
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        newCursorPos = end + 4
        break
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`
        newCursorPos = end + 4
        break
      default:
        formattedText = selectedText
    }
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    setRequirements(newRequirements)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }
  
  const insertList = (listType) => {
    const textarea = descriptionRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    
    let formattedText = ''
    
    if (selectedText) {
      // Format selected lines
      const lines = selectedText.split('\n')
      formattedText = lines.map((line, index) => {
        if (line.trim()) {
          return listType === 'bullet' ? `• ${line.trim()}` : `${index + 1}. ${line.trim()}`
        }
        return line
      }).join('\n')
    } else {
      // Insert new list item
      formattedText = listType === 'bullet' ? '• ' : '1. '
    }
    
    const newDescription = description.substring(0, start) + formattedText + description.substring(end)
    setDescription(newDescription)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
  }
  
  const insertLink = () => {
    const textarea = descriptionRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    
    const linkText = selectedText || 'link text'
    const formattedText = `[${linkText}](https://example.com)`
    
    const newDescription = description.substring(0, start) + formattedText + description.substring(end)
    setDescription(newDescription)
    
    setTimeout(() => {
      textarea.focus()
      // Select the URL part for easy editing
      const urlStart = start + linkText.length + 3
      textarea.setSelectionRange(urlStart, urlStart + 19)
    }, 0)
  }
  
  const insertHeading = () => {
    const textarea = descriptionRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const lineStart = description.lastIndexOf('\n', start - 1) + 1
    
    const formattedText = '## '
    const newDescription = description.substring(0, lineStart) + formattedText + description.substring(lineStart)
    setDescription(newDescription)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + formattedText.length, lineStart + formattedText.length)
    }, 0)
  }

  // Requirements formatting functions
  const insertListRequirements = (listType) => {
    const textarea = requirementsRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    let formattedText = ''
    
    if (selectedText) {
      // Format selected lines
      const lines = selectedText.split('\n')
      formattedText = lines.map((line, index) => {
        if (line.trim()) {
          return listType === 'bullet' ? `• ${line.trim()}` : `${index + 1}. ${line.trim()}`
        }
        return line
      }).join('\n')
    } else {
      // Insert new list item
      formattedText = listType === 'bullet' ? '• ' : '1. '
    }
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    setRequirements(newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
  }
  
  const insertLinkRequirements = () => {
    const textarea = requirementsRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    const linkText = selectedText || 'link text'
    const formattedText = `[${linkText}](https://example.com)`
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    setRequirements(newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      // Select the URL part for easy editing
      const urlStart = start + linkText.length + 3
      textarea.setSelectionRange(urlStart, urlStart + 19)
    }, 0)
  }
  
  const insertHeadingRequirements = () => {
    const textarea = requirementsRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const lineStart = requirements.lastIndexOf('\n', start - 1) + 1
    
    const formattedText = '## '
    const newRequirements = requirements.substring(0, lineStart) + formattedText + requirements.substring(lineStart)
    setRequirements(newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + formattedText.length, lineStart + formattedText.length)
    }, 0)
  }

  // Convert markdown to HTML for preview
  // Show loading state
  if (loading.jobs || loading.candidates) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading job...</p>
        </div>
      </div>
    )
  }

  // Show error state
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

  // Show not found for edit mode (only if not loading)
  if (isEdit && !existingJob && !loading.jobs) {
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

  const parseMarkdown = (text) => {
    if (!text) return ''
    
    let html = text
    
    // Convert headings (## Heading)
    html = html.replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-slate-900 dark:text-slate-100">$1</h3>')
    
    // Convert bold (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    
    // Convert italic (*text*)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>')
    
    // Convert underline (__text__)
    html = html.replace(/__(.+?)__/g, '<u class="underline">$1</u>')
    
    // Convert strikethrough (~~text~~)
    html = html.replace(/~~(.+?)~~/g, '<s class="line-through">$1</s>')
    
    // Convert links ([text](url))
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-emerald-600 dark:text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Convert bullet points (• item)
    html = html.replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
    
    // Convert numbered lists (1. item, 2. item, etc.)
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    
    // Wrap consecutive <li> elements in <ul> or <ol>
    html = html.replace(/(<li class="ml-4">.*?<\/li>\n?)+/g, (match) => {
      return `<ul class="list-disc space-y-1 my-2">${match}</ul>`
    })
    html = html.replace(/(<li class="ml-4 list-decimal">.*?<\/li>\n?)+/g, (match) => {
      return `<ol class="list-decimal space-y-1 my-2">${match}</ol>`
    })
    
    // Convert line breaks to <br> but preserve paragraph spacing
    html = html.replace(/\n\n/g, '</p><p class="mt-3">')
    html = html.replace(/\n/g, '<br />')
    
    // Wrap in paragraph if not empty
    if (html && !html.startsWith('<')) {
      html = `<p>${html}</p>`
    }
    
    return html
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            to="/jobs" 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Job Requisition' : 'Job Requisition'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="save-draft-button"
            onClick={handleSaveDraft}
            disabled={!title.trim() || !flowTemplateId}
            className={`px-4 py-2 border rounded font-medium shadow-sm transition-all duration-200 ${
              !title.trim() || !flowTemplateId
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:shadow'
            }`}
          >
            Save Draft
          </button>
          <button
            data-testid="publish-button"
            onClick={handlePublish}
            disabled={!title.trim() || !flowTemplateId}
            className={`px-4 py-2 rounded font-medium shadow-sm transition-all duration-200 ${
              !title.trim() || !flowTemplateId
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white hover:shadow-md'
            }`}
          >
            Publish
          </button>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id)
            const isLast = index === STEPS.length - 1
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setActiveStep(step.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-200 ${
                      status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : status === 'active'
                        ? 'bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/20'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </button>
                  <span className={`text-sm font-medium whitespace-nowrap ${
                    status === 'active'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                
                {!isLast && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-colors duration-200 ${
                    status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex gap-6">
        {/* Form Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
            {/* Basics Step */}
            {activeStep === 'basics' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Info</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="job-title-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="job-title-input"
                        data-testid="job-title-input"
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        placeholder="e.g., QA Engineer"
                        aria-required="true"
                        aria-invalid={titleError ? 'true' : 'false'}
                        aria-describedby={titleError ? 'title-error' : undefined}
                        className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                          titleError 
                            ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                      />
                      {titleError && (
                        <div id="title-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                          {titleError}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Department
                      </label>
                      <select
                        data-testid="department-select"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option>Engineering</option>
                        <option>Product</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                        <option>Operations</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Office
                      </label>
                      <select
                        data-testid="location-select"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option>San Francisco</option>
                        <option>New York</option>
                        <option>London</option>
                        <option>Remote</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Employment Type
                      </label>
                      <select
                        data-testid="type-select"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Number of Openings
                      </label>
                      <input
                        data-testid="openings-input"
                        type="number"
                        min="1"
                        value={openings}
                        onChange={(e) => setOpenings(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Experience Level
                      </label>
                      <select
                        data-testid="experience-select"
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option value="entry">Entry-level</option>
                        <option value="mid">Mid-level</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                        <option value="executive">Executive</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Hiring Flow Section */}
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Hiring Flow</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Select a flow template to define the interview stages for this job. You can customize it later.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Flow Template <span className="text-red-500">*</span>
                      </label>
                      <select
                        data-testid="flow-template-select"
                        value={flowTemplateId}
                        onChange={(e) => setFlowTemplateId(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option value="">Select a flow template...</option>
                        {flowTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.stages.length} stages)
                          </option>
                        ))}
                      </select>
                      
                      {flowTemplateId && (
                        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                                {flowTemplates.find(t => t.id === flowTemplateId)?.name}
                              </h4>
                              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                                {flowTemplates.find(t => t.id === flowTemplateId)?.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                                <span>
                                  {flowTemplates.find(t => t.id === flowTemplateId)?.stages.length} stages
                                </span>
                                <span>•</span>
                                <span>
                                  {flowTemplates.find(t => t.id === flowTemplateId)?.stages.filter(s => s.required).length} required
                                </span>
                              </div>
                              
                              {/* Stage Preview */}
                              <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
                                {flowTemplates.find(t => t.id === flowTemplateId)?.stages.slice(0, 5).map((stage, idx, arr) => (
                                  <React.Fragment key={stage.id}>
                                    <div className="flex-shrink-0 px-2 py-1 bg-white dark:bg-emerald-900/40 rounded text-xs text-emerald-900 dark:text-emerald-200 font-medium border border-emerald-200 dark:border-emerald-700">
                                      {stage.name}
                                    </div>
                                    {idx < arr.length - 1 && (
                                      <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    )}
                                  </React.Fragment>
                                ))}
                                {flowTemplates.find(t => t.id === flowTemplateId)?.stages.length > 5 && (
                                  <span className="flex-shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
                                    +{flowTemplates.find(t => t.id === flowTemplateId)?.stages.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!flowTemplateId && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            💡 <strong>Tip:</strong> Using a flow template helps standardize your hiring process and makes it easier to track candidate progress. You can always customize stages for specific candidates later.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Description Step */}
            {activeStep === 'description' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Description</h2>
                  <div className="mb-4 flex flex-wrap items-center gap-0.5 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => applyFormat('bold')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Bold (**text**)"
                      aria-label="Bold"
                    >
                      <span className="block w-5 h-5 text-center font-bold text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">B</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('italic')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Italic (*text*)"
                      aria-label="Italic"
                    >
                      <span className="block w-5 h-5 text-center italic font-serif text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">I</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('underline')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Underline (__text__)"
                      aria-label="Underline"
                    >
                      <span className="block w-5 h-5 text-center underline text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">U</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('strikethrough')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Strikethrough (~~text~~)"
                      aria-label="Strikethrough"
                    >
                      <span className="block w-5 h-5 text-center line-through text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">S</span>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertHeading()}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Heading (## text)"
                      aria-label="Heading"
                    >
                      <span className="block w-5 h-5 text-center font-bold text-lg leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">H</span>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertList('bullet')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Bullet list (• item)"
                      aria-label="Bullet list"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round"/>
                        <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round"/>
                        <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round"/>
                        <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
                        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList('numbered')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Numbered list (1. item)"
                      aria-label="Numbered list"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
                      </svg>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={insertLink}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Insert link ([text](url))"
                      aria-label="Insert link"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                  
                  <div>
                    <label htmlFor="job-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="job-description"
                      data-testid="description-textarea"
                      ref={descriptionRef}
                      value={description}
                      onChange={handleDescriptionChange}
                      onBlur={handleDescriptionBlur}
                      placeholder="Write a compelling job description...&#10;&#10;Example:&#10;We're looking for a talented QA Engineer to join our growing team.&#10;&#10;## Responsibilities&#10;• Design and implement test automation frameworks&#10;• Collaborate with development teams&#10;• Ensure product quality"
                      rows="10"
                      aria-required="true"
                      aria-invalid={descriptionError ? 'true' : 'false'}
                      aria-describedby={descriptionError ? 'description-error' : undefined}
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-shadow resize-none font-mono text-sm ${
                        descriptionError 
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                    />
                    {descriptionError && (
                      <div id="description-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                        {descriptionError}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Preview</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                      {description ? (
                        <div 
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(description) }}
                        />
                      ) : (
                        <div className="text-slate-400 italic">Your formatted description will appear here...</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Drop files here or click to upload
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      PDF, DOC, DOCX up to 10MB
                    </p>
                  </div>
                  
                  {/* Formatting Guide */}
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      Formatting Guide
                    </summary>
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">Text Formatting:</div>
                          <div className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                            <div>**bold text** → <strong>bold text</strong></div>
                            <div>*italic text* → <em>italic text</em></div>
                            <div>__underline__ → <u>underline</u></div>
                            <div>~~strike~~ → <s>strike</s></div>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">Lists & Links:</div>
                          <div className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                            <div>## Heading</div>
                            <div>• Bullet item</div>
                            <div>1. Numbered item</div>
                            <div>[text](url) → link</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
            
            {/* Requirements Step */}
            {activeStep === 'requirements' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Requirements</h2>
                  <div className="mb-4 flex flex-wrap items-center gap-0.5 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => applyFormatRequirements('bold')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Bold (**text**)"
                      aria-label="Bold"
                    >
                      <span className="block w-5 h-5 text-center font-bold text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">B</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormatRequirements('italic')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Italic (*text*)"
                      aria-label="Italic"
                    >
                      <span className="block w-5 h-5 text-center italic font-serif text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">I</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormatRequirements('underline')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Underline (__text__)"
                      aria-label="Underline"
                    >
                      <span className="block w-5 h-5 text-center underline text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">U</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormatRequirements('strikethrough')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Strikethrough (~~text~~)"
                      aria-label="Strikethrough"
                    >
                      <span className="block w-5 h-5 text-center line-through text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">S</span>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertHeadingRequirements()}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Heading (## text)"
                      aria-label="Heading"
                    >
                      <span className="block w-5 h-5 text-center font-bold text-lg leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">H</span>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertListRequirements('bullet')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Bullet list (• item)"
                      aria-label="Bullet list"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round"/>
                        <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round"/>
                        <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round"/>
                        <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
                        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertListRequirements('numbered')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Numbered list (1. item)"
                      aria-label="Numbered list"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
                      </svg>
                    </button>
                    
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={insertLinkRequirements}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
                      title="Insert link ([text](url))"
                      aria-label="Insert link"
                    >
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                  
                  <textarea
                    data-testid="requirements-textarea"
                    ref={requirementsRef}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Write the job requirements...&#10;&#10;Example:&#10;## Required Qualifications&#10;• Bachelor's degree in Computer Science or related field&#10;• 3+ years of experience in QA testing&#10;• Strong knowledge of testing frameworks"
                    rows="10"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none font-mono text-sm"
                  />
                  
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Preview</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                      {requirements ? (
                        <div 
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(requirements) }}
                        />
                      ) : (
                        <div className="text-slate-400 italic">Your formatted requirements will appear here...</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="$100,000 - $130,000"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  />
                </div>
              </div>
            )}
            
            {/* Compliance Step */}
            {activeStep === 'compliance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Compliance & Legal</h2>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Equal Opportunity Employer Statement</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Include EEO statement in job posting</div>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">GDPR Compliance</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Ensure data handling meets GDPR requirements</div>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Require Work Authorization</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Candidates must be authorized to work in the US</div>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Background Check Required</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Run background check on final candidates</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Distribution Step */}
            {activeStep === 'distribution' && (
              <div className="space-y-6">
                {/* Public Career Portal Section */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Public Career Portal</h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
                        Make this job publicly available on your career page. Candidates can apply directly and track their application status.
                      </p>
                      
                      <div className="space-y-4">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={existingJob?.publicPortal?.enabled || false}
                            className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                          />
                          <span className="font-medium text-slate-900 dark:text-slate-100">Enable Public Applications</span>
                        </label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                              Company Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., TechCorp Inc."
                              defaultValue={existingJob?.publicPortal?.companyName || ''}
                              className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                              Company Logo URL
                            </label>
                            <input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              defaultValue={existingJob?.publicPortal?.companyLogo || ''}
                              className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                            Company Description
                          </label>
                          <textarea
                            rows="3"
                            placeholder="Brief description of your company for job seekers..."
                            defaultValue={existingJob?.publicPortal?.companyDescription || ''}
                            className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                              Min Salary
                            </label>
                            <input
                              type="number"
                              placeholder="120000"
                              defaultValue={existingJob?.publicPortal?.salaryMin || ''}
                              className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                              Max Salary
                            </label>
                            <input
                              type="number"
                              placeholder="180000"
                              defaultValue={existingJob?.publicPortal?.salaryMax || ''}
                              className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 cursor-pointer w-full">
                              <input
                                type="checkbox"
                                defaultChecked={existingJob?.publicPortal?.salaryPublic || false}
                                className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                              />
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Show publicly</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700">
                          <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              Once published, candidates can apply at <span className="font-mono font-semibold">recruitiq.com/apply/{isEdit ? existingJob.id : '[job-id]'}</span> and track their application with a unique code.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Job Board Distribution</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select additional job boards and platforms to post this position</p>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Company Career Page</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">Free</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">LinkedIn</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">Premium</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Indeed</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">Glassdoor</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">ZipRecruiter</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t dark:border-slate-700">
              <button
                data-testid="previous-button"
                onClick={() => {
                  const currentIndex = STEPS.findIndex(s => s.id === activeStep)
                  if (currentIndex > 0) {
                    setActiveStep(STEPS[currentIndex - 1].id)
                  }
                }}
                disabled={activeStep === 'basics'}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                data-testid="next-button"
                onClick={() => {
                  const currentIndex = STEPS.findIndex(s => s.id === activeStep)
                  if (currentIndex < STEPS.length - 1) {
                    setActiveStep(STEPS[currentIndex + 1].id)
                  }
                }}
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
  )
}
