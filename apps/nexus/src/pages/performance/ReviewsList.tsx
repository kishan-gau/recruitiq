/**
 * Performance Reviews List Page
 * Displays all performance reviews with filtering and search
 */

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Award,
  Filter,
  Plus,
  Search,
  User,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { usePerformanceReviews } from '@/hooks/usePerformance';
import type { ReviewStatus, ReviewType } from '@/types/performance.types';

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

export default function ReviewsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Get filters from URL
  const statusFilter = searchParams.get('status') as ReviewStatus | null;
  const typeFilter = searchParams.get('type') as ReviewType | null;

  // Fetch reviews
  const { data: reviews = [], isLoading } = usePerformanceReviews({
    status: statusFilter || undefined,
    reviewType: typeFilter || undefined,
  });

  // Filter by search query
  const filteredReviews = reviews.filter((review) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      review.employee?.firstName.toLowerCase().includes(searchLower) ||
      review.employee?.lastName.toLowerCase().includes(searchLower) ||
      review.reviewer?.firstName.toLowerCase().includes(searchLower) ||
      review.reviewer?.lastName.toLowerCase().includes(searchLower) ||
      REVIEW_TYPE_LABELS[review.reviewType].toLowerCase().includes(searchLower)
    );
  });

  // Handle filter changes
  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const handleTypeFilterChange = (type: string) => {
    if (type === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', type);
    }
    setSearchParams(searchParams);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Reviews</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage employee performance reviews and evaluations
          </p>
        </div>
        <Link
          to="/performance/reviews/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          New Review
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter || 'all'}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter || 'all'}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="annual">Annual</option>
              <option value="mid-year">Mid-Year</option>
              <option value="quarterly">Quarterly</option>
              <option value="probation">Probation</option>
              <option value="360">360°</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No reviews found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter || typeFilter
              ? 'Try adjusting your filters'
              : 'Get started by creating a new performance review'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reviewer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReviews.map((review) => {
                  const StatusIcon = STATUS_CONFIG[review.status].icon;
                  return (
                    <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {review.employee?.firstName} {review.employee?.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {review.employee?.jobTitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {review.reviewer?.firstName} {review.reviewer?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {REVIEW_TYPE_LABELS[review.reviewType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                          <Calendar size={14} />
                          {format(new Date(review.reviewPeriodStart), 'MMM d')} -{' '}
                          {format(new Date(review.reviewPeriodEnd), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {format(new Date(review.dueDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {review.overallRating ? (
                          <div className="flex items-center gap-1">
                            <Award size={16} className="text-yellow-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {review.overallRating}/5
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_CONFIG[review.status].className
                          }`}
                        >
                          <StatusIcon size={14} />
                          {STATUS_CONFIG[review.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/performance/reviews/${review.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

