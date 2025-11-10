import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import ConfirmationModal from '../components/ConfirmationModal'
import CandidateEditForm from '../components/CandidateEditForm'
import ApplicationSourceBadge from '../components/ApplicationSourceBadge'
import { useToast } from '../context/ToastContext'

const STAGE_COLORS = {
  'Applied': { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' },
  'Phone Screen': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-600' },
  'Interview': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-600' },
  'Offer': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-600' },
  'Hired': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-600' }
}

export default function CandidateDetail(){
  const { id } = useParams()
  const { jobs, candidates, loading, error, deleteCandidate } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  
  const c = candidates.find(x=> String(x.id) === id)
  
  // Show loading state
  if (loading.candidates || loading.jobs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading candidate details...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error.candidates) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Failed to load candidate</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{error.candidates}</div>
          </div>
          <Link
            to="/candidates"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Back to candidates
          </Link>
        </div>
      </div>
    )
  }

  if(!c) return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Candidate not found</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">The candidate you're looking for doesn't exist</div>
        </div>
        <Link
          to="/candidates"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          Back to candidates
        </Link>
      </div>
    </div>
  )
  
  const job = jobs.find(j=> j.id === c.jobId)
  // Candidates don't have a stage - that belongs to applications
  // Show a generic active status
  const candidateStatus = 'Active Candidate'
  const stageColor = { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-600' }
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'documents', label: 'Documents' },
    { id: 'compliance', label: 'Compliance' }
  ]
  
  async function doDelete(){
    await deleteCandidate(c.id, {toast})
    setConfirmOpen(false)
    navigate('/candidates')
  }

  return (
    <div>
      <Link to="/candidates" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors duration-200 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to candidates
      </Link>
      
      {/* Header with candidate info and status */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 mb-6">
        <div className="p-6 flex items-center justify-between gap-6 border-b dark:border-slate-700/50">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                {(c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'N/A').split(' ').map(n=>n[0]).slice(0,2).join('')}
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
            
            {/* Name and status */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}</h1>
              <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>{c.title}</span>
                {c.application_source && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <ApplicationSourceBadge source={c.application_source} />
                  </>
                )}
              </div>
            </div>
            
            {/* Status badge */}
            <span className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full ${stageColor.bg} ${stageColor.text} border ${stageColor.border}`}>
              {candidateStatus}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => setEditOpen(true)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200"
            >
              Edit
            </button>
            <button 
              onClick={() => setConfirmOpen(true)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6">
          <nav className="flex gap-8 -mb-px" role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">{c.email}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phone</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">{c.phone}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Location</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">{c.location}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Applied for</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">{job ? job.title : '—'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Experience</h2>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.experience}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                href={c.resume || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Resume
              </a>
              <button className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200">
                Add Note
              </button>
              <button 
                onClick={()=>setConfirmOpen(true)} 
                className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                Delete Candidate
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'activity' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100">Moved to {c.stage}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">2 days ago</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Stage updated by recruiter</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100">Application submitted</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">5 days ago</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Candidate applied for {job ? job.title : 'position'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Documents</h2>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">Resume.pdf</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Uploaded 5 days ago • 245 KB</div>
                  </div>
                </div>
                <a href={c.resume || '#'} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors">
                  View
                </a>
              </div>
              
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                No additional documents uploaded
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'compliance' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Compliance & Legal</h2>
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">US Work Authorization</span>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 ml-8">Verified and confirmed</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Background Check</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">Pending initiation</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Offer Letter</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">Not yet issued</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      <CandidateEditForm 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        candidate={c}
      />
      
      {/* Delete Confirmation */}
      <ConfirmationModal 
        open={confirmOpen} 
        title="Delete candidate" 
        message={`Delete ${c.name || 'this candidate'}? This action cannot be undone.`} 
        onConfirm={doDelete} 
        onCancel={()=>setConfirmOpen(false)} 
      />
    </div>
  )
}
