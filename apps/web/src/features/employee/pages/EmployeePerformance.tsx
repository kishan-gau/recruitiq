import { useState } from 'react';
import { Target, Award, TrendingUp, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentGoals, useReviews, useFeedback } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Employee Performance Page
 * Mobile-optimized performance reviews and goals
 * 
 * Features:
 * - Current goals with progress
 * - Performance reviews history
 * - Feedback display
 */
export default function EmployeePerformance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'goals' | 'reviews'>('goals');

  const { data: goals, isLoading: goalsLoading } = useCurrentGoals(user?.employeeId || '');
  const { data: reviews, isLoading: reviewsLoading } = useReviews(user?.employeeId || '');
  const { data: feedback } = useFeedback(user?.employeeId || '');

  if ((activeTab === 'goals' && goalsLoading && !goals) || 
      (activeTab === 'reviews' && reviewsLoading && !reviews)) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          My Performance
        </h1>
        <p className="text-sm opacity-90 mt-2">
          Goals, reviews, and career development
        </p>
      </div>

      <div className="p-4 space-y-6 -mt-4">
        {/* Tab Navigation */}
        <div className="bg-card rounded-2xl border border-border p-1 shadow-sm flex gap-1">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors touch-manipulation ${
              activeTab === 'goals'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors touch-manipulation ${
              activeTab === 'reviews'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Reviews
          </button>
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            {/* Recent Feedback Card */}
            {feedback && feedback.length > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-1">Recent Feedback</p>
                    <p className="text-sm opacity-90 line-clamp-2">
                      {feedback[0].content}
                    </p>
                    <p className="text-xs opacity-75 mt-2">
                      From {feedback[0].fromName} • {new Date(feedback[0].date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Goals List */}
            {goals && goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active goals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {goals?.map((goal: any) => (
                  <div
                    key={goal.id}
                    className="bg-card rounded-xl border border-border shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {goal.description}
                        </p>
                      </div>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
                        ${goal.status === 'on-track' ? 'bg-green-100 text-green-800' : ''}
                        ${goal.status === 'at-risk' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${goal.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                      `}>
                        {goal.status === 'on-track' && 'On Track'}
                        {goal.status === 'at-risk' && 'At Risk'}
                        {goal.status === 'completed' && 'Completed'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Due Date */}
                    {goal.dueDate && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Due Date</span>
                        <span className="font-medium">
                          {new Date(goal.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* View Details Button */}
                    <button className="mt-3 w-full py-2 text-primary font-medium flex items-center justify-center gap-2 touch-manipulation">
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews && reviews.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews?.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-card rounded-xl border border-border shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {review.reviewPeriod} Review
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.reviewDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Rating */}
                      {review.rating && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                          <Award className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-semibold text-yellow-900">
                            {review.rating}/5
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review Summary */}
                    {review.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {review.summary}
                      </p>
                    )}

                    {/* Key Highlights */}
                    {review.highlights && review.highlights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Key Highlights</p>
                        <div className="space-y-1">
                          {review.highlights.slice(0, 2).map((highlight: string, index: number) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                              <span className="text-muted-foreground">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button className="mt-3 w-full py-2 text-primary font-medium flex items-center justify-center gap-2 touch-manipulation border-t border-border pt-3">
                      View Full Review
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
