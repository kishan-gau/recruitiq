import { useParams } from 'react-router-dom';
import { useDepartment } from '@/hooks/useDepartments';
import DepartmentForm from '@/components/DepartmentForm';

export default function DepartmentEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: department, isLoading, error } = useDepartment(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" aria-label="Loading department" />
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
              Department Not Found
            </h3>
            <p className="text-red-700 dark:text-red-400 mb-4">
              The department you're trying to edit doesn't exist or has been deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <DepartmentForm mode="edit" department={department} />
    </div>
  );
}
