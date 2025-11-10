/**
 * Benefit Plan Details Page
 * View detailed information about a specific benefit plan
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Users, FileText, DollarSign } from 'lucide-react';
import { useBenefitPlan, useEnrollmentSummary } from '@/hooks/useBenefits';
import type { BenefitCategory, BenefitStatus, CoverageLevel } from '@/types/benefits.types';

const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  health: 'Health Insurance',
  dental: 'Dental Insurance',
  vision: 'Vision Insurance',
  life: 'Life Insurance',
  disability: 'Disability Insurance',
  retirement: 'Retirement',
  wellness: 'Wellness',
  other: 'Other',
};

const STATUS_COLORS: Record<BenefitStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  'employee-only': 'Employee Only',
  'employee-spouse': 'Employee + Spouse',
  'employee-children': 'Employee + Children',
  'family': 'Family',
};

export default function BenefitPlanDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading } = useBenefitPlan(id!);
  const { data: enrollmentSummary } = useEnrollmentSummary(id!);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading plan details...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Plan not found</p>
        <Link to="/benefits/plans" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Back to Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/benefits/plans"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.planName}</h1>
            <p className="text-gray-600">{plan.planCode}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
            {plan.status}
          </span>
        </div>
        <Link
          to={`/benefits/plans/${id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Edit className="w-5 h-5" />
          Edit Plan
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Enrollments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {enrollmentSummary?.enrollmentCount || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Monthly Cost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${plan.employeeContribution.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">per employee</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Average Cost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${enrollmentSummary?.averageCostPerEnrollment.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-600">per enrollment</p>
        </div>
      </div>

      {/* Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Plan Information</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Category</label>
              <p className="font-medium text-gray-900">{CATEGORY_LABELS[plan.category]}</p>
            </div>

            {plan.description && (
              <div>
                <label className="text-sm text-gray-600">Description</label>
                <p className="text-gray-900">{plan.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600">Coverage Levels</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {plan.coverageLevels.map((level) => (
                  <span
                    key={level}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {COVERAGE_LABELS[level]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Provider Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Provider Information</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Provider Name</label>
              <p className="font-medium text-gray-900">{plan.providerName}</p>
            </div>

            {plan.providerContact && (
              <div>
                <label className="text-sm text-gray-600">Contact</label>
                <p className="text-gray-900">{plan.providerContact}</p>
              </div>
            )}

            {plan.policyNumber && (
              <div>
                <label className="text-sm text-gray-600">Policy Number</label>
                <p className="font-medium text-gray-900">{plan.policyNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cost Breakdown</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Employee Contribution</span>
              <span className="font-semibold text-gray-900">${plan.employeeContribution.toFixed(2)}/month</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Employer Contribution</span>
              <span className="font-semibold text-gray-900">${plan.employerContribution.toFixed(2)}/month</span>
            </div>
            {plan.deductible && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Deductible</span>
                <span className="font-semibold text-gray-900">${plan.deductible.toFixed(2)}</span>
              </div>
            )}
            {plan.outOfPocketMax && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Out-of-Pocket Maximum</span>
                <span className="font-semibold text-gray-900">${plan.outOfPocketMax.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Eligibility & Enrollment</h2>
          
          <div className="space-y-3">
            {plan.waitingPeriodDays && (
              <div>
                <label className="text-sm text-gray-600">Waiting Period</label>
                <p className="font-medium text-gray-900">{plan.waitingPeriodDays} days</p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600">Coverage Start Day</label>
              <p className="font-medium text-gray-900">Day {plan.coverageStartDay} of the month</p>
            </div>

            {plan.eligibilityRules && (
              <div>
                <label className="text-sm text-gray-600">Eligibility Rules</label>
                <p className="text-gray-900">{plan.eligibilityRules}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents */}
      {(plan.summaryDocumentUrl || plan.handbookUrl) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Documents</h2>
          <div className="flex gap-4">
            {plan.summaryDocumentUrl && (
              <a
                href={plan.summaryDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                Plan Summary
              </a>
            )}
            {plan.handbookUrl && (
              <a
                href={plan.handbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                Employee Handbook
              </a>
            )}
          </div>
        </div>
      )}

      {/* Plan Year Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Year</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Start Date</p>
            <p className="text-lg font-medium text-gray-900">{new Date(plan.planYearStart).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">End Date</p>
            <p className="text-lg font-medium text-gray-900">{new Date(plan.planYearEnd).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Plan Year</p>
            <p className="text-lg font-medium text-gray-900">{new Date(plan.planYearStart).getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

