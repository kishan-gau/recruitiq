/**
 * CandidateFormModal - TypeScript Migration
 * 
 * Migrated from: /apps/recruitiq/src/components/CandidateForm.jsx (303 lines)
 * Migration date: December 27, 2025
 * 
 * Key Changes:
 * - Context API → TanStack Query mutations
 * - JSX → TypeScript with full type safety
 * - Form validation with real-time feedback
 * - Accessibility improvements (ARIA labels, error messages)
 * - Focus management and error scrolling
 */

import React, { useState, useRef, useEffect } from 'react';
import { useJobs } from '../hooks/useJobs';
import { useCreateCandidate, useUpdateCandidate } from '../hooks/useCandidates';

interface CandidateFormData {
  name: string;
  email: string;
  title?: string;
  location?: string;
  jobId?: number;
  stage?: string;
}

interface CandidateFormModalProps {
  open: boolean;
  onClose: () => void;
  candidate?: any; // Can be improved with proper Candidate type
  onSuccess?: () => void;
}

interface FormTouched {
  name: boolean;
  email: boolean;
}

export default function CandidateFormModal({
  open,
  onClose,
  candidate,
  onSuccess
}: CandidateFormModalProps) {
  const { data: jobsData } = useJobs();
  const jobs = jobsData?.jobs || [];
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  
  const isEdit = !!candidate;
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobId, setJobId] = useState<string>('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState<FormTouched>({ name: false, email: false });
  
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Get the first stage from the selected job
  const getInitialStage = (): string => {
    const selectedJob = jobs.find((j: any) => j.id === Number(jobId));
    
    if (!selectedJob?.flow?.stages || selectedJob.flow.stages.length === 0) {
      return 'Applied'; // Fallback
    }
    
    try {
      // Return the first stage name
      return selectedJob.flow.stages[0].name || 'Applied';
    } catch (e) {
      console.error('Failed to load initial stage:', e);
      return 'Applied';
    }
  };

  // Reset form when modal opens/closes or populate when editing
  useEffect(() => {
    if (open && candidate) {
      // Populate fields for editing
      setName(candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim());
      setEmail(candidate.email || '');
      setTitle(candidate.currentJobTitle || candidate.title || '');
      setLocation(candidate.location || 'Remote');
      setJobId(candidate.jobId?.toString() || jobs[0]?.id?.toString() || '');
      setNameError('');
      setEmailError('');
      setTouched({ name: false, email: false });
    } else if (!open) {
      // Reset form when closing
      setName('');
      setEmail('');
      setTitle('');
      setLocation('Remote');
      setJobId(jobs[0]?.id?.toString() || '');
      setNameError('');
      setEmailError('');
      setTouched({ name: false, email: false });
    }
  }, [open, candidate, jobs]);

  // Set default jobId when jobs load
  useEffect(() => {
    if (!jobId && jobs.length > 0) {
      setJobId(jobs[0].id.toString());
    }
  }, [jobs, jobId]);

  // Validation functions
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Candidate name is required';
    }
    return '';
  };

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Event handlers with validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (touched.name) {
      setNameError(validateName(value));
    }
  };

  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    setNameError(validateName(name));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    setEmailError(validateEmail(email));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ name: true, email: true });

    // Validate
    const nameValidationError = validateName(name);
    const emailValidationError = validateEmail(email);
    setNameError(nameValidationError);
    setEmailError(emailValidationError);

    if (nameValidationError) {
      // Scroll to and focus the first error field with animation
      if (nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameRef.current.classList.add('animate-shake');
        setTimeout(() => {
          nameRef.current?.classList.remove('animate-shake');
          nameRef.current?.focus();
        }, 400);
      }
      return;
    }

    if (emailValidationError) {
      // Scroll to and focus email field with animation
      if (emailRef.current) {
        emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current.classList.add('animate-shake');
        setTimeout(() => {
          emailRef.current?.classList.remove('animate-shake');
          emailRef.current?.focus();
        }, 400);
      }
      return;
    }

    const candidateData: CandidateFormData = {
      name,
      email,
      title,
      location
    };

    try {
      if (isEdit) {
        // Update existing candidate
        await updateCandidate.mutateAsync({
          id: candidate.id,
          data: candidateData
        });
      } else {
        // Add new candidate
        const initialStage = getInitialStage();
        const newCandidateData = {
          ...candidateData,
          jobId: Number(jobId),
          stage: initialStage
        };
        await createCandidate.mutateAsync(newCandidateData);
      }
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save candidate:', err);
      // Error will be shown via TanStack Query error handling
    }
  };

  // Don't render if not open
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Candidate' : 'Add Candidate'}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label 
                htmlFor="candidate-name" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="candidate-name"
                ref={nameRef}
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder="Full name"
                aria-required="true"
                aria-invalid={nameError ? 'true' : 'false'}
                aria-describedby={nameError ? 'name-error' : undefined}
                className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  nameError
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {nameError && (
                <div 
                  id="name-error" 
                  className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" 
                  role="alert"
                >
                  {nameError}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label 
                htmlFor="candidate-email" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="candidate-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="email@example.com"
                aria-required="true"
                aria-invalid={emailError ? 'true' : 'false'}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  emailError
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {emailError && (
                <div 
                  id="email-error" 
                  className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" 
                  role="alert"
                >
                  {emailError}
                </div>
              )}
            </div>

            {/* Current Title */}
            <div>
              <label 
                htmlFor="candidate-title" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Current Title
              </label>
              <input
                id="candidate-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Current title"
                className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            {/* Location and Job */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="candidate-location" 
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Location
                </label>
                <input
                  id="candidate-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
              <div>
                <label 
                  htmlFor="candidate-job" 
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Job
                </label>
                <select
                  id="candidate-job"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                >
                  {jobs.map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCandidate.isPending || updateCandidate.isPending}
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {(createCandidate.isPending || updateCandidate.isPending) ? 'Saving...' : (isEdit ? 'Update' : 'Add')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
