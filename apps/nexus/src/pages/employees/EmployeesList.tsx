import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { VIPBadge } from '@/components/vip/VIPBadge';
import type { EmployeeFilters, EmploymentStatus, EmploymentType } from '@/types/employee.types';

export default function EmployeesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogState, setDeleteDialogState] = useState<{ isOpen: boolean; id: string; name: string }>({ 
    isOpen: false, 
    id: '', 
    name: '' 
  });

  // Fetch employees with filters
  const { data: employees, isLoading, error } = useEmployees(filters);
  const { mutate: deleteEmployee } = useDeleteEmployee();

  // Filter employees by search query (client-side)
  const filteredEmployees = employees?.filter((employee) => {
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

  const handleDelete = (id: string, name: string) => {
    setDeleteDialogState({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    const { id } = deleteDialogState;
    deleteEmployee(id, {
      onSuccess: () => {
        toast.success('Employee deleted successfully');
        setDeleteDialogState({ isOpen: false, id: '', name: '' });
      },
      onError: (error) => {
        // Use centralized error handler for user-friendly messages
        handleApiError(error, {
          toast,
          defaultMessage: 'Failed to delete employee',
        });
        setDeleteDialogState({ isOpen: false, id: '', name: '' });
      },
    });
  };

  const getStatusBadge = (status: EmploymentStatus) => {
    if (!status) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          unknown
        </span>
      );
    }

    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      suspended: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getTypeBadge = (type: EmploymentType) => {
    if (!type) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          unknown
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your organization's employees
          </p>
        </div>
        <Link to="/employees/new">
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors">
            <Plus className="w-5 h-5 mr-2" />
            Add Employee
          </button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or employee number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
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
                Status
              </label>
              <select
                value={filters.employmentStatus || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    employmentStatus: e.target.value as EmploymentStatus | undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Employment Type
              </label>
              <select
                value={filters.employmentType || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    employmentType: e.target.value as EmploymentType | undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="intern">Intern</option>
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
          <div className="w-12 h-12 spinner" aria-label="Loading employees"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && filteredEmployees && filteredEmployees.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-12 text-center">
          <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No employees found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first employee'}
          </p>
          <Link to="/employees/new">
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Add Employee
            </button>
          </Link>
        </div>
      )}

      {!isLoading && !error && filteredEmployees && filteredEmployees.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {employee.profilePhotoUrl ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={employee.profilePhotoUrl}
                              alt={`${employee.firstName} ${employee.lastName}`}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {employee.firstName?.[0] || '?'}
                              {employee.lastName?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <VIPBadge isVip={employee.isVip || false} size="sm" showLabel={false} />
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {employee.email}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            #{employee.employeeNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {employee.jobTitle || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {employee.departmentName || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(employee.employmentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(employee.employmentType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/employees/${employee.id}/edit`);
                          }}
                          className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(
                              employee.id,
                              `${employee.firstName} ${employee.lastName}`
                            );
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results count */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredEmployees.length} of {employees?.length || 0} employees
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogState.isOpen}
        onClose={() => setDeleteDialogState({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteDialogState.name}?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
