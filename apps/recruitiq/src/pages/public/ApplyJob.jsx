import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import PublicLayout from '../../components/PublicLayout'
import { Icon } from '../../components/icons'
import { trackPublicJobViewed, trackApplicationSubmitted } from '../../utils/telemetry'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function ApplyJob() {
  const { jobId } = useParams()
  const toast = useToast()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    currentJobTitle: '',
    currentCompany: '',
    resume: null,
    resumeFile: null, // File object for display
    coverLetter: '',
    linkedinUrl: '',
    portfolioUrl: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadJob()
    
    // Track page view when component mounts
    if (jobId) {
      trackPublicJobViewed(jobId, document.referrer)
    }
  }, [jobId])

  const loadJob = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/public/jobs/${jobId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Job not found or not publicly available')
        } else {
          throw new Error('Failed to load job')
        }
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setJob(data)
    } catch (err) {
      console.error('Error loading job:', err)
      setError('Failed to load job posting. Please try again.')
      toast?.showToast?.('Failed to load job posting', 'error')
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast?.showToast?.('Resume file must be less than 10MB', 'error')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      toast?.showToast?.('Please upload a PDF or Word document', 'error')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1] // Remove data:mime;base64, prefix
      setFormData(prev => ({
        ...prev,
        resume: {
          filename: file.name,
          contentType: file.type,
          data: base64,
          size: file.size
        },
        resumeFile: file
      }))
    }
    reader.onerror = () => {
      toast?.showToast?.('Failed to read file', 'error')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      toast?.showToast?.('Please fix the errors in the form', 'error')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        currentJobTitle: formData.currentJobTitle || '',
        currentCompany: formData.currentCompany || '',
        linkedinUrl: formData.linkedinUrl || '',
        portfolioUrl: formData.portfolioUrl || '',
        coverLetter: formData.coverLetter || '',
        resume: formData.resume,
        customResponses: {}
      }

      const response = await fetch(`${API_BASE}/public/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many applications. Please try again later.')
        }
        throw new Error(data.message || 'Failed to submit application')
      }

      // Track successful application submission
      trackApplicationSubmitted(jobId, 'public-portal')

      toast?.showToast?.('Application submitted successfully!', 'success')
      
      // Navigate to success page with tracking code
      navigate(`/apply/${jobId}/success?tracking=${data.trackingCode}`)

    } catch (error) {
      console.error('Error submitting application:', error)
      toast?.showToast?.(error.message || 'Failed to submit application. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading job posting...</p>
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (error || !job) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="briefcase" className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {error || 'Job Not Found'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            This job posting is not available or has been closed.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </PublicLayout>
    )
  }

  const companyName = job.companyName || 'Company'

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Job Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            {job.companyLogo && (
              <img 
                src={job.companyLogo} 
                alt={companyName}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {job.title}
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-3">
                {companyName}
              </p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-3 text-sm">
            {job.location && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                <Icon name="location" className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
            )}
            {job.employmentType && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                <Icon name="clock" className="w-4 h-4" />
                <span>{job.employmentType}</span>
              </div>
            )}
            {job.department && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                <Icon name="briefcase" className="w-4 h-4" />
                <span>{job.department}</span>
              </div>
            )}
            {job.experienceLevel && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                <Icon name="star" className="w-4 h-4" />
                <span>{job.experienceLevel}</span>
              </div>
            )}
            {job.isRemote && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300">
                <Icon name="home" className="w-4 h-4" />
                <span>Remote</span>
              </div>
            )}
            {job.salary && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-300 font-medium">
                <Icon name="dollar" className="w-4 h-4" />
                <span>
                  {job.salary.currency === 'USD' ? '$' : job.salary.currency}
                  {Math.floor(job.salary.min / 1000)}k - {Math.floor(job.salary.max / 1000)}k
                </span>
              </div>
            )}
          </div>

          {/* Posted date */}
          {job.postedAt && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
              Posted {new Date(job.postedAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
              {job.viewCount > 0 && (
                <span className="ml-2">• {job.viewCount} views</span>
              )}
            </p>
          )}
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              About the Role
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Requirements
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {job.requirements}
              </p>
            </div>
          </div>
        )}

        {/* Company Info */}
        {publicPortal.companyDescription && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              About {companyName}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {publicPortal.companyDescription}
            </p>
          </div>
        )}

        {/* Application Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
            Apply for this Position
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  ${errors.firstName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  ${errors.lastName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  ${errors.phone ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Location <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  ${errors.location ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="San Francisco, CA"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Current Job Title */}
            <div>
              <label htmlFor="currentJobTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Job Title
              </label>
              <input
                id="currentJobTitle"
                type="text"
                value={formData.currentJobTitle}
                onChange={(e) => handleChange('currentJobTitle', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Software Engineer"
              />
            </div>

            {/* Current Company */}
            <div>
              <label htmlFor="currentCompany" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Company
              </label>
              <input
                id="currentCompany"
                type="text"
                value={formData.currentCompany}
                onChange={(e) => handleChange('currentCompany', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Acme Corp"
              />
            </div>

            {/* Resume Upload */}
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Resume / CV
              </label>
              <input
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {formData.resumeFile && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Selected: {formData.resumeFile.name} ({Math.round(formData.resumeFile.size / 1024)}KB)
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                PDF or Word document, max 10MB
              </p>
            </div>

            {/* Cover Letter */}
            <div>
              <label htmlFor="coverLetter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cover Letter
              </label>
              <textarea
                id="coverLetter"
                value={formData.coverLetter}
                onChange={(e) => handleChange('coverLetter', e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Tell us why you're interested in this position..."
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                LinkedIn Profile
              </label>
              <input
                id="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            {/* Portfolio */}
            <div>
              <label htmlFor="portfolioUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Portfolio / Website
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={(e) => handleChange('portfolioUrl', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://johndoe.com"
              />
            </div>

            {/* Privacy Notice */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                By submitting this application, you consent to {companyName} processing your personal data for recruitment purposes. 
                Your information will be handled in accordance with our{' '}
                <a href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Privacy Policy
                </a>.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting Application...
                </span>
              ) : (
                'Submit Application'
              )}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}
