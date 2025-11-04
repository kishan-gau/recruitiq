import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import PublicLayout from '../../components/PublicLayout'
import { Icon } from '../../components/icons'
import { trackApplicationTracked } from '../../utils/telemetry'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function TrackApplication() {
  const { trackingCode } = useParams()
  const toast = useToast()
  
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  useEffect(() => {
    loadApplication()
    
    // Track application status check
    if (trackingCode) {
      trackApplicationTracked(trackingCode)
    }
  }, [trackingCode])

  const loadApplication = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/public/track/${trackingCode}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Application not found')
        } else {
          throw new Error('Failed to load application')
        }
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setApplication(data)
    } catch (err) {
      console.error('Error loading application:', err)
      setError('Failed to load application status. Please try again.')
      toast?.showToast?.('Failed to load application status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast?.showToast?.('File must be less than 10MB', 'error')
      return
    }

    setUploadingDoc(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]
        
        const response = await fetch(`${API_BASE}/public/track/${trackingCode}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            data: base64,
            documentType: 'additional'
          })
        })

        if (!response.ok) throw new Error('Failed to upload document')
        toast?.showToast?.('Document uploaded successfully!', 'success')
        await loadApplication()
      }
      
      reader.onerror = () => { throw new Error('Failed to read file') }
      reader.readAsDataURL(file)
      
    } catch (err) {
      console.error('Error uploading document:', err)
      toast?.showToast?.('Failed to upload document. Please try again.', 'error')
    } finally {
      setUploadingDoc(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const statusMap = {
      'active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'withdrawn': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'hired': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
    return statusMap[status] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
  }

  const getStageProgress = () => {
    if (!application?.flowStages || application.flowStages.length === 0) return 0
    const currentIndex = application.currentStage || 0
    return ((currentIndex + 1) / application.flowStages.length) * 100
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading application status...</p>
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (error || !application) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="x" className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {error || 'Application Not Found'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              We couldn't find an application with tracking code: <strong>{trackingCode}</strong>
            </p>
            <Link to="/" className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
            <Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400">Home</Link>
            <Icon name="chevron-right" className="w-4 h-4" />
            <span>Track Application</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Application Status</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tracking Code: <span className="font-mono font-semibold">{trackingCode}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{application.job.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-1">{application.companyName}</p>
              {application.job.department && (
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  {application.job.department}  {application.job.location}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-500">Applied {formatDate(application.appliedAt)}</span>
            </div>
          </div>

          {application.flowStages && application.flowStages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Current Stage: {application.currentStageName || application.stage}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-500">
                  {application.currentStage + 1} of {application.flowStages.length}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${getStageProgress()}%` }} />
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-500">Name:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100">{application.candidate.firstName} {application.candidate.lastName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-500">Email:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100">{application.candidate.email}</span>
              </div>
            </div>
          </div>
        </div>

        {application.interviews && application.interviews.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5" />
              Scheduled Interviews
            </h2>
            <div className="space-y-4">
              {application.interviews.map((interview) => (
                <div key={interview.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">{interview.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{interview.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      interview.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                    }`}>
                      {interview.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mt-3">
                    <div className="flex items-center gap-1">
                      <Icon name="calendar" className="w-4 h-4" />
                      {formatDate(interview.scheduledAt)}
                    </div>
                    {interview.duration && (
                      <div className="flex items-center gap-1">
                        <Icon name="clock" className="w-4 h-4" />
                        {interview.duration} minutes
                      </div>
                    )}
                  </div>
                  {interview.meetingLink && (
                    <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                      Join Meeting
                      <Icon name="external-link" className="w-4 h-4" />
                    </a>
                  )}
                  {interview.location && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400"> {interview.location}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {application.communications && application.communications.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Icon name="mail" className="w-5 h-5" />
              Messages
            </h2>
            <div className="space-y-4">
              {application.communications.map((comm) => (
                <div key={comm.id} className="border-l-4 border-emerald-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">{comm.subject}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {comm.fromType === 'system' ? 'System' : 'Recruiter'}  {formatDate(comm.createdAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      comm.messageType === 'status-update' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      comm.messageType === 'interview-invite' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      comm.messageType === 'offer' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
                    }`}>
                      {comm.messageType.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comm.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Icon name="upload" className="w-5 h-5" />
            Upload Additional Documents
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Need to provide additional information? Upload documents here and we'll review them.
          </p>
          <div className="flex items-center gap-4">
            <input type="file" id="document-upload" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleDocumentUpload} disabled={uploadingDoc} />
            <label htmlFor="document-upload" className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg transition-colors cursor-pointer ${uploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploadingDoc ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Icon name="upload" className="w-4 h-4" />
                  Choose File
                </>
              )}
            </label>
            <span className="text-sm text-slate-500 dark:text-slate-500">PDF, Word, or Text file (max 10MB)</span>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            If you have questions about your application status, please keep an eye on the messages above. 
            We'll reach out to you directly if we need any additional information.
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
