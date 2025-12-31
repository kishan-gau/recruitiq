import { useState } from 'react';

import { useToast } from '../context/ToastContext';
import { 
  trackJobPublished, 
  trackJobUnpublished, 
  trackJobUrlCopied, 
  trackJobPreviewed 
} from '../utils/telemetry';

import { Icon } from './icons';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function PublishJobToggle({ job, onUpdate }) {
  const toast = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const isPublished = job?.is_public || false;
  const publicSlug = job?.public_slug;
  const publicUrl = publicSlug 
    ? `${window.location.origin}/apply/${publicSlug}`
    : null;

  const handleTogglePublish = async () => {
    try {
      setIsPublishing(true);

      // SECURITY: Auth token is now in httpOnly cookie, sent automatically
      const response = await fetch(`${API_BASE}/jobs/${job.id}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // CRITICAL: Send cookies with request
        body: JSON.stringify({
          isPublic: !isPublished
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update job visibility');
      }

      const data = await response.json();
      
      // Track analytics event
      if (!isPublished) {
        trackJobPublished(job.id, job.title);
      } else {
        trackJobUnpublished(job.id, job.title);
      }
      
      toast?.showToast?.(
        isPublished ? 'Job unpublished from career portal' : 'Job published to career portal!',
        'success'
      );

      // Notify parent component to refresh
      if (onUpdate) {
        onUpdate(data);
      }
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast?.showToast?.('Failed to update job visibility', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setShowCopySuccess(true);
      
      // Track analytics event
      trackJobUrlCopied(job.id, job.title);
      
      toast?.showToast?.('Public URL copied to clipboard!', 'success');
      setTimeout(() => setShowCopySuccess(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Public Career Portal
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isPublished 
              ? 'This job is visible on your public career page' 
              : 'Publish this job to allow candidates to apply directly'}
          </p>
        </div>

        <button
          onClick={handleTogglePublish}
          disabled={isPublishing}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            isPublished 
              ? 'bg-emerald-600' 
              : 'bg-slate-300 dark:bg-slate-600'
          } ${isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPublished ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Published State - Show URL */}
      {isPublished && publicUrl && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Public Application URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-mono"
            />
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Copy URL"
            >
              <Icon name={showCopySuccess ? 'check' : 'copy'} className="w-4 h-4" />
              {showCopySuccess ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackJobPreviewed(job.id, job.title)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Preview public page"
            >
              <Icon name="external-link" className="w-4 h-4" />
              Preview
            </a>
          </div>

          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Icon name="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                  Share this link to receive applications
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  Post on LinkedIn, company website, job boards, or anywhere candidates can find it.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Icon name="eye" className="w-4 h-4" />
                <span>Views</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {job?.view_count || 0}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Icon name="users" className="w-4 h-4" />
                <span>Applications</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {job?.application_count || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unpublished State - Call to Action */}
      {!isPublished && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Benefits of Publishing:
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <Icon name="check" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Get a unique, shareable URL for your job posting</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Receive applications directly without manual entry</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Candidates can track their application status automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Track views and application metrics</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
