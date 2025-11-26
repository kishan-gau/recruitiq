/**
 * Performance Review Details Page
 * Displays detailed information about a single performance review
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Award,
  User,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  FileText,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  MessageSquare,
} from 'lucide-react';
import {
  usePerformanceReview,
  useDeletePerformanceReview,
  useSubmitPerformanceReview,
} from '@/hooks/usePerformance';
import FeedbackForm from '@/components/performance/FeedbackForm';
import FeedbackList from '@/components/performance/FeedbackList';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { ReviewStatus, ReviewType, ReviewRating } from '@/types/performance.types';

const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  annual: 'Annual Review',
  'mid-year': 'Mid-Year Review',
  quarterly: 'Quarterly Review',
  probation: 'Probation Review',
  '360': '360° Review',
  project: 'Project Review',
};

const STATUS_CONFIG: Record<ReviewStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: FileText,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle,
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
};

const RATING_LABELS: Record<ReviewRating, { label: string; color: string }> = {
  1: { label: 'Needs Improvement', color: 'text-red-600 dark:text-red-400' },
  2: { label: 'Below Expectations', color: 'text-orange-600 dark:text-orange-400' },
  3: { label: 'Meets Expectations', color: 'text-yellow-600 dark:text-yellow-400' },
  4: { label: 'Exceeds Expectations', color: 'text-green-600 dark:text-green-400' },
  5: { label: 'Outstanding', color: 'text-blue-600 dark:text-blue-400' },
};

const RatingStars = ({ rating }: { rating: ReviewRating }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Award
          key={star}
          size={20}
          className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
    </div>
  );
};

export default function ReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const { data: review, isLoading } = usePerformanceReview(id);
  const deleteMutation = useDeletePerformanceReview();
  const submitMutation = useSubmitPerformanceReview();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'feedback'>('details');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const canProvideFeedback = hasPermission('performance:feedback');

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate('/performance/reviews');
    }
  };

  const handleSubmit = async () => {
    if (id) {
      await submitMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <Award className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Review not found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The performance review you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/performance/reviews"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <ArrowLeft size={20} />
          Back to Reviews
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[review.status].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/performance/reviews"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Review</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {REVIEW_TYPE_LABELS[review.reviewType]}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {(review.status === 'draft' || review.status === 'in-progress') && (
            <>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
                Submit Review
              </button>
              <Link
                to={`/performance/reviews/${review.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Edit size={20} />
                Edit
              </Link>
            </>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={20} />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="inline-block mr-2" size={18} />
            Review Details
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'feedback'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="inline-block mr-2" size={18} />
            Feedback
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Status & Period */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Information</h2>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_CONFIG[review.status].className
                }`}
              >
                <StatusIcon size={16} />
                {STATUS_CONFIG[review.status].label}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Review Period</p>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <Calendar size={16} />
                  {format(new Date(review.reviewPeriodStart), 'MMM d, yyyy')} -{' '}
                  {format(new Date(review.reviewPeriodEnd), 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(new Date(review.dueDate), 'MMM d, yyyy')}
                </p>
              </div>
              {review.completedDate && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(new Date(review.completedDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ratings */}
          {review.overallRating && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ratings</h2>
              
              <div className="space-y-4">
                {/* Overall Rating */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Overall Rating</h3>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {review.overallRating}/5
                    </span>
                  </div>
                  <RatingStars rating={review.overallRating} />
                  <p className={`mt-2 text-sm font-medium ${RATING_LABELS[review.overallRating].color}`}>
                    {RATING_LABELS[review.overallRating].label}
                  </p>
                </div>

                {/* Individual Ratings */}
                <div className="grid grid-cols-2 gap-4">
                  {review.technicalSkillsRating && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Technical Skills</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.technicalSkillsRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.technicalSkillsRating}/5
                        </span>
                      </div>
                    </div>
                  )}
                  {review.communicationRating && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Communication</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.communicationRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.communicationRating}/5
                        </span>
                      </div>
                    </div>
                  )}
                  {review.teamworkRating && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Teamwork</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.teamworkRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.teamworkRating}/5
                        </span>
                      </div>
                    </div>
                  )}
                  {review.leadershipRating && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Leadership</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.leadershipRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.leadershipRating}/5
                        </span>
                      </div>
                    </div>
                  )}
                  {review.initiativeRating && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Initiative</p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.initiativeRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.initiativeRating}/5
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comments & Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Feedback</h2>

            {review.achievements && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Achievements</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.achievements}
                </p>
              </div>
            )}

            {review.strengths && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Strengths</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.strengths}
                </p>
              </div>
            )}

            {review.areasForImprovement && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Areas for Improvement</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.areasForImprovement}
                </p>
              </div>
            )}

            {review.goals && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Future Goals</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.goals}
                </p>
              </div>
            )}

            {review.reviewerComments && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reviewer Comments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.reviewerComments}
                </p>
              </div>
            )}

            {review.employeeComments && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Comments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {review.employeeComments}
                </p>
              </div>
            )}
          </div>
            </>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Add Feedback Button */}
              {canProvideFeedback && !showFeedbackForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare size={20} />
                    Provide Feedback
                  </button>
                </div>
              )}

              {/* Feedback Form */}
              {showFeedbackForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Provide Feedback
                  </h2>
                  <FeedbackForm
                    employeeId={review.employeeId}
                    reviewId={review.id}
                    onSuccess={() => setShowFeedbackForm(false)}
                    onCancel={() => setShowFeedbackForm(false)}
                  />
                </div>
              )}

              {/* Feedback List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  All Feedback
                </h2>
                <FeedbackList employeeId={review.employeeId} reviewId={review.id} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee</h2>
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {review.employee?.firstName} {review.employee?.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {review.employee?.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {review.employee?.jobTitle}
                </p>
                {review.employee?.department && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {review.employee.department.departmentName}
                  </p>
                )}
                <Link
                  to={`/employees/${review.employeeId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-block"
                >
                  View Profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Reviewer Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reviewer</h2>
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {review.reviewer?.firstName} {review.reviewer?.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {review.reviewer?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Performance Review
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this performance review? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

