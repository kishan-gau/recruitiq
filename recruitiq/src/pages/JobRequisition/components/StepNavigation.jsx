import React from 'react'

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'description', label: 'Description' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'distribution', label: 'Distribution' }
]

export default function StepNavigation({ activeStep, onStepChange, errors = {} }) {
  const getStepStatus = (stepId) => {
    if (activeStep === stepId) return 'active'
    
    const stepIndex = STEPS.findIndex(s => s.id === stepId)
    const activeIndex = STEPS.findIndex(s => s.id === activeStep)
    
    if (stepIndex < activeIndex) {
      // Check if this step has errors
      const hasStepError = checkStepErrors(stepId, errors)
      return hasStepError ? 'error' : 'completed'
    }
    
    return 'pending'
  }

  const checkStepErrors = (stepId, errors) => {
    switch (stepId) {
      case 'basics':
        return !!errors.title
      case 'description':
        return !!errors.description
      case 'distribution':
        return !!errors.flowTemplate
      default:
        return false
    }
  }

  const getStepClasses = (status) => {
    const base = 'flex items-center gap-3 cursor-pointer transition-all duration-200'
    
    switch (status) {
      case 'active':
        return `${base} text-emerald-600 dark:text-emerald-400 font-semibold`
      case 'completed':
        return `${base} text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400`
      case 'error':
        return `${base} text-red-600 dark:text-red-400`
      default:
        return `${base} text-slate-400 dark:text-slate-500`
    }
  }

  const getStepIndicatorClasses = (status) => {
    const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200'
    
    switch (status) {
      case 'active':
        return `${base} bg-emerald-500 text-white shadow-lg shadow-emerald-500/50`
      case 'completed':
        return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400`
      case 'error':
        return `${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`
      default:
        return `${base} bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500`
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">
        Job Creation Steps
      </h3>
      <nav className="space-y-2">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.id)
          
          return (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={`${getStepClasses(status)} w-full text-left`}
              type="button"
            >
              <span className={getStepIndicatorClasses(status)}>
                {status === 'completed' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : status === 'error' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span>{step.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export { STEPS }
