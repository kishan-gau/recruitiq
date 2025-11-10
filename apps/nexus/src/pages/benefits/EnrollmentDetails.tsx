/**
 * Benefit Enrollment Details Page
 * View detailed information about an employee's benefit enrollment
 */

import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, DollarSign, Users as UsersIcon, XCircle } from 'lucide-react';
import { useBenefitEnrollment, useCancelBenefitEnrollment } from '@/hooks/useBenefits';
import type { EnrollmentStatus, CoverageLevel } from '@/types/benefits.types';

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  declined: 'bg-red-100 text-red-800',
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  'employee-only': 'Employee Only',
  'employee-spouse': 'Employee + Spouse',
  'employee-children': 'Employee + Children',
  'family': 'Family',
};

export default function EnrollmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: enrollment, isLoading } = useBenefitEnrollment(id!);
  const cancelMutation = useCancelBenefitEnrollment();

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this enrollment?')) return;
    
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      await cancelMutation.mutateAsync({ id: id!, reason });
      navigate('/benefits/enrollments');
    } catch (error) {
      console.error('Failed to cancel enrollment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading enrollment details...</p>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Enrollment not found</p>
        <Link to="/benefits/enrollments" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Back to Enrollments
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
            to="/benefits/enrollments"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enrollment Details</h1>
            <p className="text-gray-600">
              {enrollment.employee?.firstName} {enrollment.employee?.lastName} - {enrollment.plan?.planName}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[enrollment.enrollmentStatus]}`}>
            {enrollment.enrollmentStatus}
          </span>
        </div>
        {enrollment.enrollmentStatus === 'active' && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" />
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Enrollment'}
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Coverage Level</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {COVERAGE_LABELS[enrollment.coverageLevel]}
          </p>
          {enrollment.dependents && enrollment.dependents.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {enrollment.dependents.length} dependent{enrollment.dependents.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Monthly Cost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${enrollment.employeeContribution.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">Employee contribution</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Coverage Start</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(enrollment.coverageStartDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Employee Information</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {enrollment.employee?.firstName} {enrollment.employee?.lastName}
                </p>
                <p className="text-sm text-gray-600">{enrollment.employee?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Plan Information</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Plan Name</label>
              <p className="font-medium text-gray-900">{enrollment.plan?.planName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Plan Code</label>
              <p className="text-gray-900">{enrollment.plan?.planCode}</p>
            </div>
          </div>
        </div>

        {/* Enrollment Dates */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Important Dates</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Enrollment Date</span>
              <span className="font-medium text-gray-900">
                {new Date(enrollment.enrollmentDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Coverage Start</span>
              <span className="font-medium text-gray-900">
                {new Date(enrollment.coverageStartDate).toLocaleDateString()}
              </span>
            </div>
            {enrollment.coverageEndDate && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Coverage End</span>
                <span className="font-medium text-gray-900">
                  {new Date(enrollment.coverageEndDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cost Breakdown</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Employee Contribution</span>
              <span className="font-semibold text-gray-900">${enrollment.employeeContribution.toFixed(2)}/month</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Employer Contribution</span>
              <span className="font-semibold text-gray-900">${enrollment.employerContribution.toFixed(2)}/month</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Total Cost</span>
              <span className="font-semibold text-gray-900">
                ${(enrollment.employeeContribution + enrollment.employerContribution).toFixed(2)}/month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dependents */}
      {enrollment.dependents && enrollment.dependents.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dependents ({enrollment.dependents.length})</h2>
          <p className="text-sm text-gray-600">
            {enrollment.dependents.length} dependent{enrollment.dependents.length > 1 ? 's' : ''} enrolled
          </p>
        </div>
      )}

      {/* Cancellation Info */}
      {enrollment.enrollmentStatus === 'cancelled' && enrollment.cancellationReason && (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Cancellation Information</h2>
          <p className="text-sm text-red-800">
            <strong>Reason:</strong> {enrollment.cancellationReason}
          </p>
        </div>
      )}
    </div>
  );
}
