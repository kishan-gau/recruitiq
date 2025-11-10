/**
 * Create Goal Page
 * Page for creating a new goal
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GoalForm, { type GoalFormData } from '@/components/performance/GoalForm';
import { useCreateGoal } from '@/hooks/usePerformance';
import { useEmployees } from '@/hooks/useEmployees';

export default function GoalCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateGoal();
  const { data: employees = [] } = useEmployees();

  const handleSubmit = async (data: GoalFormData) => {
    const result = await createMutation.mutateAsync({
      ...data,
      keyResults: data.keyResults || undefined,
    });

    navigate(`/performance/goals/${result.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/performance/goals')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Goals
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Goal
          </h1>
        </div>
      </div>

      {/* Form */}
      <GoalForm
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        employees={employees}
      />
    </div>
  );
}
