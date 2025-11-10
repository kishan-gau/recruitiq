/**
 * Goal Details Page
 * Displays detailed information about a single goal
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Target,
  User,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react';
import {
  useGoal,
  useDeleteGoal,
  useCompleteGoal,
} from '@/hooks/usePerformance';
import type { GoalStatus, GoalPriority, GoalCategory } from '@/types/performance.types';

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  performance: 'Performance',
  development: 'Development',
  project: 'Project',
  behavior: 'Behavior',
  other: 'Other',
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: FileText,
  },
  active: {
    label: 'Active',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
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
  overdue: {
    label: 'Overdue',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: AlertCircle,
  },
};

const PRIORITY_CONFIG: Record<GoalPriority, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

export default function GoalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: goal, isLoading } = useGoal(id);
  const deleteMutation = useDeleteGoal();
  const completeMutation = useCompleteGoal();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate('/performance/goals');
    }
  };

  const handleComplete = async () => {
    if (id) {
      await completeMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Goal not found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The goal you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/performance/goals"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <ArrowLeft size={20} />
          Back to Goals
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[goal.status].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/performance/goals"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{goal.title}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {CATEGORY_LABELS[goal.category]} Goal
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {goal.status === 'active' && goal.progress === 100 && (
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Mark Complete
            </button>
          )}
          {(goal.status === 'draft' || goal.status === 'active') && (
            <Link
              to={`/performance/goals/${goal.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Edit size={20} />
              Edit
            </Link>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Goal Information</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    STATUS_CONFIG[goal.status].className
                  }`}
                >
                  <StatusIcon size={16} />
                  {STATUS_CONFIG[goal.status].label}
                </span>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    PRIORITY_CONFIG[goal.priority].className
                  }`}
                >
                  {PRIORITY_CONFIG[goal.priority].label} Priority
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{goal.progress}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <Calendar size={16} />
                    {format(new Date(goal.startDate), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Target Date</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <Calendar size={16} />
                    {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                  </div>
                </div>
                {goal.completedDate && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(new Date(goal.completedDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {goal.description}
            </p>
          </div>

          {/* Key Results */}
          {goal.keyResults && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Results / Milestones</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {goal.keyResults}
              </p>
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
                  {goal.employee?.firstName} {goal.employee?.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {goal.employee?.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {goal.employee?.jobTitle}
                </p>
                {goal.employee?.department && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {goal.employee.department.departmentName}
                  </p>
                )}
                <Link
                  to={`/employees/${goal.employeeId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-block"
                >
                  View Profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Category</p>
                <p className="font-medium text-gray-900 dark:text-white">{CATEGORY_LABELS[goal.category]}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(goal.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(goal.updatedAt), 'MMM d, yyyy')}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Goal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this goal? This action cannot be undone.
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

