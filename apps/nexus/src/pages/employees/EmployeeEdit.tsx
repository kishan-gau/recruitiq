import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import EmployeeForm from '@/components/forms/EmployeeForm';
import { useEmployee, useUpdateEmployee, useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useLocations } from '@/hooks/useLocations';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { UpdateEmployeeDTO } from '@/types/employee.types';

export default function EmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: employee, isLoading: isLoadingEmployee, error } = useEmployee(id!);
  const { data: departments = [] } = useDepartments();
  const { data: locations = [] } = useLocations();
  const { data: potentialManagers = [] } = useEmployees();
  
  const { mutate: updateEmployee, isPending } = useUpdateEmployee();

  if (isLoadingEmployee) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading employee"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">
              Employee Not Found
            </h3>
            <p className="text-red-700 dark:text-red-400">
              {error?.message || 'The requested employee could not be found.'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate('/employees')}
            className="text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            ← Back to Employees
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: UpdateEmployeeDTO) => {
    updateEmployee(
      { id: employee.id, data },
      {
        onSuccess: () => {
          toast.success('Employee updated successfully');
          navigate(`/employees/${employee.id}`);
        },
        onError: (error: any) => {
          handleApiError(error, {
            toast,
            defaultMessage: 'Failed to update employee',
          });
        },
      }
    );
  };

  const handleCancel = () => {
    navigate(`/employees/${employee.id}`);
  };

  // Filter out the current employee and terminated employees from potential managers list
  const managers = potentialManagers
    ?.filter((emp) => emp.id !== employee.id && emp.employmentStatus === 'active')
    .map((emp) => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/employees/${employee.id}`)}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Employee
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Edit Employee: {employee.firstName} {employee.lastName}
          </h1>
        </div>
      </div>

      {/* Form */}
      <EmployeeForm
        initialData={employee}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isPending}
        departments={departments}
        locations={locations}
        managers={managers}
      />
    </div>
  );
}
