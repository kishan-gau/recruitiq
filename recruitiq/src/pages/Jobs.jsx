import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { usePagination } from '../hooks/usePagination'
import { useDebounce } from '../hooks/useDebounce'
import { useSearchFilters } from '../hooks/useSearchFilters'
import Pagination from '../components/Pagination'
import SearchInput from '../components/SearchInput'
import FilterChips from '../components/FilterChips'

export default function Jobs(){
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
    status: '',
    location: '',
    type: ''
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
  
  // Fetch jobs with pagination and filters
  const { jobs, total, isLoading, error, refetch } = useJobs({ 
    page, 
    pageSize,
    ...queryParams
  })
  
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
  
  // Show loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Jobs</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading jobs...</div>
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
            <h1 className="text-2xl font-bold">Jobs</h1>
            <div className="text-sm text-red-500 dark:text-red-400">Error loading jobs</div>
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
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Failed to load jobs</div>
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
  
  // Calculate totals
  const totalOpenings = jobs.reduce((s, j) => s + (j.openings || 0), 0)
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {total} {total === 1 ? 'position' : 'positions'}
            {activeFilters.length > 0 && ' matching filters'}
          </div>
        </div>
        <Link 
          to="/jobs/new" 
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          Post a job
        </Link>
      </div>
      
      {/* Search and Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, location, or type..."
            isSearching={isLoading && debouncedSearch !== ''}
            className="flex-1"
          />
          
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilter('type', e.target.value)}
            className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        
        <FilterChips
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAll}
        />
      </div>

      <div className="grid gap-3">
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-semibold mb-1">No jobs posted yet</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">Get started by posting your first job opening</div>
            <Link 
              to="/jobs/new"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Post a job
            </Link>
          </div>
        )}
        {jobs.map(j=> (
          <Link 
            key={j.id} 
            to={`/jobs/${j.id}`} 
            className="group p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-700/50 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 flex flex-col md:flex-row md:justify-between md:items-center transition-all duration-200"
          >
            <div className="flex-1">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{j.title}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{j.location}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>{j.employmentType || j.type}</span>
              </div>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{j.openings || 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{(j.openings || 0) === 1 ? 'opening' : 'openings'}</div>
              </div>
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                View details
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Pagination */}
      {jobs.length > 0 && (
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
    </div>
  )
}


