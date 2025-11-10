import { useState, useEffect } from 'react'
import { validateTitle, validateDescription, validateRequirements, validateFlowTemplate, validateJobForm } from '../utils/validation'

/**
 * Custom hook for managing job requisition form state
 */
export function useJobForm(existingJob = null) {
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    department: 'Engineering',
    location: 'San Francisco',
    type: 'full-time',
    openings: 1,
    description: '',
    requirements: '',
    experienceLevel: 'mid',
    salary: '',
    flowTemplateId: ''
  })

  // Validation state
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Load existing job data
  useEffect(() => {
    if (existingJob) {
      setFormData({
        title: existingJob.title || '',
        department: existingJob.department || 'Engineering',
        location: existingJob.location || 'San Francisco',
        type: existingJob.employmentType || existingJob.type || 'full-time',
        openings: existingJob.openings || 1,
        description: existingJob.description || '',
        requirements: existingJob.requirements || '',
        experienceLevel: existingJob.experienceLevel || 'mid',
        salary: existingJob.salary || '',
        flowTemplateId: existingJob.flowTemplateId || ''
      })
    }
  }, [existingJob])

  // Update single field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Validate on change if field has been touched
    if (touched[field]) {
      validateField(field, value)
    }
  }

  // Update multiple fields at once
  const updateFields = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Validate single field
  const validateField = (field, value) => {
    let error = ''
    
    switch (field) {
      case 'title':
        error = validateTitle(value)
        break
      case 'description':
        error = validateDescription(value)
        break
      case 'requirements':
        error = validateRequirements(value)
        break
      case 'flowTemplateId':
        error = validateFlowTemplate(value)
        break
      default:
        break
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
    
    return error
  }

  // Mark field as touched
  const touchField = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, formData[field])
  }

  // Mark all fields as touched
  const touchAllFields = () => {
    const allTouched = {
      title: true,
      description: true,
      requirements: true,
      flowTemplateId: true
    }
    setTouched(allTouched)
  }

  // Validate entire form
  const validateForm = () => {
    touchAllFields()
    const validationErrors = validateJobForm(formData)
    setErrors(validationErrors)
    return validationErrors
  }

  // Check if form is valid
  const isValid = () => {
    return Object.keys(errors).length === 0
  }

  // Reset form to initial or provided state
  const resetForm = (initialData = null) => {
    if (initialData) {
      // Ensure all fields have default values (prevent undefined)
      setFormData({
        title: initialData.title || '',
        department: initialData.department || 'Engineering',
        location: initialData.location || 'San Francisco',
        type: initialData.employmentType || initialData.type || 'full-time',
        openings: initialData.openings || 1,
        description: initialData.description || '',
        requirements: initialData.requirements || '',
        experienceLevel: initialData.experienceLevel || 'mid',
        salary: initialData.salary || '',
        flowTemplateId: initialData.flowTemplateId || ''
      })
    } else {
      setFormData({
        title: '',
        department: 'Engineering',
        location: 'San Francisco',
        type: 'full-time',
        openings: 1,
        description: '',
        requirements: '',
        experienceLevel: 'mid',
        salary: '',
        flowTemplateId: ''
      })
    }
    setErrors({})
    setTouched({})
  }

  // Get job data formatted for API
  const getJobData = () => {
    const jobData = {
      title: formData.title,
      department: formData.department,
      location: formData.location,
      employment_type: formData.type, // Backend DB uses snake_case
      openings: formData.openings,
      description: formData.description,
      requirements: formData.requirements,
      experience_level: formData.experienceLevel, // Backend DB uses snake_case
      salary: formData.salary,
      flowTemplateId: formData.flowTemplateId
    }
    console.log('[useJobForm] getJobData - formData.type:', formData.type)
    console.log('[useJobForm] getJobData - jobData.employment_type:', jobData.employment_type)
    console.log('[useJobForm] getJobData - full jobData:', jobData)
    return jobData
  }

  return {
    formData,
    errors,
    touched,
    updateField,
    updateFields,
    validateField,
    touchField,
    touchAllFields,
    validateForm,
    isValid,
    resetForm,
    getJobData
  }
}
