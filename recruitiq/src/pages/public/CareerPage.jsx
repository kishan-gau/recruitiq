import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import PublicLayout from '../../components/PublicLayout'
import { Icon } from '../../components/icons'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function CareerPage() {
  const { organizationId } = useParams()
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  useEffect(() => {
    loadPublicJobs()
  }, [organizationId])

  const loadPublicJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE}/public/careers/${organizationId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Organization not found')
        } else {
          throw new Error('Failed to load jobs')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setJobs(data.jobs || [])
      setFilteredJobs(data.jobs || [])
      setCompanyInfo(data.organization || null)
    } catch (err) {
      console.error('Error loading jobs:', err)
      setError('Failed to load job listings. Please try again.')
      toast?.showToast?.('Failed to load jobs', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...jobs]

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        job =>
          job.title.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.department?.toLowerCase().includes(query)
      )
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(job => job.department === selectedDepartment)
    }

    // Location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(job => job.location === selectedLocation)
    }

    // Employment type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(job => job.employment_type === selectedType)
    }

    setFilteredJobs(filtered)
  }, [searchQuery, selectedDepartment, selectedLocation, selectedType, jobs])

  // Get unique values for filters
  const departments = ['all', ...new Set(jobs.map(j => j.department).filter(Boolean))]
  const locations = ['all', ...new Set(jobs.map(j => j.location).filter(Boolean))]
  const types = ['all', ...new Set(jobs.map(j => j.employment_type).filter(Boolean))]

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Format salary
  const formatSalary = (min, max, currency = 'USD') => {
    if (!min || !max) return null
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    })
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading careers...</p>
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="x" className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {error}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Unable to load career opportunities at this time.
            </p>
            <button
              onClick={loadPublicJobs}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {companyInfo?.name ? `Join ${companyInfo.name}` : 'Join Our Team'}
              </h1>
              <p className="text-xl text-emerald-50 max-w-2xl mx-auto">
                Explore opportunities to grow your career and make an impact
              </p>
              <p className="mt-6 text-emerald-100">
                <span className="font-semibold">{jobs.length}</span> open position{jobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title, department, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc === 'all' ? 'All Locations' : loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Job Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {types.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filters summary */}
            {(searchQuery || selectedDepartment !== 'all' || selectedLocation !== 'all' || selectedType !== 'all') && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400">Active filters:</span>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedDepartment('all')
                    setSelectedLocation('all')
                    setSelectedType('all')
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredJobs.length}</span> job{filteredJobs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Job Listings */}
          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="briefcase" className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No jobs found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchQuery || selectedDepartment !== 'all' || selectedLocation !== 'all' || selectedType !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Check back soon for new opportunities'}
              </p>
              {(searchQuery || selectedDepartment !== 'all' || selectedLocation !== 'all' || selectedType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedDepartment('all')
                    setSelectedLocation('all')
                    setSelectedType('all')
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        {job.title}
                      </h3>
                      
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <Icon name="briefcase" className="w-4 h-4" />
                            {job.department}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <Icon name="map-pin" className="w-4 h-4" />
                            {job.location}
                          </span>
                        )}
                        {job.employment_type && (
                          <span className="flex items-center gap-1">
                            <Icon name="clock" className="w-4 h-4" />
                            {job.employment_type}
                          </span>
                        )}
                        {job.salary_min && job.salary_max && job.public_portal_settings?.salaryPublic && (
                          <span className="flex items-center gap-1">
                            <Icon name="dollar-sign" className="w-4 h-4" />
                            {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 dark:text-slate-500">
                        Posted {formatDate(job.posted_at)}
                      </span>
                    </div>
                  </div>

                  {/* Description preview */}
                  {job.description && (
                    <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-500">
                      <Icon name="users" className="w-4 h-4" />
                      <span>{job.application_count || 0} applicants</span>
                    </div>
                    
                    <Link
                      to={`/apply/${job.public_slug || job.id}`}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
