import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCandidates } from '../hooks/useCandidates'
import { useJobs } from '../hooks/useJobs'
import { useWorkspace } from '../context/WorkspaceContext'
import { useFlow } from '../context/FlowContext'
import { usePagination } from '../hooks/usePagination'
import { useDebounce } from '../hooks/useDebounce'
import { useSearchFilters } from '../hooks/useSearchFilters'
import CandidateForm from '../components/CandidateForm'
import Pagination from '../components/Pagination'
import SearchInput from '../components/SearchInput'
import FilterChips from '../components/FilterChips'
import ApplicationSourceBadge from '../components/ApplicationSourceBadge'
import { Icon } from '../components/icons'

// Helper function to get all stages from all flow templates used by jobs
function getAllStagesFromTemplates(jobs, flowTemplates) {
  if (!flowTemplates || flowTemplates.length === 0) return []
  
  try {
    // Get all unique template IDs from jobs
    const templateIds = new Set(jobs.map(j => j.flowTemplateId).filter(Boolean))
    
    // Collect all stages from these templates
    const stageMap = new Map() // name -> {name, type, order}
    
    templateIds.forEach(templateId => {
      const template = flowTemplates.find(t => t.id === templateId)
      if (template && template.stages) {
        template.stages.forEach((stage, index) => {
          if (!stageMap.has(stage.name)) {
            stageMap.set(stage.name, {
              name: stage.name,
              type: stage.type || 'screening',
              order: index
            })
          }
        })
      }
    })
    
    // Convert to array and sort by order
    return Array.from(stageMap.values()).sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error('Error loading flow templates:', error)
    return []
  }
}

// Helper function to get stage color based on type
function getStageColor(stageType) {
  const colorMap = {
    'screening': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    'interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'assessment': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'offer': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'default': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  }
  return colorMap[stageType] || colorMap['default']
}

export default function Candidates(){
  const { currentWorkspaceId } = useWorkspace()
  const { flowTemplates, ensureLoaded } = useFlow()
  
  // Ensure flow templates are loaded when component mounts
  React.useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  const [open, setOpen] = useState(false)
  
  // Search and filter state
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  
  const { 
    filters, 
    setFilter, 
    removeFilter, 
    clearFilters,
    activeFilters,
    queryParams 
  } = useSearchFilters({
    search: '',
    stage: '',
    jobId: ''
  })
  
  // Update search filter when debounced value changes
  React.useEffect(() => {
    setFilter('search', debouncedSearch)
  }, [debouncedSearch, setFilter])
  
  // Pagination state
  const { page, pageSize, setPage, setPageSize, getTotalPages, resetPage } = usePagination(1, 25)
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    resetPage()
  }, [queryParams, resetPage])
  
  // Fetch jobs (no pagination needed for filter dropdown)
  const { jobs, isLoading: jobsLoading } = useJobs()
  
  // Fetch candidates with pagination and filters
  const { 
    candidates, 
    total,
    isLoading: candidatesLoading, 
    error, 
    refetch, 
    moveCandidate 
  } = useCandidates({ 
    page, 
    pageSize,
    ...queryParams
  })
  
  const isLoading = jobsLoading || candidatesLoading
  const totalPages = getTotalPages(total)
  
  // Handle filter removal
  const handleRemoveFilter = (key) => {
    if (key === 'search') {
      setSearchInput('')
    }
    removeFilter(key)
  }
  
  // Handle clear all filters
  const handleClearAll = () => {
    setSearchInput('')
    clearFilters()
  }

  // Dynamically load stages from flow templates
  const stages = useMemo(() => {
    return getAllStagesFromTemplates(jobs, flowTemplates).map(s => s.name)
  }, [jobs, flowTemplates])

  const stageData = useMemo(() => {
    return getAllStagesFromTemplates(jobs, flowTemplates)
  }, [jobs, flowTemplates])

  // Note: With server-side pagination/filtering, we use candidates directly (already filtered by API)
  // Client-side filtering is only for display purposes if needed
  const filtered = candidates

  function moveStage(id, dir){
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) return
    
    const idx = stages.indexOf(candidate.stage)
    const nidx = Math.max(0, Math.min(stages.length-1, idx + dir))
    const newStage = stages[nidx]
    
    if (newStage && newStage !== candidate.stage) {
      // Use the API's moveCandidate method
      moveCandidate(id, newStage, { showUndo: false })
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Candidates</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading candidates...</div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state with retry
  if (error) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Candidates</h1>
            <div className="text-sm text-red-500 dark:text-red-400">Error loading candidates</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Failed to load candidates</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{error}</div>
            </div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {total} {total === 1 ? 'person' : 'people'} in your pipeline
            {activeFilters.length > 0 && ' matching filters'}
          </div>
        </div>
        <button 
          onClick={()=>setOpen(true)} 
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          Add candidate
        </button>
      </div>
      
      {/* Search and Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, title, or location..."
            isSearching={isLoading && debouncedSearch !== ''}
            className="flex-1"
          />
          
          {stages.length > 0 && (
            <select
              value={filters.stage}
              onChange={(e) => setFilter('stage', e.target.value)}
              className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All stages</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          )}
          
          {jobs.length > 0 && (
            <select
              value={filters.jobId}
              onChange={(e) => setFilter('jobId', e.target.value)}
              className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          )}
        </div>
        
        <FilterChips
          filters={activeFilters.map(f => {
            // Customize labels for better display
            if (f.key === 'jobId') {
              const job = jobs.find(j => j.id === f.value)
              return { ...f, label: 'Job', value: job?.title || f.value }
            }
            return f
          })}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAll}
        />
      </div>

      <div className="grid gap-3">
        {candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-semibold mb-1">
              {activeFilters.length > 0 ? 'No candidates match your filters' : 'No candidates yet'}
            </div>
            {activeFilters.length === 0 && (
              <>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Start building your talent pipeline by adding candidates
                </div>
                <button 
                  onClick={()=>setOpen(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Add candidate
                </button>
              </>
            )}
          </div>
        )}
        {candidates.map(c=> (
          <div 
            key={c.id} 
            className="group p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-700/50 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between transition-all duration-200"
          >
            <Link to={`/candidates/${c.id}`} className="flex items-center gap-4 flex-1 min-w-0 group-hover:opacity-90 transition-opacity">
              <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                {(c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'N/A').split(' ').map(n=>n[0]).slice(0,2).join('')}
                <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                  <span>{c.currentJobTitle || 'No title'}</span>
                  {c.currentCompany && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">@</span>
                      <span className="truncate">{c.currentCompany}</span>
                    </>
                  )}
                  {c.location && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{c.location}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Application Source Badge */}
              {c.application_source && (
                <ApplicationSourceBadge source={c.application_source} />
              )}
              
              {/* Status Badge - Show recent application stage if available, otherwise active status */}
              {c.recentApplication?.stage ? (
                <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  c.recentApplication.stage === 'hired' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                  c.recentApplication.stage === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  c.recentApplication.stage === 'withdrawn' ? 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300' :
                  c.recentApplication.stage === 'offer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                  c.recentApplication.stage === 'interview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  c.recentApplication.stage === 'assessment' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                  c.recentApplication.stage === 'phone_screen' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' :
                  c.recentApplication.stage === 'screening' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                }`}>
                  {c.recentApplication.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  Active
                </div>
              )}
              
              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <Link
                  to={`/candidates/${c.id}`}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="View details"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
                <button 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="More actions"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showPageSize={true}
          />
        </div>
      )}
      
      <CandidateForm open={open} onClose={()=>setOpen(false)} />
    </div>
  )
}

