import { Download, Maximize2, Grid, List } from 'lucide-react';
import { useState } from 'react';

import type { DepartmentHierarchy } from '@/types/department.types';

import DepartmentTreeNode from './DepartmentTreeNode';


interface OrganizationStructureProps {
  departments: DepartmentHierarchy[];
  isLoading?: boolean;
}

type ViewMode = 'tree' | 'grid';

export default function OrganizationStructure({
  departments,
  isLoading = false,
}: OrganizationStructureProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = () => {
    // Create a simple text representation for export
    const exportData = generateTextStructure(departments);
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organization-structure-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextStructure = (depts: DepartmentHierarchy[], level = 0): string => depts
      .map((dept) => {
        const indent = '  '.repeat(level);
        const childText = dept.children ? generateTextStructure(dept.children, level + 1) : '';
        return `${indent}${dept.departmentName} (${dept.departmentCode}) - ${dept.employeeCount || 0} employees\n${childText}`;
      })
      .join('');

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading structure" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'tree'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">Tree View</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-sm font-medium">Grid View</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Structure Display */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        {viewMode === 'tree' ? (
          <div className="space-y-2">
            {departments.map((dept) => (
              <DepartmentTreeNode key={dept.id} department={dept} level={0} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flattenDepartments(departments).map((dept) => (
              <DepartmentCard key={dept.id} department={dept} />
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Departments"
          value={countDepartments(departments)}
          className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
        />
        <StatCard
          label="Total Employees"
          value={countEmployees(departments)}
          className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          label="Max Depth"
          value={calculateMaxDepth(departments)}
          className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
        />
      </div>
    </div>
  );
}

// Helper Functions
function flattenDepartments(depts: DepartmentHierarchy[]): DepartmentHierarchy[] {
  const result: DepartmentHierarchy[] = [];
  
  const flatten = (dept: DepartmentHierarchy) => {
    result.push(dept);
    if (dept.children) {
      dept.children.forEach(flatten);
    }
  };
  
  depts.forEach(flatten);
  return result;
}

function countDepartments(depts: DepartmentHierarchy[]): number {
  return flattenDepartments(depts).length;
}

function countEmployees(depts: DepartmentHierarchy[]): number {
  return flattenDepartments(depts).reduce((sum, dept) => sum + (dept.employeeCount || 0), 0);
}

function calculateMaxDepth(depts: DepartmentHierarchy[], depth = 1): number {
  if (!depts || depts.length === 0) return 0;
  
  return Math.max(
    depth,
    ...depts.map((dept) =>
      dept.children ? calculateMaxDepth(dept.children, depth + 1) : depth
    )
  );
}

// Sub-Components
function DepartmentCard({ department }: { department: DepartmentHierarchy }) {
  return (
    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {department.departmentName}
        </h3>
        {!department.isActive && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
            Inactive
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {department.departmentCode}
      </p>
      {department.description && (
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-3 line-clamp-2">
          {department.description}
        </p>
      )}
      {department.employeeCount !== undefined && (
        <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <span className="font-medium">{department.employeeCount}</span>
          <span>employees</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`p-4 rounded-lg ${className}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
