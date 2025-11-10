/**
 * Create Compensation Form
 * 
 * Form to create or update employee compensation with:
 * - Compensation type selection (hourly, salary, commission, bonus)
 * - Amount and rate configuration
 * - Effective date management
 * - Auto-calculations for derived amounts
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  DollarSign,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Save,
  Calculator,
} from 'lucide-react';
import { useCreateCompensation } from '@/hooks/useCompensation';
import type { 
  CreateCompensationRequest, 
  CompensationType,
  Currency,
} from '@recruitiq/types';

type FormData = {
  employeeId: string;
  compensationType: CompensationType;
  amount: number;
  hourlyRate?: number;
  overtimeRate?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  currency: Currency;
  changeReason?: string;
};

const COMPENSATION_TYPES: { value: CompensationType; label: string; description: string }[] = [
  {
    value: 'hourly',
    label: 'Hourly',
    description: 'Paid by the hour with overtime rates',
  },
  {
    value: 'salary',
    label: 'Salary',
    description: 'Fixed annual salary',
  },
  {
    value: 'commission',
    label: 'Commission',
    description: 'Performance-based commission',
  },
  {
    value: 'bonus',
    label: 'Bonus',
    description: 'One-time bonus payment',
  },
];

const DEFAULT_OVERTIME_RATE = 1.5;
const WORK_HOURS_PER_YEAR = 2080; // 40 hours/week * 52 weeks

export default function CreateCompensationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId') || '';

  const [selectedType, setSelectedType] = useState<CompensationType>('hourly');
  const [calculatedAnnual, setCalculatedAnnual] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      employeeId,
      compensationType: 'hourly',
      currency: 'SRD',
      overtimeRate: DEFAULT_OVERTIME_RATE,
      effectiveFrom: new Date().toISOString().split('T')[0],
    },
  });

  const createMutation = useCreateCompensation();

  // Watch fields for calculations
  const compensationType = watch('compensationType');
  const amount = watch('amount');
  const hourlyRate = watch('hourlyRate');

  // Auto-calculate annual amount from hourly rate
  useEffect(() => {
    if (compensationType === 'hourly' && hourlyRate && hourlyRate > 0) {
      const annual = hourlyRate * WORK_HOURS_PER_YEAR;
      setCalculatedAnnual(annual);
    } else if (compensationType === 'salary' && amount && amount > 0) {
      setCalculatedAnnual(amount);
    } else {
      setCalculatedAnnual(null);
    }
  }, [compensationType, amount, hourlyRate]);

  // Sync compensation type
  useEffect(() => {
    setSelectedType(compensationType);
  }, [compensationType]);

  const onSubmit = async (data: FormData) => {
    if (!data.employeeId) {
      alert('Employee ID is required');
      return;
    }

    try {
      const payload: CreateCompensationRequest = {
        employeeId: data.employeeId,
        compensationType: data.compensationType,
        amount: data.amount,
        hourlyRate: data.hourlyRate,
        overtimeRate: data.overtimeRate,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        currency: data.currency,
      };

      await createMutation.mutateAsync(payload);
      navigate(`/compensation?employeeId=${data.employeeId}`);
    } catch (error) {
      console.error('Failed to create compensation:', error);
    }
  };

  const handleCancel = () => {
    if (employeeId) {
      navigate(`/compensation?employeeId=${employeeId}`);
    } else {
      navigate('/employees');
    }
  };

  if (!employeeId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-700 mb-4">Employee ID is required</p>
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Change Compensation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new compensation record for the employee
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Compensation Type Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation Type</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMPENSATION_TYPES.map((type) => (
              <label
                key={type.value}
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register('compensationType', { required: true })}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{type.label}</span>
                  {selectedType === type.value && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">{type.description}</span>
              </label>
            ))}
          </div>
          {errors.compensationType && (
            <p className="mt-2 text-sm text-red-600">Please select a compensation type</p>
          )}
        </div>

        {/* Amount Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
            Compensation Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                {...register('currency', { required: 'Currency is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="SRD">SRD - Surinamese Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>

            {/* Primary Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedType === 'hourly' ? 'Base Hourly Rate' : 'Amount'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Hourly Rate (for hourly type) */}
            {selectedType === 'hourly' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regular Hourly Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('hourlyRate', {
                      min: { value: 0, message: 'Rate must be positive' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {errors.hourlyRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.hourlyRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime Rate Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('overtimeRate', {
                      min: { value: 1, message: 'Must be at least 1x' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="1.5"
                  />
                  {errors.overtimeRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.overtimeRate.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Standard overtime is 1.5x (time and a half)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Calculated Annual Amount */}
          {calculatedAnnual && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Calculator className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Estimated Annual Salary</p>
                  <p className="text-lg font-bold text-blue-900">
                    {watch('currency')} {calculatedAnnual.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  {selectedType === 'hourly' && (
                    <p className="text-xs text-blue-700 mt-1">
                      Based on {WORK_HOURS_PER_YEAR} hours/year (40 hrs/week × 52 weeks)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Effective Dates */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Effective Dates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('effectiveFrom', {
                  required: 'Effective from date is required',
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.effectiveFrom && (
                <p className="mt-1 text-sm text-red-600">{errors.effectiveFrom.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective To (Optional)
              </label>
              <input
                type="date"
                {...register('effectiveTo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for ongoing compensation
              </p>
            </div>
          </div>
        </div>

        {/* Change Reason */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Reason</h2>
          <textarea
            {...register('changeReason')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Enter reason for compensation change (e.g., annual review, promotion, cost of living adjustment)"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: Document why this compensation change is being made
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Compensation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


