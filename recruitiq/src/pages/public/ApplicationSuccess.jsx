import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import PublicLayout from '../../components/PublicLayout'
import { Icon } from '../../components/icons'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function ApplicationSuccess() {
  const { jobId } = useParams()
  const [searchParams] = useSearchParams()
  const trackingCode = searchParams.get('tracking')
  const [job, setJob] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/public/jobs/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJob(data)
      }
    } catch (err) {
      console.error('Error loading job details:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const companyName = job?.public_portal_settings?.companyName || job?.organization_name || 'the company'
  const organizationId = job?.organization_id

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="check" className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Application Submitted!
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400">
            Thank you for applying to{' '}
            <strong className="text-slate-900 dark:text-slate-100">{job?.title}</strong>
            {job && (
              <>
                {' '}at <strong className="text-slate-900 dark:text-slate-100">{companyName}</strong>
              </>
            )}
          </p>
        </div>

        {/* Tracking Code Card */}
        {trackingCode && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Your Application Tracking Code
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Save this code to check your application status anytime
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {trackingCode}
                </div>
                <button
                  onClick={copyTrackingCode}
                  className="px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Icon name={copied ? "check" : "copy"} className="w-5 h-5" />
                </button>
              </div>

              {copied && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                  ✓ Copied to clipboard!
                </p>
              )}

              <Link
                to={`/track/${trackingCode}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Icon name="search" className="w-4 h-4" />
                Track Your Application
              </Link>
            </div>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            What Happens Next?
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Confirmation Email
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You'll receive a confirmation email shortly at the address you provided
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Application Review
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Our team will carefully review your application and qualifications
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Next Steps
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  If your profile matches our requirements, we'll reach out to schedule an interview
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex gap-3">
            <Icon name="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Keep Track of Your Application
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Use your tracking code to check your application status, view messages from our team, 
                and respond to interview invitations at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          {trackingCode && (
            <Link
              to={`/track/${trackingCode}`}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-center shadow-sm hover:shadow-md"
            >
              Track Application
            </Link>
          )}
          {organizationId && (
            <Link
              to={`/careers/${organizationId}`}
              className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 font-medium rounded-lg transition-colors text-center"
            >
              View More Jobs
            </Link>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
