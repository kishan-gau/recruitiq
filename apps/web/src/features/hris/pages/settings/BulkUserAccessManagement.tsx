/**
 * Bulk User Access Management
 * Allows bulk granting/revoking of system access for multiple employees
 */

import { Shield, Users, Mail, CheckCircle, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { useEmployees } from '@/hooks';
import { employeesService } from '@/services/employees.service';
import { handleApiError } from '@/utils/errorHandler';

import UserAccessAuditLog from '../../components/employee/UserAccessAuditLog';

type BulkAction = 'grant' | 'revoke' | null;

interface BulkOperationResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  error?: string;
}

export default function BulkUserAccessManagement() {
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_access' | 'without_access'>('all');
  const [currentAction, setCurrentAction] = useState<BulkAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sendCredentialEmails, setSendCredentialEmails] = useState(true);
  const [operationResults, setOperationResults] = useState<BulkOperationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const toast = useToast();
  const { data: employees = [], isLoading } = useEmployees({ employmentStatus: 'active' });

  // Filter employees based on search and status
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(query) ||
          emp.lastName.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.employeeNumber.toLowerCase().includes(query)
      );
    }

    // Status filter (simplified - would need backend support for actual user account status)
    // For now, we'll just show all filtered results
    // if (statusFilter === 'with_access') {
    //   filtered = filtered.filter(emp => emp.userAccountId);
    // } else if (statusFilter === 'without_access') {
    //   filtered = filtered.filter(emp => !emp.userAccountId);
    // }

    return filtered;
  }, [employees, searchQuery, statusFilter]);

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map((emp) => emp.id)));
    }
  };

  const handleSelectEmployee = (_employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(_employeeId)) {
      newSelected.delete(_employeeId);
    } else {
      newSelected.add(_employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleBulkGrant = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    if (!window.confirm(
      `Grant system access to ${selectedEmployees.size} employee(s)?${sendCredentialEmails ? '\n\nCredential emails will be sent to all selected employees.' : ''}`
    )) {
      return;
    }

    setIsProcessing(true);
    setCurrentAction('grant');
    const results: BulkOperationResult[] = [];

    for (const _employeeId of selectedEmployees) {
      const employee = employees.find((emp) => emp.id === employeeId);
      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`
        : 'Unknown Employee';

      try {
        await employeesService.grantSystemAccess(employeeId, {
          email: employee?.email,
          sendEmail: sendCredentialEmails,
        });

        results.push({
          employeeId,
          employeeName,
          success: true,
        });
      } catch (error: any) {
        const errorMessage = handleApiError(error, {
          toast,
          showToast: false,
          defaultMessage: 'Failed to grant access',
        });

        results.push({
          employeeId,
          employeeName,
          success: false,
          error: errorMessage,
        });
      }
    }

    setOperationResults(results);
    setShowResults(true);
    setIsProcessing(false);
    setCurrentAction(null);
    setSelectedEmployees(new Set());

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (failureCount === 0) {
      toast.success(`Successfully granted access to ${successCount} employee(s)`);
    } else if (successCount === 0) {
      toast.error(`Failed to grant access to all ${failureCount} employee(s)`);
    } else {
      toast.warning(
        `Granted access to ${successCount} employee(s), but ${failureCount} failed`
      );
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    if (!window.confirm(
      `Revoke system access from ${selectedEmployees.size} employee(s)?\n\nThey will no longer be able to log in to the platform.`
    )) {
      return;
    }

    setIsProcessing(true);
    setCurrentAction('revoke');
    const results: BulkOperationResult[] = [];

    for (const _employeeId of selectedEmployees) {
      const employee = employees.find((emp) => emp.id === employeeId);
      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`
        : 'Unknown Employee';

      try {
        await employeesService.revokeSystemAccess(_employeeId);

        results.push({
          employeeId,
          employeeName,
          success: true,
        });
      } catch (error: any) {
        const errorMessage = handleApiError(error, {
          toast,
          showToast: false,
          defaultMessage: 'Failed to revoke access',
        });

        results.push({
          employeeId,
          employeeName,
          success: false,
          error: errorMessage,
        });
      }
    }

    setOperationResults(results);
    setShowResults(true);
    setIsProcessing(false);
    setCurrentAction(null);
    setSelectedEmployees(new Set());

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (failureCount === 0) {
      toast.success(`Successfully revoked access from ${successCount} employee(s)`);
    } else if (successCount === 0) {
      toast.error(`Failed to revoke access from all ${failureCount} employee(s)`);
    } else {
      toast.warning(
        `Revoked access from ${successCount} employee(s), but ${failureCount} failed`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bulk User Access Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Grant or revoke system access for multiple employees at once
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuditLog(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            View Audit Log
          </button>
        </div>
      </div>

      {/* Action Bar */}
      {selectedEmployees.size > 0 && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-400">
                {selectedEmployees.size} employee(s) selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Send Email Toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={sendCredentialEmails}
                  onChange={(e) => setSendCredentialEmails(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Mail className="w-4 h-4" />
                Send credential emails
              </label>

              {/* Grant Access Button */}
              <button
                onClick={handleBulkGrant}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && currentAction === 'grant' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Grant Access
                  </>
                )}
              </button>

              {/* Revoke Access Button */}
              <button
                onClick={handleBulkRevoke}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && currentAction === 'revoke' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Revoke Access
                  </>
                )}
              </button>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedEmployees(new Set())}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or employee number..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              <option value="with_access">With Access</option>
              <option value="without_access">Without Access</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredEmployees.length > 0 &&
                      selectedEmployees.size === filteredEmployees.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? 'No employees found matching your search'
                        : 'No employees available'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedEmployees.has(employee.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                          {employee.jobTitle && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.jobTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {employee.employeeNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {employee.departmentName || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          employee.employmentStatus === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}
                      >
                        {employee.employmentStatus === 'active' ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {employee.employmentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Operation Results
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {operationResults.map((result) => (
                  <div
                    key={result.employeeId}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            result.success
                              ? 'text-green-900 dark:text-green-400'
                              : 'text-red-900 dark:text-red-400'
                          }`}
                        >
                          {result.employeeName}
                        </p>
                        <p
                          className={`text-sm ${
                            result.success
                              ? 'text-green-700 dark:text-green-500'
                              : 'text-red-700 dark:text-red-500'
                          }`}
                        >
                          {result.success
                            ? currentAction === 'grant'
                              ? 'Access granted successfully'
                              : 'Access revoked successfully'
                            : result.error}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowResults(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                User Access Audit Log
              </h3>
              <button
                onClick={() => setShowAuditLog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <UserAccessAuditLog />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
