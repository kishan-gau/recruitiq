import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { Contract } from '@/types/contract.types';

const contractSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  contractNumber: z.string()
    .min(2, 'Contract number must be at least 2 characters')
    .max(50, 'Contract number must not exceed 50 characters'),
  contractType: z.enum(['permanent', 'fixed_term', 'probation', 'internship', 'contractor']),
  status: z.enum(['draft', 'active', 'pending', 'expired', 'terminated']),
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must not exceed 200 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  salary: z.number().optional(),
  currency: z.string().max(10).optional(),
  paymentFrequency: z.enum(['hourly', 'daily', 'weekly', 'bi_weekly', 'monthly', 'annually']).optional(),
  hoursPerWeek: z.number().optional(),
  location: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface ContractFormProps {
  contract?: Contract;
  mode: 'create' | 'edit';
}

export default function ContractForm({ contract, mode }: ContractFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();

  // Fetch employees for dropdown
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees', 'list'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: any[] }>('/employees');
      return data.data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    mode: 'onBlur',
    defaultValues: {
      employeeId: contract?.employeeId || '',
      contractNumber: contract?.contractNumber || '',
      contractType: contract?.contractType || 'permanent',
      status: contract?.status || 'draft',
      title: contract?.title || '',
      startDate: contract?.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract?.endDate ? contract.endDate.split('T')[0] : '',
      probationEndDate: contract?.probationEndDate ? contract.probationEndDate.split('T')[0] : '',
      salary: contract?.salary || undefined,
      currency: contract?.currency || 'USD',
      paymentFrequency: contract?.paymentFrequency || 'monthly',
      hoursPerWeek: contract?.hoursPerWeek || undefined,
      location: contract?.location || '',
      department: contract?.department || '',
      position: contract?.position || '',
      notes: contract?.notes || '',
      termsAndConditions: contract?.termsAndConditions || '',
    },
  });

  const contractType = watch('contractType');

  const onSubmit = async (data: ContractFormData) => {
    try {
      const submitData = {
        ...data,
        endDate: data.endDate || undefined,
        probationEndDate: data.probationEndDate || undefined,
        location: data.location || undefined,
        department: data.department || undefined,
        position: data.position || undefined,
        notes: data.notes || undefined,
        termsAndConditions: data.termsAndConditions || undefined,
      };

      if (mode === 'create') {
        const newContract = await createMutation.mutateAsync(submitData as any);
        navigate(`/contracts/${newContract.id}`);
      } else if (contract) {
        await updateMutation.mutateAsync({
          id: contract.id,
          updates: submitData as any,
        });
        navigate(`/contracts/${contract.id}`);
      }
    } catch (error) {
      // Handle validation errors from API
      const apiError = error as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const errors = apiError.response.data.errors;
        console.error('Validation errors:', errors);
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          employeeId: 'Employee',
          contractType: 'Contract Type',
          startDate: 'Start Date',
          endDate: 'End Date',
          salary: 'Salary',
          currency: 'Currency',
          workingHours: 'Working Hours',
          department: 'Department',
          position: 'Position',
          terms: 'Terms and Conditions',
        };
        
        // Show user-friendly error message
        alert(`Validation errors:\n${errors.map((e: any) => `• ${fieldLabels[e.field] || e.field}: ${e.message}`).join('\n')}`);
      } else {
        console.error('Failed to save contract:', error);
        alert(apiError.response?.data?.message || 'Failed to save contract. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && contract) {
      navigate(`/contracts/${contract.id}`);
    } else {
      navigate('/contracts');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              {...register('employeeId')}
              disabled={mode === 'edit'}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-50"
            >
              <option value="">Select employee</option>
              {employeesResponse?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                </option>
              ))}
            </select>
            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.employeeId.message}
              </p>
            )}
          </div>

          {/* Contract Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contract Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('contractNumber')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., CNT-2024-001"
            />
            {errors.contractNumber && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.contractNumber.message}
              </p>
            )}
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contract Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('contractType')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="permanent">Permanent</option>
              <option value="fixed_term">Fixed Term</option>
              <option value="probation">Probation</option>
              <option value="internship">Internship</option>
              <option value="contractor">Contractor</option>
            </select>
            {errors.contractType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.contractType.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.status.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contract Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Senior Software Engineer Employment Agreement"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contract Dates */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Contract Period
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              End Date {contractType === 'fixed_term' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.endDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Leave empty for permanent contracts
            </p>
          </div>

          {/* Probation End Date */}
          {contractType === 'probation' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Probation End Date
              </label>
              <input
                type="date"
                {...register('probationEndDate')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.probationEndDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.probationEndDate.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compensation */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Compensation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Salary
            </label>
            <input
              type="number"
              step="0.01"
              {...register('salary')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="50000"
            />
            {errors.salary && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.salary.message}
              </p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Currency
            </label>
            <input
              type="text"
              {...register('currency')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="USD"
              maxLength={10}
            />
            {errors.currency && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.currency.message}
              </p>
            )}
          </div>

          {/* Payment Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Frequency
            </label>
            <select
              {...register('paymentFrequency')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select frequency</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi_weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
            {errors.paymentFrequency && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.paymentFrequency.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Work Details */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Work Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Position
            </label>
            <input
              type="text"
              {...register('position')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Senior Software Engineer"
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.position.message}
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Department
            </label>
            <input
              type="text"
              {...register('department')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Engineering"
            />
            {errors.department && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.department.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <input
              type="text"
              {...register('location')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="New York Office"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Hours Per Week */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Hours Per Week
            </label>
            <input
              type="number"
              step="0.5"
              {...register('hoursPerWeek')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="40"
            />
            {errors.hoursPerWeek && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.hoursPerWeek.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Additional Information
        </h2>
        <div className="space-y-6">
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              {...register('notes')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Additional notes about this contract..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Terms and Conditions
            </label>
            <textarea
              rows={6}
              {...register('termsAndConditions')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Contract terms and conditions..."
            />
            {errors.termsAndConditions && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.termsAndConditions.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Contract' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
