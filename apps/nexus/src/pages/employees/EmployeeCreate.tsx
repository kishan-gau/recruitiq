import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EmployeeForm from '@/components/forms/EmployeeForm';
import { useCreateEmployee, useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useLocations } from '@/hooks/useLocations';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { CreateEmployeeDTO } from '@/types/employee.types';

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: departments = [] } = useDepartments();
  const { data: locations = [] } = useLocations();
  const { data: potentialManagers = [] } = useEmployees();
  
  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const handleSubmit = (data: CreateEmployeeDTO) => {
    createEmployee(data, {
      onSuccess: (newEmployee) => {
        toast.success('Employee created successfully');
        navigate(`/employees/${newEmployee.id}`);
      },
      onError: (error: any) => {
        handleApiError(error, {
          toast,
          defaultMessage: 'Failed to create employee',
        });
      },
    });
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  // Filter out terminated employees from potential managers list
  const managers = potentialManagers
    ?.filter((emp) => emp.employmentStatus === 'active')
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
            onClick={() => navigate('/employees')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Employees
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Employee
          </h1>
        </div>
      </div>

      {/* Form */}
      <EmployeeForm
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
