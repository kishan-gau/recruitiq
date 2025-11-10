/**
 * Edit Performance Review Page
 * Page for editing an existing performance review
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { Award, ArrowLeft } from 'lucide-react';
import ReviewForm, { type ReviewFormData } from '@/components/performance/ReviewForm';
import { usePerformanceReview, useUpdatePerformanceReview } from '@/hooks/usePerformance';
import { useEmployees } from '@/hooks/useEmployees';
import type { ReviewRating } from '@/types/performance.types';

export default function ReviewEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: review, isLoading } = usePerformanceReview(id);
  const updateMutation = useUpdatePerformanceReview();
  const { data: employees = [] } = useEmployees();

  const reviewers = employees;

  const handleSubmit = async (data: ReviewFormData) => {
    if (id) {
      await updateMutation.mutateAsync({
        id,
        updates: {
          reviewerId: data.reviewerId,
          dueDate: data.dueDate,
          ...(data.overallRating && { overallRating: data.overallRating as ReviewRating }),
          ...(data.technicalSkillsRating && { technicalSkillsRating: data.technicalSkillsRating as ReviewRating }),
          ...(data.communicationRating && { communicationRating: data.communicationRating as ReviewRating }),
          ...(data.teamworkRating && { teamworkRating: data.teamworkRating as ReviewRating }),
          ...(data.leadershipRating && { leadershipRating: data.leadershipRating as ReviewRating }),
          ...(data.initiativeRating && { initiativeRating: data.initiativeRating as ReviewRating }),
          ...(data.achievements && { achievements: data.achievements }),
          ...(data.strengths && { strengths: data.strengths }),
          ...(data.areasForImprovement && { areasForImprovement: data.areasForImprovement }),
          ...(data.goals && { goals: data.goals }),
          ...(data.reviewerComments && { reviewerComments: data.reviewerComments }),
          ...(data.employeeComments && { employeeComments: data.employeeComments }),
        },
      });

      navigate(`/performance/reviews/${id}`);
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
          The performance review you're trying to edit doesn't exist or has been deleted.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/performance/reviews/${id}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Award size={32} />
            Edit Performance Review
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update review for {review.employee?.firstName} {review.employee?.lastName}
          </p>
        </div>
      </div>

      {/* Form */}
      <ReviewForm
        initialData={review}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        employees={employees}
        reviewers={reviewers}
      />
    </div>
  );
}

