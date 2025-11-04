import React, { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useFlow } from '../context/FlowContext'

export default function CandidateForm({open, onClose}){
  const { state, addCandidate } = useData()
  const { flowTemplates, ensureLoaded } = useFlow()
  
  // Ensure flow templates are loaded when component mounts
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobId, setJobId] = useState(state.jobs[0]?.id || '')
  const [nameError, setNameError] = useState('')
  const [touched, setTouched] = useState({ name: false })
  const nameRef = useRef(null)

  const toast = useToast()
  
  // Get the first stage from the selected job's flow template
  const getInitialStage = () => {
    const selectedJob = state.jobs.find(j => j.id === Number(jobId))
    if (!selectedJob?.flowTemplateId || !flowTemplates) {
      return 'Applied' // Fallback
    }
    
    try {
      const template = flowTemplates.find(t => t.id === selectedJob.flowTemplateId)
      
      if (template?.stages && template.stages.length > 0) {
        // Return the first stage name
        return template.stages[0].name
      }
    } catch (e) {
      console.error('Failed to load flow template for initial stage:', e)
    }
    
    return 'Applied' // Fallback
  }
  
  // Reset form when modal closes/opens
  useEffect(() => {
    if (!open) {
      setName('')
      setTitle('')
      setLocation('Remote')
      setJobId(state.jobs[0]?.id || '')
      setNameError('')
      setTouched({ name: false })
    }
  }, [open, state.jobs])

  const validateName = (value) => {
    if (!value.trim()) {
      return 'Candidate name is required'
    }
    return ''
  }

  const handleNameChange = (e) => {
    const value = e.target.value
    setName(value)
    if (touched.name) {
      setNameError(validateName(value))
    }
  }

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }))
    setNameError(validateName(name))
  }

  function submit(e){
    e.preventDefault()
    
    // Mark all as touched
    setTouched({ name: true })
    
    // Validate
    const nameValidationError = validateName(name)
    setNameError(nameValidationError)
    
    if (nameValidationError) {
      toast.show('Please fix the errors before submitting')
      
      // Scroll to and focus the first error field with animation
      if (nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        nameRef.current.classList.add('animate-shake')
        setTimeout(() => {
          nameRef.current?.classList.remove('animate-shake')
          nameRef.current?.focus()
        }, 400)
      }
      return
    }
    
    const initialStage = getInitialStage()
    const candidate = { 
      name, 
      title, 
      location, 
      jobId: Number(jobId), 
      stage: initialStage, 
      experience: '', 
      resume: '' 
    }
    addCandidate(candidate).then(()=>{
      toast.show('Candidate added')
      onClose()
    }).catch(err=>{
      console.error(err)
      toast.show('Failed to add candidate on server')
    })
  }

  return (
    <Modal open={open} title="Add candidate" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="candidate-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input 
            id="candidate-name"
            ref={nameRef}
            type="text"
            value={name} 
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="Full name" 
            aria-required="true"
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'name-error' : undefined}
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              nameError 
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          />
          {nameError && (
            <div id="name-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
              {nameError}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="candidate-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Current Title
          </label>
          <input 
            id="candidate-title"
            type="text"
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
            placeholder="Current title" 
            className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="candidate-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <input 
              id="candidate-location"
              type="text"
              value={location} 
              onChange={e=>setLocation(e.target.value)} 
              placeholder="Location"
              className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
            />
          </div>
          <div>
            <label htmlFor="candidate-job" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Job
            </label>
            <select 
              id="candidate-job"
              value={jobId} 
              onChange={e=>setJobId(e.target.value)} 
              className="w-full border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            >
              {state.jobs.map(j=> <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-emerald-500 text-white rounded">Add</button>
        </div>
      </form>
    </Modal>
  )
}
