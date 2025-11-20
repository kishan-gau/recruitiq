/**
 * Benefit Enrollment Form
 * Enroll an employee in a benefit plan
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useBenefitPlans, useCreateBenefitEnrollment } from '@/hooks/useBenefits';
import type { CoverageLevel } from '@/types/benefits.types';

const COVERAGE_OPTIONS: { value: CoverageLevel; label: string }[] = [
  { value: 'employee-only', label: 'Employee Only' },
  { value: 'employee-spouse', label: 'Employee + Spouse' },
  { value: 'employee-children', label: 'Employee + Children' },
  { value: 'family', label: 'Family' },
];

interface EnrollmentFormData {
  employeeId: string;
  planId: string;
  coverageLevel: CoverageLevel;
  enrollmentDate: string;
  coverageStartDate: string;
  coverageEndDate?: string;
  employeeContribution: number;
  employerContribution: number;
  dependents?: number;
}

export default function EnrollmentForm() {
  const navigate = useNavigate();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const { data: employees = [] } = useEmployees();
  const { data: plans = [] } = useBenefitPlans({ status: 'active' });
  const createMutation = useCreateBenefitEnrollment();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormData>({
    defaultValues: {
      enrollmentDate: new Date().toISOString().split('T')[0],
      coverageStartDate: new Date().toISOString().split('T')[0],
      coverageLevel: 'employee-only',
      employeeContribution: 0,
      employerContribution: 0,
    },
  });

  const selectedPlanId = watch('planId');
  const coverageLevel = watch('coverageLevel');

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp: any) => {
    const searchLower = employeeSearch.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes(searchLower) || emp.email?.toLowerCase().includes(searchLower);
  });

  // Auto-populate contribution amounts when plan is selected
  useEffect(() => {
    if (selectedPlanId) {
      const plan = plans.find((p: any) => p.id === selectedPlanId);
      if (plan) {
        setValue('employeeContribution', plan.employeeContribution || 0);
        setValue('employerContribution', plan.employerContribution || 0);
      }
    }
  }, [selectedPlanId, plans, setValue]);

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
    setValue('employeeId', employee.id);
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    setShowEmployeeList(false);
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      const enrollmentData = {
        employee_id: data.employeeId,
        plan_id: data.planId,
        coverage_level: data.coverageLevel,
        enrollment_date: data.enrollmentDate,
        coverage_start_date: data.coverageStartDate,
        coverage_end_date: data.coverageEndDate || null,
        employee_contribution_amount: data.employeeContribution,
        employer_contribution_amount: data.employerContribution,
        dependents: data.dependents || 0,
      };

      await createMutation.mutateAsync(enrollmentData);
      navigate('/benefits/enrollments');
    } catch (error: any) {
      console.error('Failed to create enrollment:', error);
      alert(error.message || 'Failed to create enrollment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/benefits/enrollments')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Enrollment</h1>
          <p className="text-slate-600 dark:text-slate-400">Enroll an employee in a benefit plan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee Selection */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Employee Selection</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeList(true);
                  }}
                  onFocus={() => setShowEmployeeList(true)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              
              {showEmployeeList && filteredEmployees.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredEmployees.map((employee: any) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => handleEmployeeSelect(employee)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{employee.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="hidden" {...register('employeeId', { required: 'Employee is required' })} />
            {errors.employeeId && (
              <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>
            )}
            {selectedEmployee && (
              <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  Selected: {selectedEmployee.firstName} {selectedEmployee.lastName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Plan Selection */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Benefit Plan</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Plan <span className="text-red-500">*</span>
            </label>
            <select
              {...register('planId', { required: 'Plan is required' })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Select a plan...</option>
              {plans.map((plan: any) => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName} - {plan.category}
                </option>
              ))}
            </select>
            {errors.planId && (
              <p className="text-red-500 text-sm mt-1">{errors.planId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Coverage Level <span className="text-red-500">*</span>
            </label>
            <select
              {...register('coverageLevel', { required: 'Coverage level is required' })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {COVERAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {coverageLevel !== 'employee-only' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Number of Dependents
              </label>
              <input
                type="number"
                min="0"
                {...register('dependents', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Important Dates</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enrollment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('enrollmentDate', { required: 'Enrollment date is required' })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Coverage Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('coverageStartDate', { required: 'Coverage start date is required' })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Coverage End Date (Optional)
              </label>
              <input
                type="date"
                {...register('coverageEndDate')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Cost Information */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cost Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employee Contribution (Monthly) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('employeeContribution', {
                  required: 'Employee contribution is required',
                  valueAsNumber: true,
                  min: 0,
                })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Amount deducted from employee's paycheck
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employer Contribution (Monthly) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('employerContribution', {
                  required: 'Employer contribution is required',
                  valueAsNumber: true,
                  min: 0,
                })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Amount paid by employer
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> A payroll deduction will be automatically created in PayLinQ for the employee contribution amount.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/benefits/enrollments')}
            className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Creating...' : 'Create Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
}
