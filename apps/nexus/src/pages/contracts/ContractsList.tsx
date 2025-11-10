import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Calendar, DollarSign } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import type { ContractFilters, ContractStatus, ContractType } from '@/types/contract.types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';

export default function ContractsList() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ContractFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: contracts, isLoading, error } = useContracts(filters);

  // Client-side search
  const filteredContracts = contracts?.filter((contract) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contract.contractNumber.toLowerCase().includes(searchLower) ||
      contract.title.toLowerCase().includes(searchLower) ||
      contract.employee?.firstName.toLowerCase().includes(searchLower) ||
      contract.employee?.lastName.toLowerCase().includes(searchLower) ||
      contract.employee?.email.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadgeClass = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'terminated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getContractTypeLabel = (type: ContractType) => {
    const labels: Record<ContractType, string> = {
      permanent: 'Permanent',
      fixed_term: 'Fixed Term',
      probation: 'Probation',
      internship: 'Internship',
      contractor: 'Contractor',
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
          Error Loading Contracts
        </h3>
        <p className="text-red-700 dark:text-red-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contracts</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage employment contracts and agreements
          </p>
        </div>
        <Link
          to="/contracts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts, employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as ContractStatus || undefined })}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={filters.contractType || ''}
                onChange={(e) => setFilters({ ...filters, contractType: e.target.value as ContractType || undefined })}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="permanent">Permanent</option>
                <option value="fixed_term">Fixed Term</option>
                <option value="probation">Probation</option>
                <option value="internship">Internship</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredContracts?.length || 0} {filteredContracts?.length === 1 ? 'contract' : 'contracts'}
        </p>
      </div>

      {/* Contracts List */}
      {filteredContracts && filteredContracts.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Salary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => window.location.href = `/contracts/${contract.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {contract.contractNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {contract.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contract.employee && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {contract.employee.firstName} {contract.employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {contract.employee.employeeNumber}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getContractTypeLabel(contract.contractType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                          contract.status
                        )}`}
                      >
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span>
                          {format(new Date(contract.startDate), 'MMM dd, yyyy')}
                          {contract.endDate && (
                            <> - {format(new Date(contract.endDate), 'MMM dd, yyyy')}</>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contract.salary && (
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                          <span>
                            {contract.currency || 'USD'} {contract.salary.toLocaleString()}
                            {contract.paymentFrequency && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                / {contract.paymentFrequency.replace('_', ' ')}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No contracts found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating a new contract'}
          </p>
          {!search && Object.keys(filters).length === 0 && (
            <div className="mt-6">
              <Link
                to="/contracts/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
