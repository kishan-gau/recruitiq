import React, { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

export default function CandidateEditForm({ open, onClose, candidate }) {
  const { updateCandidate } = useData()
  const toast = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [currentJobTitle, setCurrentJobTitle] = useState('')
  const [currentCompany, setCurrentCompany] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const firstNameRef = useRef(null)
  const emailRef = useRef(null)

  // Populate form when editing
  useEffect(() => {
    if (open && candidate) {
      // Split name if needed
      const fullName = candidate.name || ''
      const nameParts = fullName.split(' ')
      
      setFirstName(candidate.firstName || nameParts[0] || '')
      setLastName(candidate.lastName || nameParts.slice(1).join(' ') || '')
      setEmail(candidate.email || '')
      setPhone(candidate.phone || '')
      setLocation(candidate.location || '')
      setCurrentJobTitle(candidate.currentJobTitle || candidate.title || '')
      setCurrentCompany(candidate.currentCompany || '')
      setLinkedinUrl(candidate.linkedinUrl || '')
      setPortfolioUrl(candidate.portfolioUrl || '')
      setNotes(candidate.notes || '')
      setErrors({})
      setTouched({})
    }
  }, [open, candidate])

  const validate = () => {
    const newErrors = {}

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\//)) {
      newErrors.linkedinUrl = 'Please enter a valid URL (starting with http:// or https://)'
    }

    if (portfolioUrl && !portfolioUrl.match(/^https?:\/\//)) {
      newErrors.portfolioUrl = 'Please enter a valid URL (starting with http:// or https://)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      location: true,
      currentJobTitle: true,
      currentCompany: true,
      linkedinUrl: true,
      portfolioUrl: true
    })

    if (!validate()) {
      toast.show('Please fix the errors before submitting')
      return
    }

    const updatedData = {
      firstName,
      lastName,
      email,
      phone,
      location,
      currentJobTitle,
      currentCompany,
      linkedinUrl,
      portfolioUrl,
      notes
    }

    updateCandidate(candidate.id, updatedData)
      .then(() => {
        toast.show('Candidate updated successfully')
        onClose()
      })
      .catch((err) => {
        console.error(err)
        toast.show(err.message || 'Failed to update candidate')
      })
  }

  if (!candidate) return null

  return (
    <Modal open={open} title="Edit Candidate" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              ref={firstNameRef}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => {
                setTouched({ ...touched, firstName: true })
                validate()
              }}
              placeholder="John"
              className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                touched.firstName && errors.firstName
                  ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
              }`}
            />
            {touched.firstName && errors.firstName && (
              <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</div>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => {
                setTouched({ ...touched, lastName: true })
                validate()
              }}
              placeholder="Doe"
              className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                touched.lastName && errors.lastName
                  ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
              }`}
            />
            {touched.lastName && errors.lastName && (
              <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => {
              setTouched({ ...touched, email: true })
              validate()
            }}
            placeholder="john.doe@example.com"
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              touched.email && errors.email
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
            }`}
          />
          {touched.email && errors.email && (
            <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</div>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="New York, NY"
            className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Professional Info */}
        <div className="pt-2 border-t dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Professional Information</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="currentJobTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Job Title
              </label>
              <input
                id="currentJobTitle"
                type="text"
                value={currentJobTitle}
                onChange={(e) => setCurrentJobTitle(e.target.value)}
                placeholder="Senior Software Engineer"
                className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="currentCompany" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Company
              </label>
              <input
                id="currentCompany"
                type="text"
                value={currentCompany}
                onChange={(e) => setCurrentCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="pt-2 border-t dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Links & Profiles</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                LinkedIn Profile
              </label>
              <input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                onBlur={() => {
                  setTouched({ ...touched, linkedinUrl: true })
                  validate()
                }}
                placeholder="https://linkedin.com/in/johndoe"
                className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  touched.linkedinUrl && errors.linkedinUrl
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                }`}
              />
              {touched.linkedinUrl && errors.linkedinUrl && (
                <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.linkedinUrl}</div>
              )}
            </div>

            <div>
              <label htmlFor="portfolioUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Portfolio/Website
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                onBlur={() => {
                  setTouched({ ...touched, portfolioUrl: true })
                  validate()
                }}
                placeholder="https://johndoe.com"
                className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  touched.portfolioUrl && errors.portfolioUrl
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                }`}
              />
              {touched.portfolioUrl && errors.portfolioUrl && (
                <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.portfolioUrl}</div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="pt-2 border-t dark:border-slate-700">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes about this candidate..."
            className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}
