import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateDepartment, useUpdateDepartment, useDepartments } from '@/hooks/useDepartments';
import type { Department } from '@/types/department.types';

const departmentSchema = z.object({
  departmentCode: z.string()
    .min(2, 'Department code must be at least 2 characters')
    .max(10, 'Department code must not exceed 10 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Department code must contain only uppercase letters, numbers, hyphens, and underscores'),
  departmentName: z.string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must not exceed 100 characters'),
  description: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  costCenter: z.string()
    .max(50, 'Cost center must not exceed 50 characters')
    .optional(),
  isActive: z.boolean(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  department?: Department;
  mode: 'create' | 'edit';
}

export default function DepartmentForm({ department, mode }: DepartmentFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  
  // Fetch all departments for parent selection
  const { data: departmentsData } = useDepartments();
  const allDepartments = departmentsData || [];
  
  // Filter out current department and its children from parent options
  const availableParents = mode === 'edit' && department
    ? allDepartments.filter(d => d.id !== department.id && d.parentDepartmentId !== department.id)
    : allDepartments;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      departmentCode: department?.departmentCode || '',
      departmentName: department?.departmentName || '',
      description: department?.description || '',
      parentDepartmentId: department?.parentDepartmentId || '',
      costCenter: department?.costCenter || '',
      isActive: department?.isActive ?? true,
    },
  });

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Convert empty strings to undefined for optional fields
      const submitData = {
        ...data,
        parentDepartmentId: data.parentDepartmentId || undefined,
        costCenter: data.costCenter || undefined,
      };
      
      if (mode === 'create') {
        await createMutation.mutateAsync(submitData);
        navigate('/departments');
      } else if (department) {
        await updateMutation.mutateAsync({
          id: department.id,
          data: submitData,
        });
        navigate(`/departments/${department.id}`);
      }
    } catch (error) {
      // Handle validation errors from API
      const apiError = error as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const errors = apiError.response.data.errors;
        console.error('Validation errors:', errors);
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          name: 'Department Name',
          code: 'Department Code',
          description: 'Description',
          managerId: 'Manager',
          parentDepartmentId: 'Parent Department',
        };
        
        // Show user-friendly error message
        alert(`Validation errors:\n${errors.map((e: any) => `• ${fieldLabels[e.field] || e.field}: ${e.message}`).join('\n')}`);
      } else {
        console.error('Failed to save department:', error);
        alert(apiError.response?.data?.message || 'Failed to save department. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && department) {
      navigate(`/departments/${department.id}`);
    } else {
      navigate('/departments');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-900 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {mode === 'create' ? 'Create Department' : 'Edit Department'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {mode === 'create' 
              ? 'Add a new department to your organization'
              : 'Update department information'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          {/* Department Code */}
          <div>
            <label htmlFor="departmentCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Department Code <span className="text-red-500">*</span>
            </label>
            <input
              id="departmentCode"
              type="text"
              {...register('departmentCode')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., ENG, SALES, HR"
            />
            {errors.departmentCode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.departmentCode.message}
              </p>
            )}
          </div>

          {/* Department Name */}
          <div>
            <label htmlFor="departmentName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              id="departmentName"
              type="text"
              {...register('departmentName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Engineering, Sales, Human Resources"
            />
            {errors.departmentName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.departmentName.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Brief description of the department's responsibilities..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Cost Center */}
          <div>
            <label htmlFor="costCenter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cost Center
            </label>
            <input
              id="costCenter"
              type="text"
              {...register('costCenter')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., CC001, ENG-001, HR-ADMIN"
            />
            {errors.costCenter && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.costCenter.message}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Optional identifier for financial tracking and budgeting
            </p>
          </div>

          {/* Parent Department */}
          <div>
            <label htmlFor="parentDepartmentId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Parent Department
            </label>
            <select
              id="parentDepartmentId"
              {...register('parentDepartmentId')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">None (Top-level department)</option>
              {availableParents.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentCode} - {dept.departmentName}
                </option>
              ))}
            </select>
            {errors.parentDepartmentId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.parentDepartmentId.message}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Select a parent department to create a hierarchy
            </p>
          </div>

          {/* Status */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="isActive" className="font-medium text-slate-700 dark:text-slate-300">
                Active
              </label>
              <p className="text-slate-500 dark:text-slate-400">
                Inactive departments are hidden from most views but can be reactivated
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (mode === 'create' ? 'Creating...' : 'Saving...') 
                : (mode === 'create' ? 'Create Department' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
