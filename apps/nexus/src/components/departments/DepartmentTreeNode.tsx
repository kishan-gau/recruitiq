import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { DepartmentHierarchy } from '@/types/department.types';
import { useDeleteDepartment } from '@/hooks/useDepartments';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';

interface DepartmentTreeNodeProps {
  department: DepartmentHierarchy;
  level: number;
  onEmployeeClick?: (departmentId: string) => void;
}

export default function DepartmentTreeNode({
  department,
  level,
  onEmployeeClick,
}: DepartmentTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();
  const deleteDepartment = useDeleteDepartment();

  const hasChildren = department.children && department.children.length > 0;
  const employeeCount = department.employeeCount || 0;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${department.departmentName}?`)) {
      return;
    }

    try {
      await deleteDepartment.mutateAsync(department.id);
      toast.success('Department deleted successfully');
    } catch (error) {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to delete department',
      });
    }
  };

  return (
    <div className="department-tree-node">
      <div
        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group"
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-6 flex-shrink-0" />
        )}

        {/* Department Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, hsl(${level * 60}, 70%, 55%), hsl(${level * 60 + 40}, 70%, 65%))`,
          }}
        >
          <Building2 className="w-5 h-5 text-white" />
        </div>

        {/* Department Info */}
        <Link
          to={`/departments/${department.id}`}
          className="flex-1 min-w-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
        >
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
        </Link>

        {/* Employee Count */}
        {employeeCount > 0 && (
          <button
            onClick={() => onEmployeeClick?.(department.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="View employees"
          >
            <Users className="w-4 h-4" />
            <span>{employeeCount}</span>
          </button>
        )}

        {/* Action Menu */}
        <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                <Link
                  to={`/departments/${department.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <Edit className="w-4 h-4" />
                  Edit Department
                </Link>
                <Link
                  to={`/employees?departmentId=${department.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  Manage Employees
                </Link>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Department
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {department.children!.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              level={level + 1}
              onEmployeeClick={onEmployeeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
