/**
 * VIP Employees Page
 * Displays list of all VIP employees with management options
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Search, Filter, Shield, ShieldOff, Users, Plus, TrendingUp } from 'lucide-react';
import { useVIPEmployees, useVIPCount } from '@/hooks/useVIPEmployees';
import { VIPEmployeeCard } from '@/components/vip/VIPEmployeeCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { VIPEmployeeFilters, RestrictionLevel } from '@/types/vipEmployee.types';

export default function VIPEmployeesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<VIPEmployeeFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch VIP employees and count
  const { data: vipData, isLoading, error } = useVIPEmployees(filters);
  const { data: countData } = useVIPCount();

  // Filter employees by search query (client-side)
  const filteredEmployees = vipData?.vipEmployees?.filter((employee) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(query) ||
      employee.lastName?.toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query) ||
      employee.employeeNumber?.toLowerCase().includes(query) ||
      employee.jobTitle?.toLowerCase().includes(query)
    );
  });

  const handleManageVIP = (employeeId: string) => {
    navigate(`/vip-employees/${employeeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">VIP Employees</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Manage VIP status and access restrictions
              </p>
            </div>
          </div>
        </div>
        <Link to="/employees">
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-yellow-600 transition-colors">
            <Plus className="w-5 h-5 mr-2" />
            Add VIP Employee
          </button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {countData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300">Total VIP</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {countData.totalVip}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">Restricted</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {countData.restricted}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <ShieldOff className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Unrestricted</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {countData.unrestricted}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search VIP employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Restriction Status
              </label>
              <select
                value={filters.isRestricted === undefined ? '' : String(filters.isRestricted)}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    isRestricted: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All VIP Employees</option>
                <option value="true">Restricted Only</option>
                <option value="false">Unrestricted Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Restriction Level
              </label>
              <select
                value={filters.restrictionLevel || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    restrictionLevel: e.target.value as RestrictionLevel | undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Levels</option>
                <option value="none">None</option>
                <option value="financial">Financial</option>
                <option value="full">Full</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && (!filteredEmployees || filteredEmployees.length === 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-12 text-center">
          <Crown className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No VIP Employees
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'No employees have been marked as VIP yet'}
          </p>
          <Link to="/employees">
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-yellow-600 transition-colors">
              <Users className="w-5 h-5 mr-2" />
              View All Employees
            </button>
          </Link>
        </div>
      )}

      {!isLoading && !error && filteredEmployees && filteredEmployees.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <VIPEmployeeCard
                key={employee.id}
                employee={employee}
                onManage={handleManageVIP}
              />
            ))}
          </div>

          {/* Results count */}
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredEmployees.length} of {vipData?.vipEmployees?.length || 0} VIP employees
          </div>
        </>
      )}
    </div>
  );
}
