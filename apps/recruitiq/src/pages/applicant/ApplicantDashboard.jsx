import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import PublicLayout from '../../components/PublicLayout'
import { Icon } from '../../components/icons'

export default function ApplicantDashboard() {
  const { user } = useAuth()
  const { state } = useData()
  const [myApplications, setMyApplications] = useState([])

  useEffect(() => {
    // Get applications for this applicant
    const applications = state.candidates.filter(c => c.applicantId === user.applicantId)
    setMyApplications(applications)
  }, [state.candidates, user.applicantId])

  const getJobForCandidate = (candidate) => {
    return state.jobs.find(j => j.id === candidate.jobId)
  }

  const getStatusColor = (stage) => {
    const stageLower = stage?.toLowerCase() || ''
    if (stageLower.includes('reject') || stageLower.includes('decline')) return 'red'
    if (stageLower.includes('offer') || stageLower.includes('hired')) return 'green'
    if (stageLower.includes('interview')) return 'blue'
    return 'amber'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getRelativeTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Applications
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track and manage all your job applications
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {myApplications.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Icon name="briefcase" className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {myApplications.filter(a => {
                    const stage = a.stage?.toLowerCase() || ''
                    return !stage.includes('reject') && !stage.includes('hired')
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Icon name="clock" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Interviews</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {myApplications.filter(a => a.stage?.toLowerCase().includes('interview')).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Icon name="calendar" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                All Applications
              </h2>
              <Link
                to="/careers/1"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Browse Jobs
              </Link>
            </div>
          </div>

          {myApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="briefcase" className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No Applications Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Start applying to jobs to see them here
              </p>
              <Link
                to="/careers/1"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <Icon name="search" className="w-5 h-5" />
                Browse Open Positions
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {myApplications.map((application) => {
                const job = getJobForCandidate(application)
                const statusColor = getStatusColor(application.stage)

                return (
                  <div key={application.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {job?.title || 'Unknown Position'}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusColor === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            statusColor === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            statusColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>
                            {application.stage}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {job?.location && (
                            <span className="flex items-center gap-1">
                              <Icon name="location" className="w-4 h-4" />
                              {job.location}
                            </span>
                          )}
                          {job?.type && (
                            <span className="flex items-center gap-1">
                              <Icon name="clock" className="w-4 h-4" />
                              {job.type}
                            </span>
                          )}
                          {application.applicationData?.submittedAt && (
                            <span className="flex items-center gap-1">
                              <Icon name="calendar" className="w-4 h-4" />
                              Applied {getRelativeTime(application.applicationData.submittedAt)}
                            </span>
                          )}
                        </div>

                        {application.trackingCode && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Tracking:</span>
                            <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded font-mono text-xs">
                              {application.trackingCode}
                            </code>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {application.trackingCode && (
                          <Link
                            to={`/track/${application.trackingCode}`}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Communications */}
                    {application.communications && application.communications.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-2 text-sm">
                          <Icon name="info" className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Latest Update</p>
                            <p className="text-slate-600 dark:text-slate-400">
                              {application.communications[application.communications.length - 1].message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              {formatDate(application.communications[application.communications.length - 1].date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
