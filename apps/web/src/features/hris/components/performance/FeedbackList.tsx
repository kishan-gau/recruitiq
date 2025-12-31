/**
 * Feedback List Component
 * Displays list of feedback for an employee
 */

import { useState } from 'react';

import { useEmployeeFeedback } from '@/hooks';
import { formatDate } from '@/utils';

import type { Feedback } from '../../types/feedback.types';

interface FeedbackListProps {
  employeeId: string;
}

export default function FeedbackList({ _employeeId }: FeedbackListProps) {
  const { data: feedback, isLoading, error } = useEmployeeFeedback(_employeeId);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load feedback</p>
      </div>
    );
  }

  const feedbackList = feedback?.feedback || [];

  const filteredFeedback = feedbackList.filter((item: Feedback) => {
    if (filterType !== 'all' && item.feedbackType !== filterType) return false;
    if (filterVisibility !== 'all' && item.visibility !== filterVisibility) return false;
    return true;
  });

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-5 w-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'peer':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      case 'self':
        return 'bg-green-100 text-green-800';
      case '360':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'private':
        return (
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'anonymous':
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filterType" className="block text-sm font-medium text-gray-700">
              Filter by Type
            </label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="peer">Peer Feedback</option>
              <option value="manager">Manager Feedback</option>
              <option value="self">Self Assessment</option>
              <option value="360">360° Feedback</option>
            </select>
          </div>

          <div>
            <label htmlFor="filterVisibility" className="block text-sm font-medium text-gray-700">
              Filter by Visibility
            </label>
            <select
              id="filterVisibility"
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="anonymous">Anonymous</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterType !== 'all' || filterVisibility !== 'all'
              ? 'Try adjusting the filters'
              : 'Feedback will appear here once submitted'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item: Feedback) => (
            <div key={item.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(item.feedbackType)}`}>
                      {item.feedbackType}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getVisibilityIcon(item.visibility)}
                      <span className="text-xs text-gray-500 capitalize">{item.visibility}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {item.rating && (
                      <div className="mb-2">{getRatingStars(item.rating)}</div>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{item.comments}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {item.visibility === 'anonymous' ? (
                        'Anonymous'
                      ) : (
                        `By ${item.providedByName || 'Unknown'}`
                      )}
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  {item.reviewId && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        Part of review: {item.reviewId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredFeedback.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{filteredFeedback.length}</div>
              <div className="text-xs text-gray-500">Total Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredFeedback.filter((f: Feedback) => f.feedbackType === 'peer').length}
              </div>
              <div className="text-xs text-gray-500">Peer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredFeedback.filter((f: Feedback) => f.feedbackType === 'manager').length}
              </div>
              <div className="text-xs text-gray-500">Manager</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredFeedback.filter((f: Feedback) => f.rating).length}
              </div>
              <div className="text-xs text-gray-500">With Rating</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
