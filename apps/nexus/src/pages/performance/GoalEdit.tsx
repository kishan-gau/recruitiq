/**
 * Edit Goal Page
 * Page for editing an existing goal
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';
import GoalForm, { type GoalFormData } from '@/components/performance/GoalForm';
import { useGoal, useUpdateGoal } from '@/hooks/usePerformance';
import { useEmployees } from '@/hooks/useEmployees';

export default function GoalEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: goal, isLoading } = useGoal(id);
  const updateMutation = useUpdateGoal();
  const { data: employees = [] } = useEmployees();

  const handleSubmit = async (data: GoalFormData) => {
    if (id) {
      await updateMutation.mutateAsync({
        id,
        updates: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          startDate: data.startDate,
          targetDate: data.targetDate,
          progress: data.progress,
          keyResults: data.keyResults || undefined,
        },
      });

      navigate(`/performance/goals/${id}`);
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
          The goal you're trying to edit doesn't exist or has been deleted.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/performance/goals/${id}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Target size={32} />
            Edit Goal
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update goal for {goal.employee?.firstName} {goal.employee?.lastName}
          </p>
        </div>
      </div>

      {/* Form */}
      <GoalForm
        initialData={goal}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        employees={employees}
      />
    </div>
  );
}

