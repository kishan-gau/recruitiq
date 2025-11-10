/**
 * Create Payroll Run Form
 * 
 * Multi-step wizard for creating a new payroll run:
 * 1. Basic Information (run name, type, dates)
 * 2. Employee Selection (which employees to include)
 * 3. Review and Confirm
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Calendar, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { useCreatePayrollRun } from '@/hooks/usePayrollRuns';
import { formatDate } from '@/utils/dateFormat';
import type { CreatePayrollRunRequest } from '@recruitiq/types';

interface PayrollRunFormData {
  runNumber: string;
  runName: string;
  runType?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
}

const RUN_TYPES = [
  'Regular',
  'Bonus',
  'Correction',
  'Off-Cycle',
  'Termination',
  'Retro',
];

export default function CreatePayrollRunForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const createPayrollRun = useCreatePayrollRun();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<PayrollRunFormData>({
    mode: 'onChange',
    defaultValues: {
      runType: 'Regular',
    },
  });

  const formData = watch();

  const onSubmit = async (data: PayrollRunFormData) => {
    createPayrollRun.mutate(data as CreatePayrollRunRequest, {
      onSuccess: (newRun) => {
        if (newRun?.id) {
          navigate(`/payroll-runs/${newRun.id}`);
        } else {
          navigate('/payroll-runs');
        }
      },
    });
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCancel = () => {
    navigate('/payroll-runs');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Payroll Run</h1>
        <p className="text-gray-600">Follow the steps to set up a new payroll run</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > 1 ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Basic Information</div>
              <div className="text-xs text-gray-500">Run details and dates</div>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />

          {/* Step 2 */}
          <div className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              2
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Review & Create</div>
              <div className="text-xs text-gray-500">Confirm details</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

              {/* Run Number */}
              <div>
                <label htmlFor="runNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Run Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('runNumber')}
                  type="text"
                  id="runNumber"
                  placeholder="PR-2025-001"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.runNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.runNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.runNumber.message}</p>
                )}
              </div>

              {/* Run Name */}
              <div>
                <label htmlFor="runName" className="block text-sm font-medium text-gray-700 mb-1">
                  Run Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('runName')}
                  type="text"
                  id="runName"
                  placeholder="January 2025 - Semi-Monthly #1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.runName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.runName && (
                  <p className="mt-1 text-sm text-red-600">{errors.runName.message}</p>
                )}
              </div>

              {/* Run Type */}
              <div>
                <label htmlFor="runType" className="block text-sm font-medium text-gray-700 mb-1">
                  Run Type
                </label>
                <select
                  {...register('runType')}
                  id="runType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {RUN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="payPeriodStart"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Pay Period Start <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('payPeriodStart')}
                      type="date"
                      id="payPeriodStart"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.payPeriodStart ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.payPeriodStart && (
                    <p className="mt-1 text-sm text-red-600">{errors.payPeriodStart.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="payPeriodEnd"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Pay Period End <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('payPeriodEnd')}
                      type="date"
                      id="payPeriodEnd"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.payPeriodEnd ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.payPeriodEnd && (
                    <p className="mt-1 text-sm text-red-600">{errors.payPeriodEnd.message}</p>
                  )}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label
                  htmlFor="paymentDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('paymentDate')}
                    type="date"
                    id="paymentDate"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.paymentDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.paymentDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentDate.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h2>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Run Number</dt>
                    <dd className="text-sm text-gray-900">{formData.runNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Run Name</dt>
                    <dd className="text-sm text-gray-900">{formData.runName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Run Type</dt>
                    <dd className="text-sm text-gray-900">{formData.runType || 'Regular'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Payment Date</dt>
                    <dd className="text-sm text-gray-900">
                      {formData.paymentDate ? formatDate(formData.paymentDate) : '-'}
                    </dd>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Pay Period</dt>
                  <dd className="text-sm text-gray-900">
                    {formData.payPeriodStart && formData.payPeriodEnd
                      ? `${formatDate(formData.payPeriodStart)} - ${formatDate(formData.payPeriodEnd)}`
                      : '-'}
                  </dd>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After creating the payroll run, you'll need to calculate it
                  to generate paychecks for employees. The run will be created in "Draft" status.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>

          <div className="flex space-x-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isValid}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createPayrollRun.isPending}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {createPayrollRun.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Payroll Run
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}


