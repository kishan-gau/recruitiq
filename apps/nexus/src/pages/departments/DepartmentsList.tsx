import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { handleApiError } from '@/utils/errorHandler';
import type { DepartmentHierarchy } from '@/types/department.types';

export default function DepartmentsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveFilter, setShowInactiveFilter] = useState<boolean | undefined>(undefined);

  const { data: departments, isLoading, error } = useDepartments({
    search: searchQuery,
    isActive: showInactiveFilter,
  });

  // Build hierarchy structure
  const buildHierarchy = (depts: DepartmentHierarchy[]): DepartmentHierarchy[] => {
    if (!depts) return [];

    const departmentMap = new Map<string, DepartmentHierarchy>();
    const rootDepartments: DepartmentHierarchy[] = [];

    // Create map of all departments
    depts.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // Build hierarchy
    depts.forEach(dept => {
      const department = departmentMap.get(dept.id)!;
      if (dept.parentDepartmentId) {
        const parent = departmentMap.get(dept.parentDepartmentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(department);
        } else {
          rootDepartments.push(department);
        }
      } else {
        rootDepartments.push(department);
      }
    });

    return rootDepartments;
  };

  const hierarchy = departments ? buildHierarchy(departments as DepartmentHierarchy[]) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading departments"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
          Error Loading Departments
        </h3>
        <p className="text-red-700 dark:text-red-400">
          {error.message || 'An error occurred while loading departments'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage organizational departments and hierarchy
          </p>
        </div>
        <Link
          to="/departments/create"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Department
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
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
                checked={showInactiveFilter === false}
                onChange={(e) => setShowInactiveFilter(e.target.checked ? false : undefined)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              Active only
            </label>
          </div>
        </div>
      </div>

      {/* Department Hierarchy */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
        {hierarchy.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No departments found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Get started by creating your first department
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
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {hierarchy.map((department) => (
              <DepartmentNode key={department.id} department={department} level={0} />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {departments && departments.length > 0 && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {departments.length} department{departments.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

interface DepartmentNodeProps {
  department: DepartmentHierarchy;
  level: number;
}

function DepartmentNode({ department, level }: DepartmentNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = department.children && department.children.length > 0;

  return (
    <>
      <Link
        to={`/departments/${department.id}`}
        className="block hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div
          className="flex items-center gap-3 p-4"
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Department Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>

          {/* Department Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {department.departmentName}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {department.departmentCode}
              </span>
              {!department.isActive && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                  Inactive
                </span>
              )}
            </div>
            {department.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                {department.description}
              </p>
            )}
          </div>

          {/* Employee Count */}
          {department.employeeCount !== undefined && (
            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4" />
              <span>{department.employeeCount}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {department.children!.map((child) => (
            <DepartmentNode key={child.id} department={child} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}
