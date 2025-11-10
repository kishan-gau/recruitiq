import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Building2, Users, AlertCircle } from 'lucide-react';
import { useDepartment, useDeleteDepartment } from '@/hooks/useDepartments';
import { useState } from 'react';

export default function DepartmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: department, isLoading, error } = useDepartment(id!);
  const deleteMutation = useDeleteDepartment();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/departments');
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading department"></div>
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
              Department Not Found
            </h3>
            <p className="text-red-700 dark:text-red-400 mb-4">
              The department you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/departments')}
              className="text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              ← Back to Departments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/departments')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Back to departments"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {department.departmentName}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  department.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {department.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Department Code: {department.departmentCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/departments/${id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Department Info */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Department Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Department Name
            </label>
            <p className="text-slate-900 dark:text-white">{department.departmentName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Department Code
            </label>
            <p className="text-slate-900 dark:text-white">{department.departmentCode}</p>
          </div>

          {department.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Description
              </label>
              <p className="text-slate-900 dark:text-white">{department.description}</p>
            </div>
          )}

          {department.parentDepartment && (
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Parent Department
              </label>
              <Link
                to={`/departments/${department.parentDepartment.id}`}
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {department.parentDepartment.departmentName}
              </Link>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Status
            </label>
            <p className="text-slate-900 dark:text-white">
              {department.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Employees Section - Placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employees
        </h2>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Employee list coming soon</p>
        </div>
      </div>

      {/* Sub-departments Section - Placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Sub-Departments
        </h2>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Sub-departments list coming soon</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete Department
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <strong>{department.departmentName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
