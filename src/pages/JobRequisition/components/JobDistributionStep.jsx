import React from 'react'

/**
 * JobDistributionStep - Fifth and final step of job requisition form
 * Handles public career portal settings and job board distribution
 * 
 * @param {Object} distributionData - Distribution settings (publicPortal, jobBoards)
 * @param {Function} onChange - Handler for distribution settings changes
 * @param {boolean} isEdit - Whether this is an edit or new job
 * @param {string} jobId - Job ID (for existing jobs)
 */
export default function JobDistributionStep({ 
  distributionData = {},
  onChange,
  isEdit = false,
  jobId = null
}) {
  const { publicPortal = {}, jobBoards = {} } = distributionData

  const handlePublicPortalChange = (field, value) => {
    onChange?.({
      ...distributionData,
      publicPortal: {
        ...publicPortal,
        [field]: value
      }
    })
  }

  const handleJobBoardChange = (board, checked) => {
    onChange?.({
      ...distributionData,
      jobBoards: {
        ...jobBoards,
        [board]: checked
      }
    })
  }

  return (
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
              {/* Enable Public Applications */}
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicPortal.enabled === true}
                  onChange={(e) => handlePublicPortalChange('enabled', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">Enable Public Applications</span>
              </label>
              
              {/* Company Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-name" className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                    Company Name
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    placeholder="e.g., TechCorp Inc."
                    value={publicPortal.companyName || ''}
                    onChange={(e) => handlePublicPortalChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="company-logo" className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                    Company Logo URL
                  </label>
                  <input
                    id="company-logo"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={publicPortal.companyLogo || ''}
                    onChange={(e) => handlePublicPortalChange('companyLogo', e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>
              
              {/* Company Description */}
              <div>
                <label htmlFor="company-description" className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                  Company Description
                </label>
                <textarea
                  id="company-description"
                  rows="3"
                  placeholder="Brief description of your company for job seekers..."
                  value={publicPortal.companyDescription || ''}
                  onChange={(e) => handlePublicPortalChange('companyDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>
              
              {/* Salary Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="salary-min" className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                    Min Salary
                  </label>
                  <input
                    id="salary-min"
                    type="number"
                    placeholder="120000"
                    value={publicPortal.salaryMin || ''}
                    onChange={(e) => handlePublicPortalChange('salaryMin', e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="salary-max" className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                    Max Salary
                  </label>
                  <input
                    id="salary-max"
                    type="number"
                    placeholder="180000"
                    value={publicPortal.salaryMax || ''}
                    onChange={(e) => handlePublicPortalChange('salaryMax', e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700 cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={publicPortal.salaryPublic === true}
                      onChange={(e) => handlePublicPortalChange('salaryPublic', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Show publicly</span>
                  </label>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Once published, candidates can apply at <span className="font-mono font-semibold">recruitiq.com/apply/{isEdit && jobId ? jobId : '[job-id]'}</span> and track their application with a unique code.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Job Board Distribution */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Job Board Distribution</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select additional job boards and platforms to post this position</p>
        
        <div className="space-y-3">
          {/* Career Page */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={jobBoards.careerPage !== false}
              onChange={(e) => handleJobBoardChange('careerPage', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Company Career Page</div>
            </div>
            <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">Free</span>
          </label>
          
          {/* LinkedIn */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={jobBoards.linkedin !== false}
              onChange={(e) => handleJobBoardChange('linkedin', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">LinkedIn</div>
            </div>
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">Premium</span>
          </label>
          
          {/* Indeed */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={jobBoards.indeed === true}
              onChange={(e) => handleJobBoardChange('indeed', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Indeed</div>
            </div>
            <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
          </label>
          
          {/* Glassdoor */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={jobBoards.glassdoor === true}
              onChange={(e) => handleJobBoardChange('glassdoor', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Glassdoor</div>
            </div>
            <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
          </label>
          
          {/* ZipRecruiter */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={jobBoards.ziprecruiter === true}
              onChange={(e) => handleJobBoardChange('ziprecruiter', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">ZipRecruiter</div>
            </div>
            <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">Pay per click</span>
          </label>
        </div>
      </div>
    </div>
  )
}
