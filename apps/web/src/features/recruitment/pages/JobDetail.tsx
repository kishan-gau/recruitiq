import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJob, useCandidates } from '../hooks';
import type { Job } from '@recruitiq/types';

interface PortalSettingsModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (job: Job) => void;
}

interface PublishJobToggleProps {
  job: Job;
  onUpdate: (job: Job) => void;
}

// Temporary placeholders for missing components
const PublishJobToggle: React.FC<PublishJobToggleProps> = ({ job, onUpdate }) => (
  <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
    <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Publish Job</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
      Make this job visible on your public job portal.
    </p>
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={job.isPublic || false}
        onChange={(e) => onUpdate({ ...job, isPublic: e.target.checked })}
        className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600"
      />
      <span className="text-sm text-slate-700 dark:text-slate-300">
        {job.isPublic ? 'Published' : 'Draft'}
      </span>
    </label>
  </div>
);

const PortalSettingsModal: React.FC<PortalSettingsModalProps> = ({ job, isOpen, onClose, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
          Portal Settings
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Configure how this job appears on your public portal.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const { data: job, isLoading: jobLoading, error: jobError, refetch } = useJob(id!);
  const { data: candidatesData, isLoading: candidatesLoading } = useCandidates({
    jobId: id,
  });
  
  const candidates = candidatesData?.candidates || [];
  const isLoading = jobLoading || candidatesLoading;

  const handleJobUpdate = (updatedJob: Job) => {
    // Trigger refetch to update job data
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading job details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (jobError || !job) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {jobError ? 'Failed to load job' : 'Job not found'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {jobError?.message || 'The job you\'re looking for doesn\'t exist'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/recruitment/jobs"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Back to jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPublished = job.isPublic === true;
  const jobCandidates = candidates.filter(c => c.jobId === job.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {job.title}
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <span>{job.location || 'Remote'}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{job.employmentType || job.type || 'Full-time'}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {job.openings || 1} {(job.openings || 1) === 1 ? 'opening' : 'openings'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link 
            to={`/recruitment/jobs/${job.id}/edit`} 
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded shadow-sm hover:shadow transition-all duration-200 text-center text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Edit
          </Link>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm">
            Post Job
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
              Description
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {job.description ? (
                <div 
                  className="text-slate-700 dark:text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: job.description.replace(/\n/g, '<br />') 
                  }}
                />
              ) : (
                <p className="text-slate-500 dark:text-slate-400 italic">
                  No description provided
                </p>
              )}
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                Requirements
              </h2>
              <ul className="space-y-2">
                {job.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Publish Job Toggle */}
          <PublishJobToggle job={job} onUpdate={handleJobUpdate} />

          {/* Portal Settings */}
          {isPublished && (
            <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Configure Portal Settings</span>
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                Customize company info, salary visibility, and application fields
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Candidates */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Candidates
              </h2>
              <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                {jobCandidates.length}
              </span>
            </div>

            <div className="space-y-3">
              {jobCandidates.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    No candidates yet
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Candidates who apply will appear here
                  </p>
                </div>
              ) : (
                jobCandidates.map(candidate => (
                  <Link
                    key={candidate.id}
                    to={`/recruitment/candidates/${candidate.id}`}
                    className="group block p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {candidate.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                          {candidate.email}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3">
                        {candidate.stage && (
                          <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                            {candidate.stage}
                          </span>
                        )}
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {candidate.appliedAt && new Date(candidate.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {jobCandidates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link
                  to={`/recruitment/jobs/${job.id}/candidates`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  View All Candidates
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Job Statistics */}
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
              Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Applications</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {jobCandidates.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  job.status === 'open' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : job.status === 'closed'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {job.status || 'Draft'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Created</span>
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {job.createdAt && new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Settings Modal */}
      <PortalSettingsModal
        job={job}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={handleJobUpdate}
      />
    </div>
  );
}