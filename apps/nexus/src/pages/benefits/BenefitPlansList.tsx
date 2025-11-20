/**
 * Benefit Plans List Page
 * Browse and manage available benefit plans
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useBenefitPlans } from '@/hooks/useBenefits';
import type { BenefitCategory, BenefitStatus } from '@/types/benefits.types';

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
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function BenefitPlansList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BenefitCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<BenefitStatus | ''>('');

  const filters = {
    ...(categoryFilter && { category: categoryFilter }),
    ...(statusFilter && { status: statusFilter }),
  };

  const { data: plans = [], isLoading } = useBenefitPlans(Object.keys(filters).length > 0 ? filters : undefined);

  // Client-side search
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      searchQuery === '' ||
      plan.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Benefit Plans</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage available benefit plans for employees</p>
        </div>
        <Link
          to="/benefits/plans/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Plan
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as BenefitCategory | '')}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BenefitStatus | '')}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">No benefit plans found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPlans.map((plan) => (
            <Link
              key={plan.id}
              to={`/benefits/plans/${plan.id}`}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.planName}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{plan.planCode}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
                  {plan.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Category:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{CATEGORY_LABELS[plan.category]}</span>
                </div>
                {plan.providerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Provider:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{plan.providerName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Employee Cost:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ${plan.employeeContribution.toFixed(2)}/month
                  </span>
                </div>
                {plan.description && (
                  <p className="text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">{plan.description}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Plan Year: {new Date(plan.planYearStart).getFullYear()}</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">View Details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

