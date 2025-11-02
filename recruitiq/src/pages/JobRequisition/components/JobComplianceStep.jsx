import React from 'react'

/**
 * JobComplianceStep - Fourth step of job requisition form
 * Handles compliance and legal requirements
 * 
 * @param {Object} complianceData - Compliance checkbox states
 * @param {Function} onChange - Handler for compliance checkbox changes
 */
export default function JobComplianceStep({ 
  complianceData = {},
  onChange
}) {
  const handleCheckboxChange = (field, checked) => {
    onChange?.({
      ...complianceData,
      [field]: checked
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Compliance & Legal</h2>
        <div className="space-y-4">
          {/* EEO Statement */}
          <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={complianceData.eeoStatement !== false}
              onChange={(e) => handleCheckboxChange('eeoStatement', e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Equal Opportunity Employer Statement</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Include EEO statement in job posting</div>
            </div>
          </label>
          
          {/* GDPR Compliance */}
          <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={complianceData.gdprCompliance !== false}
              onChange={(e) => handleCheckboxChange('gdprCompliance', e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">GDPR Compliance</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Ensure data handling meets GDPR requirements</div>
            </div>
          </label>
          
          {/* Work Authorization */}
          <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={complianceData.workAuthorization === true}
              onChange={(e) => handleCheckboxChange('workAuthorization', e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Require Work Authorization</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Candidates must be authorized to work in the US</div>
            </div>
          </label>
          
          {/* Background Check */}
          <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={complianceData.backgroundCheck === true}
              onChange={(e) => handleCheckboxChange('backgroundCheck', e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">Background Check Required</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Run background check on final candidates</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
