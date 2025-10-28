/**
 * Job Requisition Form Validation Utilities
 */

export const validateTitle = (value) => {
  if (!value || !value.trim()) {
    return 'Job title is required'
  }
  if (value.trim().length < 3) {
    return 'Job title must be at least 3 characters'
  }
  return ''
}

export const validateDescription = (value) => {
  if (!value || !value.trim()) {
    return 'Job description is required'
  }
  if (value.trim().length < 20) {
    return 'Job description must be at least 20 characters'
  }
  return ''
}

export const validateFlowTemplate = (flowTemplateId) => {
  if (!flowTemplateId) {
    return 'Please select a flow template'
  }
  return ''
}

export const validateRequirements = (value) => {
  // Requirements are optional but if provided should meet minimum length
  if (value && value.trim().length > 0 && value.trim().length < 10) {
    return 'Requirements must be at least 10 characters if provided'
  }
  return ''
}

/**
 * Validate entire form and return all errors
 */
export const validateJobForm = (formData) => {
  const errors = {}
  
  const titleError = validateTitle(formData.title)
  if (titleError) errors.title = titleError
  
  const descriptionError = validateDescription(formData.description)
  if (descriptionError) errors.description = descriptionError
  
  const flowTemplateError = validateFlowTemplate(formData.flowTemplateId)
  if (flowTemplateError) errors.flowTemplateId = flowTemplateError
  
  const requirementsError = validateRequirements(formData.requirements)
  if (requirementsError) errors.requirements = requirementsError
  
  return errors
}

/**
 * Check if form has any validation errors
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0
}
