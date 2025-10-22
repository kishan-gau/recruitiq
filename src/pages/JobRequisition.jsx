import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

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
  const { state, addJob, updateJob } = useData()
  const toast = useToast()
  
  const isEdit = !!id
  const existingJob = isEdit ? state.jobs.find(j => String(j.id) === id) : null
  
  const [activeStep, setActiveStep] = useState('basics')
  const [isDraft, setIsDraft] = useState(true)
  
  // Form data
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [location, setLocation] = useState('San Francisco')
  const [type, setType] = useState('Full-time')
  const [openings, setOpenings] = useState(1)
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('Mid-level')
  const [salary, setSalary] = useState('')
  
  // Ref for description textarea
  const descriptionRef = React.useRef(null)
  
  // Load existing job data
  useEffect(() => {
    if (existingJob) {
      setTitle(existingJob.title || '')
      setDepartment(existingJob.department || 'Engineering')
      setLocation(existingJob.location || 'San Francisco')
      setType(existingJob.type || 'Full-time')
      setOpenings(existingJob.openings || 1)
      setDescription(existingJob.description || '')
      setRequirements(existingJob.requirements || '')
      setExperienceLevel(existingJob.experienceLevel || 'Mid-level')
      setSalary(existingJob.salary || '')
      setIsDraft(existingJob.status === 'draft')
    }
  }, [existingJob])
  
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.show('Please enter a job title')
      return
    }
    
    const jobData = {
      title,
      department,
      location,
      type,
      openings: Number(openings),
      description,
      requirements,
      experienceLevel,
      salary,
      status: 'draft'
    }
    
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
      console.error(err)
      toast.show('Failed to save draft')
    }
  }
  
  const handlePublish = async () => {
    if (!title.trim()) {
      toast.show('Please enter a job title')
      setActiveStep('basics')
      return
    }
    
    const jobData = {
      title,
      department,
      location,
      type,
      openings: Number(openings),
      description,
      requirements,
      experienceLevel,
      salary,
      status: 'published'
    }
    
    try {
      if (isEdit) {
        await updateJob(existingJob.id, jobData)
        toast.show('Job published')
        navigate(`/jobs/${existingJob.id}`)
      } else {
        const newJob = await addJob(jobData)
        toast.show('Job published')
        navigate(`/jobs/${newJob.id}`)
      }
    } catch (err) {
      console.error(err)
      toast.show('Failed to publish job')
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
    ? state.candidates.filter(c => c.jobId === existingJob.id)
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
  
  // Text formatting functions
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
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200"
          >
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="QA Engineer"
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Department
                      </label>
                      <select
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
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Internship</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Number of Openings
                      </label>
                      <input
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
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      >
                        <option>Entry-level</option>
                        <option>Mid-level</option>
                        <option>Senior</option>
                        <option>Lead</option>
                        <option>Principal</option>
                      </select>
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
                  <div className="mb-4 flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded">
                    <button 
                      type="button" 
                      onClick={() => applyFormat('bold')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Bold (**text**)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4v12h4.5c2.5 0 4.5-1.5 4.5-4 0-1.5-.8-2.8-2-3.5.7-.7 1-1.6 1-2.5 0-2-1.5-3-3.5-3H6zm2.5 2h2c1 0 1.5.5 1.5 1.5S11.5 9 10.5 9h-2V6zm0 5h2.5c1.3 0 2 .7 2 2s-.7 2-2 2H8.5v-4z"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('italic')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Italic (*text*)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4v2h1.5l-2 8H7v2h6v-2h-1.5l2-8H15V4H9z"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('underline')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Underline (__text__)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 15c-2.8 0-5-2.2-5-5V4h2v6c0 1.7 1.3 3 3 3s3-1.3 3-3V4h2v6c0 2.8-2.2 5-5 5zM5 17h10v1H5v-1z"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyFormat('strikethrough')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Strikethrough (~~text~~)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12M6 12c0 1.657 1.343 3 3 3h6c1.657 0 3-1.343 3-3M6 12c0-1.657 1.343-3 3-3h6c1.657 0 3 1.343 3 3" />
                      </svg>
                    </button>
                    
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertHeading()}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Heading (## text)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-6 4h6" />
                      </svg>
                    </button>
                    
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={() => insertList('bullet')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Bullet list (• item)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 7h2v2H3V7zm0 4h2v2H3v-2zM7 7h10v2H7V7zm0 4h10v2H7v-2z"/>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList('numbered')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Numbered list (1. item)"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 5h1v2H4v1h2V6h1v3H3V5h1zm0 6h1.8L4 13.1v.9h3v-1H5.2L7 10.9V10H4v1zm1 4H4v1h2v.5H5v1h1v.5H4v1h3v-4H5v1zM9 7h8v2H9V7zm0 4h8v2H9v-2z"/>
                      </svg>
                    </button>
                    
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    
                    <button 
                      type="button" 
                      onClick={insertLink}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Insert link ([text](url))"
                    >
                      <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                  
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a compelling job description...&#10;&#10;Example:&#10;We're looking for a talented QA Engineer to join our growing team.&#10;&#10;## Responsibilities&#10;• Design and implement test automation frameworks&#10;• Collaborate with development teams&#10;• Ensure product quality"
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
                      {description ? (
                        <div className="whitespace-pre-wrap">{description}</div>
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
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="• Bachelor's degree in Computer Science or related field&#10;• 3+ years of experience in QA testing&#10;• Strong knowledge of testing frameworks..."
                    rows="12"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
                  />
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
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Job Distribution</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select job boards and platforms to post this position</p>
                  
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
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
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
