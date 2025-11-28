import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  ArrowLeft,
  Network,
  Users,
  Filter,
} from 'lucide-react';
import { useDepartmentHierarchy, useOrganizationStructure } from '@/hooks/useDepartments';
import DepartmentTreeNode from '@/components/departments/DepartmentTreeNode';
import OrganizationStructure from '@/components/departments/OrganizationStructure';

type ViewType = 'hierarchy' | 'structure';

export default function DepartmentHierarchy() {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<ViewType>('hierarchy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch data based on view type
  const {
    data: hierarchyData,
    isLoading: hierarchyLoading,
    error: hierarchyError,
  } = useDepartmentHierarchy(selectedDepartmentId || undefined);

  const {
    data: structureData,
    isLoading: structureLoading,
    error: structureError,
  } = useOrganizationStructure();

  const isLoading = viewType === 'hierarchy' ? hierarchyLoading : structureLoading;
  const error = viewType === 'hierarchy' ? hierarchyError : structureError;
  const data = viewType === 'hierarchy' ? (hierarchyData ? [hierarchyData] : []) : structureData;

  // Filter data by search and active status
  const filteredData = data?.filter((dept) => {
    const matchesSearch =
      !searchQuery ||
      dept.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.departmentCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesActive = showInactive || dept.isActive;

    return matchesSearch && matchesActive;
  });

  const handleEmployeeClick = (departmentId: string) => {
    navigate(`/employees?departmentId=${departmentId}`);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/departments"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Department Hierarchy
          </h1>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
            Error Loading Data
          </h3>
          <p className="text-red-700 dark:text-red-400">
            {error.message || 'An error occurred while loading the hierarchy'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/departments"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Department Hierarchy
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Visualize and manage organizational structure
            </p>
          </div>
        </div>
        <Link
          to="/departments/create"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Department
        </Link>
      </div>

      {/* View Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewType('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewType === 'hierarchy'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Single Department
        </button>
        <button
          onClick={() => setViewType('structure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewType === 'structure'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Network className="w-4 h-4" />
          Full Organization
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              Show inactive
            </label>
          </div>
        </div>

        {viewType === 'hierarchy' && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Filter className="w-4 h-4 inline mr-2" />
              View Department
            </label>
            <select
              value={selectedDepartmentId || ''}
              onChange={(e) => setSelectedDepartmentId(e.target.value || null)}
              className="w-full md:w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Departments (Root Level)</option>
              {/* You would populate this with actual department options */}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 spinner" aria-label="Loading hierarchy"></div>
        </div>
      ) : viewType === 'structure' ? (
        <OrganizationStructure departments={filteredData || []} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
          {!filteredData || filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No departments found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first department'}
              </p>
              <Link
                to="/departments/create"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Department
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 p-4">
              {filteredData.map((department) => (
                <DepartmentTreeNode
                  key={department.id}
                  department={department}
                  level={0}
                  onEmployeeClick={handleEmployeeClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {filteredData && filteredData.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {countDepartments(filteredData)} department{countDepartments(filteredData) !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {countEmployees(filteredData)} employee{countEmployees(filteredData) !== 1 ? 's' : ''}
            </span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function countDepartments(depts: any[]): number {
  return depts.reduce((sum, dept) => {
    return sum + 1 + (dept.children ? countDepartments(dept.children) : 0);
  }, 0);
}

function countEmployees(depts: any[]): number {
  return depts.reduce((sum, dept) => {
    const deptCount = dept.employeeCount || 0;
    const childCount = dept.children ? countEmployees(dept.children) : 0;
    return sum + deptCount + childCount;
  }, 0);
}
