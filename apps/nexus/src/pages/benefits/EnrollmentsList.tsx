/**
 * Enrollments List Page
 * Browse and manage employee benefit enrollments
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, User, Calendar } from 'lucide-react';
import { useBenefitEnrollments } from '@/hooks/useBenefits';
import type { EnrollmentStatus, BenefitCategory, CoverageLevel } from '@/types/benefits.types';

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  declined: 'bg-red-100 text-red-800',
};

const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  health: 'Health',
  dental: 'Dental',
  vision: 'Vision',
  life: 'Life',
  disability: 'Disability',
  retirement: 'Retirement',
  wellness: 'Wellness',
  other: 'Other',
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  'employee-only': 'Employee Only',
  'employee-spouse': 'Employee + Spouse',
  'employee-children': 'Employee + Children',
  'family': 'Family',
};

export default function EnrollmentsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<BenefitCategory | ''>('');

  const filters = {
    ...(statusFilter && { enrollmentStatus: statusFilter }),
    ...(categoryFilter && { category: categoryFilter }),
  };

  const { data: enrollments = [], isLoading } = useBenefitEnrollments(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  // Client-side search by employee name or plan name
  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch =
      searchQuery === '' ||
      enrollment.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.plan?.planName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benefit Enrollments</h1>
          <p className="text-gray-600">Manage employee benefit enrollments</p>
        </div>
        <Link
          to="/benefits/enrollments/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Enrollment
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search enrollments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="declined">Declined</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as BenefitCategory | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enrollments List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading enrollments...</p>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No enrollments found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coverage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEnrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.employee?.firstName} {enrollment.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{enrollment.employee?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{enrollment.plan?.planName}</div>
                      <div className="text-sm text-gray-500">
                        {enrollment.plan?.category && CATEGORY_LABELS[enrollment.plan.category as BenefitCategory]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {COVERAGE_LABELS[enrollment.coverageLevel]}
                      </span>
                      {enrollment.dependents && enrollment.dependents.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {enrollment.dependents.length} dependent{enrollment.dependents.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[enrollment.enrollmentStatus]}`}>
                        {enrollment.enrollmentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(enrollment.coverageStartDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${enrollment.employeeContribution.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">per month</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        to={`/benefits/enrollments/${enrollment.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

