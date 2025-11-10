/**
 * Benefit Plan Form
 * Create or edit a benefit plan
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { useBenefitPlan, useCreateBenefitPlan, useUpdateBenefitPlan } from '@/hooks/useBenefits';
import type { CreateBenefitPlanDTO, UpdateBenefitPlanDTO, BenefitCategory, BenefitStatus, CoverageLevel } from '@/types/benefits.types';

const CATEGORY_OPTIONS: { value: BenefitCategory; label: string }[] = [
  { value: 'health', label: 'Health Insurance' },
  { value: 'dental', label: 'Dental Insurance' },
  { value: 'vision', label: 'Vision Insurance' },
  { value: 'life', label: 'Life Insurance' },
  { value: 'disability', label: 'Disability Insurance' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

const COVERAGE_OPTIONS: { value: CoverageLevel; label: string }[] = [
  { value: 'employee-only', label: 'Employee Only' },
  { value: 'employee-spouse', label: 'Employee + Spouse' },
  { value: 'employee-children', label: 'Employee + Children' },
  { value: 'family', label: 'Family' },
];

export default function BenefitPlanForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id && id !== 'new';

  const { data: plan, isLoading } = useBenefitPlan(isEditMode ? id! : '');
  const createMutation = useCreateBenefitPlan();
  const updateMutation = useUpdateBenefitPlan();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBenefitPlanDTO & { status?: BenefitStatus }>({
    defaultValues: {
      planName: '',
      planCode: '',
      description: '',
      category: 'health',
      providerName: '',
      employeeContribution: 0,
      employerContribution: 0,
      coverageLevels: ['employee-only'],
      coverageStartDay: 1,
      planYearStart: new Date().toISOString().split('T')[0],
      planYearEnd: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (plan && isEditMode) {
      reset({
        planName: plan.planName,
        planCode: plan.planCode,
        description: plan.description,
        category: plan.category,
        status: plan.status,
        providerName: plan.providerName,
        providerContact: plan.providerContact,
        policyNumber: plan.policyNumber,
        employeeContribution: plan.employeeContribution,
        employerContribution: plan.employerContribution,
        deductible: plan.deductible,
        outOfPocketMax: plan.outOfPocketMax,
        coverageLevels: plan.coverageLevels,
        coverageStartDay: plan.coverageStartDay,
        eligibilityRules: plan.eligibilityRules,
        waitingPeriodDays: plan.waitingPeriodDays,
        planYearStart: plan.planYearStart,
        planYearEnd: plan.planYearEnd,
        summaryDocumentUrl: plan.summaryDocumentUrl,
        handbookUrl: plan.handbookUrl,
      });
    }
  }, [plan, isEditMode, reset]);

  const onSubmit = async (data: CreateBenefitPlanDTO & { status?: BenefitStatus }) => {
    try {
      if (isEditMode) {
        // For updates, we can include status
        const { status, ...createFields } = data;
        const updates: UpdateBenefitPlanDTO = {
          ...createFields,
          ...(status && { status }),
        };
        await updateMutation.mutateAsync({ id: id!, updates });
      } else {
        // For creation, remove status field
        const { status, ...createData } = data;
        await createMutation.mutateAsync(createData);
      }
      navigate('/benefits/plans');
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Loading plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/benefits/plans')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Benefit Plans
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Edit Benefit Plan' : 'Create New Benefit Plan'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('planName', { required: 'Plan name is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.planName && (
                <p className="text-red-500 text-sm mt-1">{errors.planName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plan Code <span className="text-red-500">*</span>
              </label>
              <input
                {...register('planCode', { required: 'Plan code is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.planCode && (
                <p className="text-red-500 text-sm mt-1">{errors.planCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register('category', { required: 'Category is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Provider Information */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Provider Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provider Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('providerName', { required: 'Provider name is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {errors.providerName && (
                <p className="text-red-500 text-sm mt-1">{errors.providerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider Contact</label>
              <input
                {...register('providerContact')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number</label>
              <input
                {...register('policyNumber')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Cost Information */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Cost Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Employee Contribution (Monthly) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('employeeContribution', {
                  required: 'Employee contribution is required',
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Employer Contribution (Monthly) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('employerContribution', {
                  required: 'Employer contribution is required',
                  valueAsNumber: true,
                })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deductible</label>
              <input
                type="number"
                step="0.01"
                {...register('deductible', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Out-of-Pocket Maximum</label>
              <input
                type="number"
                step="0.01"
                {...register('outOfPocketMax', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Coverage Details */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Coverage Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coverage Levels <span className="text-red-500">*</span>
              </label>
              <Controller
                name="coverageLevels"
                control={control}
                rules={{ required: 'Select at least one coverage level' }}
                render={({ field }) => (
                  <div className="space-y-2">
                    {COVERAGE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.value?.includes(option.value)}
                          onChange={(e) => {
                            const current = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...current, option.value]);
                            } else {
                              field.onChange(current.filter((v) => v !== option.value));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
              {errors.coverageLevels && (
                <p className="text-red-500 text-sm mt-1">{errors.coverageLevels.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Coverage Start Day (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                {...register('coverageStartDay', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Eligibility & Enrollment */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Eligibility & Enrollment</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Waiting Period (Days)
              </label>
              <input
                type="number"
                {...register('waitingPeriodDays', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Eligibility Rules</label>
              <textarea
                {...register('eligibilityRules')}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe eligibility requirements..."
              />
            </div>
          </div>
        </div>

        {/* Plan Period */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Plan Period</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plan Year Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('planYearStart', { required: 'Plan year start is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plan Year End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('planYearEnd', { required: 'Plan year end is required' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary Document URL</label>
              <input
                type="url"
                {...register('summaryDocumentUrl')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Handbook URL</label>
              <input
                type="url"
                {...register('handbookUrl')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/benefits/plans')}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
