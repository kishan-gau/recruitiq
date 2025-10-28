import React from 'react'

/**
 * JobBasicsStep - First step of job requisition form
 * Handles basic job information input
 * 
 * @param {Object} formData - Form data object containing all field values
 * @param {Object} errors - Validation errors object
 * @param {Object} touched - Touched fields tracking object
 * @param {Function} onFieldChange - Handler for field value changes
 * @param {Function} onFieldBlur - Handler for field blur events
 * @param {Object} titleRef - React ref for title input (for focus management)
 * @param {Array} flowTemplates - Available flow templates
 */
export default function JobBasicsStep({ 
  formData = {}, 
  errors = {}, 
  touched = {},
  onFieldChange, 
  onFieldBlur, 
  titleRef,
  flowTemplates = []
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Info</h2>
        
        {/* Job Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="job-title-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="job-title-input"
              ref={titleRef}
              type="text"
              value={formData.title || ''}
              onChange={(e) => onFieldChange('title', e.target.value)}
              onBlur={() => onFieldBlur('title')}
              placeholder="e.g., QA Engineer"
              aria-required="true"
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                errors.title && touched.title
                  ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
              }`}
            />
            {errors.title && touched.title && (
              <div id="title-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                {errors.title}
              </div>
            )}
          </div>
          
          {/* Department */}
          <div>
            <label htmlFor="department-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Department
            </label>
            <select
              id="department-select"
              value={formData.department || 'Engineering'}
              onChange={(e) => onFieldChange('department', e.target.value)}
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
        
        {/* Location and Employment Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="location-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Office
            </label>
            <select
              id="location-select"
              value={formData.location || 'San Francisco'}
              onChange={(e) => onFieldChange('location', e.target.value)}
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
            <label htmlFor="type-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employment Type
            </label>
            <select
              id="employment-type-select"
              value={formData.type || 'full-time'}
              onChange={(e) => onFieldChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
        </div>
        
        {/* Number of Openings and Experience Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="openings-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Number of Openings
            </label>
            <input
              id="openings-input"
              type="number"
              min="1"
              value={formData.openings || 1}
              onChange={(e) => onFieldChange('openings', parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            />
          </div>
          
          <div>
            <label htmlFor="experience-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Experience Level
            </label>
            <select
              id="experience-level-select"
              value={formData.experienceLevel || 'mid'}
              onChange={(e) => onFieldChange('experienceLevel', e.target.value)}
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
            <label htmlFor="flow-template-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Flow Template <span className="text-red-500">*</span>
            </label>
            <select
              id="flow-template-select"
              value={formData.flowTemplateId || ''}
              onChange={(e) => onFieldChange('flowTemplateId', e.target.value)}
              onBlur={() => onFieldBlur('flowTemplateId')}
              required
              aria-required="true"
              aria-invalid={errors.flowTemplateId ? 'true' : 'false'}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                errors.flowTemplateId && touched.flowTemplateId
                  ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
              }`}
            >
              <option value="">Select a flow template...</option>
              {flowTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.stages?.length || 0} stages)
                </option>
              ))}
            </select>
            
            {errors.flowTemplateId && touched.flowTemplateId && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
                {errors.flowTemplateId}
              </div>
            )}
            
            {/* Flow Template Preview */}
            {formData.flowTemplateId && flowTemplates.length > 0 && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    {(() => {
                      const selectedTemplate = flowTemplates.find(t => t.id === formData.flowTemplateId)
                      if (!selectedTemplate) return null
                      
                      return (
                        <>
                          <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                            {selectedTemplate.name}
                          </h4>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                            {selectedTemplate.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <span>{selectedTemplate.stages?.length || 0} stages</span>
                            <span>•</span>
                            <span>{selectedTemplate.stages?.filter(s => s.required).length || 0} required</span>
                          </div>
                          
                          {/* Stage Preview */}
                          {selectedTemplate.stages && selectedTemplate.stages.length > 0 && (
                            <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
                              {selectedTemplate.stages.slice(0, 5).map((stage, idx, arr) => (
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
                              {selectedTemplate.stages.length > 5 && (
                                <span className="flex-shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
                                  +{selectedTemplate.stages.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {/* No Template Selected Tip */}
            {!formData.flowTemplateId && (
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
  )
}
