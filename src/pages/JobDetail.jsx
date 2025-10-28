import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PublishJobToggle from '../components/PublishJobToggle'
import PortalSettingsModal from '../components/PortalSettingsModal'

export default function JobDetail(){
  const { id } = useParams()
  const { jobs, candidates, loading, error, updateJob } = useData()
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  const job = jobs.find(j=> String(j.id) === id)
  
  const handleJobUpdate = (updatedJob) => {
    // Refresh job data after update
    if (updateJob && typeof updateJob === 'function') {
      updateJob(updatedJob.id, updatedJob)
    }
  }

  // Show loading state
  if (loading.jobs || loading.candidates) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading job details...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error.jobs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Failed to load job</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{error.jobs}</div>
          </div>
          <Link
            to="/jobs"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Back to jobs
          </Link>
        </div>
      </div>
    )
  }

  if(!job) return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Job not found</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">The job you're looking for doesn't exist</div>
        </div>
        <Link
          to="/jobs"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          Back to jobs
        </Link>
      </div>
    </div>
  )
  
  const isPublished = job.is_public === true || job.isPublic === true
  const jobCandidates = candidates.filter(c=> c.jobId === job.id)

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{job.title}</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <span>{job.location}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{job.employmentType || job.type}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{job.openings} {job.openings === 1 ? 'opening' : 'openings'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to={`/jobs/${job.id}/edit`} className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded shadow-sm hover:shadow transition-all duration-200 text-center">Edit</Link>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200">Post</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
            <h2 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">Description</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{job.description}</p>
          </div>

          {/* Public Portal Section - Using New Component */}
          <PublishJobToggle job={job} onUpdate={handleJobUpdate} />

          {/* Portal Settings Button */}
          {isPublished && (
            <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Configure Portal Settings</span>
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                Customize company info, salary visibility, and application fields
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">{/* rest of code */}
          <h2 className="font-semibold mb-3 text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Candidates</span>
            <span className="text-xs font-normal px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
              {jobCandidates.length}
            </span>
          </h2>
          <div className="space-y-2">
            {jobCandidates.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No candidates yet
              </div>
            )}
            {jobCandidates.map(c=> (
              <div key={c.id} className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 flex items-center justify-between transition-all duration-200">
                <Link to={`/candidates/${c.id}`} className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.stage}</div>
                </Link>
                <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded ml-2">{c.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portal Settings Modal */}
      <PortalSettingsModal
        job={job}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={handleJobUpdate}
      />
    </div>
  )
}
