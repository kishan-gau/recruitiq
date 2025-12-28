/**
 * CandidateDetail - TypeScript Migration
 * 
 * Detailed view of a candidate with tabs for overview, activity, documents, and compliance.
 * 
 * @migrated-from /apps/recruitiq/src/pages/CandidateDetail.jsx (362 lines)
 * @features
 * - Candidate overview with contact information
 * - Activity timeline
 * - Document management
 * - Compliance tracking
 * - Edit/Delete candidate actions
 * - Tab-based navigation
 * - Dark mode support
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCandidate, useDeleteCandidate } from '../hooks/useCandidates';
import { useJobs } from '../hooks/useJobs';
import { ApplicationSourceBadge } from '../../../components/ui/ApplicationSourceBadge';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface StageColor {
  bg: string;
  text: string;
  border: string;
}

type TabId = 'overview' | 'activity' | 'documents' | 'compliance';

interface Tab {
  id: TabId;
  label: string;
}

interface Candidate {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  location?: string;
  title?: string;
  source?: string;
  jobId?: string;
  stage?: string;
  experience?: string;
  resume?: string;
}

interface Job {
  id: string;
  title: string;
}

// ============================================================================
// Constants
// ============================================================================

const STAGE_COLORS: Record<string, StageColor> = {
  'Applied': {
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600'
  },
  'Phone Screen': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-600'
  },
  'Interview': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600'
  },
  'Offer': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-600'
  },
  'Hired': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600'
  }
};

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' }
];

// ============================================================================
// Helper Functions
// ============================================================================

function getCandidateInitials(candidate: Candidate): string {
  const name = candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function getCandidateName(candidate: Candidate): string {
  return candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown';
}

// ============================================================================
// Main Component
// ============================================================================

export default function CandidateDetail() {
  // Route params
  const { id } = useParams<{ id: string }>();

  // TanStack Query hooks
  const { data: candidate, isLoading: candidateLoading, isError, error } = useCandidate(id!);
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const deleteMutation = useDeleteCandidate();

  // Navigation
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      navigate('/candidates');
    } catch (error) {
      console.error('Failed to delete candidate:', error);
    } finally {
      setConfirmOpen(false);
    }
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (candidateLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Loading candidate details...
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Failed to load candidate
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {error instanceof Error ? error.message : 'An error occurred'}
            </div>
          </div>
          <Link
            to="/candidates"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm transition-colors"
          >
            Back to candidates
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Not Found State
  // ============================================================================

  if (!candidate) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Candidate not found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              The candidate you're looking for doesn't exist
            </div>
          </div>
          <Link
            to="/candidates"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium shadow-sm transition-colors"
          >
            Back to candidates
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Data Preparation
  // ============================================================================

  const job = jobs?.find(j => j.id === candidate.jobId);
  const candidateStatus = 'Active Candidate';
  const stageColor: StageColor = {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600'
  };

  const initials = getCandidateInitials(candidate);
  const displayName = getCandidateName(candidate);

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/candidates"
        className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to candidates
      </Link>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {initials}
              </div>
              <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Name and Title */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mt-1">
                <span className="text-sm">{candidate.title || 'Candidate'}</span>
                {candidate.source && (
                  <>
                    <span className="text-slate-400">•</span>
                    <ApplicationSourceBadge source={candidate.source} />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
            >
              {candidateStatus}
            </span>

            {/* Action Buttons */}
            <button
              onClick={() => setEditOpen(true)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200"
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
        <div className="flex gap-1 px-6 border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === tab.id
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                      {candidate.email}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phone</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                      {candidate.phone || '—'}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Location</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                      {candidate.location || '—'}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Applied for</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                      {job ? job.title : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {candidate.experience && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Experience
                  </h2>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {candidate.experience}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <a
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  href={candidate.resume || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Resume
                </a>
                <button className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 rounded font-medium shadow-sm hover:shadow transition-all duration-200">
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Activity Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Moved to {candidate.stage || 'Applied'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">2 days ago</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Stage updated by recruiter
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Application submitted
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">5 days ago</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Candidate applied for {job ? job.title : 'position'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Documents
              </h2>
              <div className="space-y-3">
                {candidate.resume && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-red-600 dark:text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          Resume.pdf
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Uploaded 5 days ago • 245 KB
                        </div>
                      </div>
                    </div>
                    <a
                      href={candidate.resume}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                    >
                      View
                    </a>
                  </div>
                )}

                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                  No additional documents uploaded
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Compliance & Legal
              </h2>
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-2">
                    <svg
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium text-emerald-900 dark:text-emerald-100">
                      US Work Authorization
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 ml-8">
                    Verified and confirmed
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Background Check
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">
                    Pending initiation
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Offer Letter
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">
                    Not yet issued
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Delete Confirmation Modal */}
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Delete candidate
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Delete {displayName}? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Modal Placeholder */}
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setEditOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Edit Candidate
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Edit form will be implemented using CandidateFormModal component.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
