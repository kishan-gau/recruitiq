import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, X } from 'lucide-react';
import WorkerTable from '@/components/ui/WorkerTable';
import type { Worker } from '@/components/ui/WorkerTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FilterPanel from '@/components/ui/FilterPanel';
import type { FilterConfig } from '@/components/ui/FilterPanel';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import AddWorkerModal from '@/components/modals/AddWorkerModal';

export default function WorkersList() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { paylinq } = usePaylinqAPI();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteWorkerId, setDeleteWorkerId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<string>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const workersPerPage = 10;

  // Fetch workers from API
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setIsLoading(true);
        
        // Build query params
        const params: Record<string, any> = {
          page: currentPage,
          limit: workersPerPage,
          sortField,
          sortDirection,
        };

        if (searchTerm) {
          params.search = searchTerm;
        }

        if (appliedFilters.status) {
          params.status = appliedFilters.status;
        }

        if (appliedFilters.workerType && appliedFilters.workerType.length > 0) {
          params.workerType = appliedFilters.workerType.join(',');
        }

        const response = await paylinq.getWorkers(params);
        
        if (response.success) {
          // Map API response to Worker type
          const employeeData = response.employees || [];
          const mappedWorkers: Worker[] = employeeData.map((w: any) => ({
            id: w.employeeId || w.employee_id || w.id, // Use employeeId (hris.employee.id), not payroll config id
            employeeNumber: w.employee_number || w.employeeNumber,
            fullName: w.full_name || w.fullName,
            type: w.workerTypeName || w.worker_type_name || w.employmentType || w.employment_type || w.worker_type || w.type || '',
            compensationType: w.compensationType || w.compensation_type || 'salary',
            compensationAmount: w.currentCompensation || w.current_compensation || w.compensation_amount || w.compensationAmount || 0,
            status: w.status || w.employment_status || w.employmentStatus,
          }));

          setWorkers(mappedWorkers);
          setTotalCount(response.pagination?.total || mappedWorkers.length);
        }
      } catch (err: any) {
        console.error('Failed to fetch workers:', err);
        error(err.message || 'Failed to load workers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkers();
  }, [paylinq, currentPage, sortField, sortDirection, searchTerm, appliedFilters, error, refreshTrigger]);

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Terminated', value: 'terminated' },
      ],
    },
    {
      id: 'workerType',
      label: 'Worker Type',
      type: 'multiselect',
      options: [
        { label: 'Full-Time', value: 'Full-Time' },
        { label: 'Part-Time', value: 'Part-Time' },
        { label: 'Contract', value: 'Contract' },
        { label: 'Hourly', value: 'Hourly' },
      ],
    },
  ];

  // Filter workers based on client-side filters (for mock data fallback)
  const filteredWorkers = workers.filter((w) => {
    // Search filter
    const matchesSearch =
      w.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = !appliedFilters.status || w.status === appliedFilters.status;
    
    // Worker type filter
    const matchesWorkerType =
      !appliedFilters.workerType ||
      appliedFilters.workerType.length === 0 ||
      appliedFilters.workerType.includes(w.type);

    return matchesSearch && matchesStatus && matchesWorkerType;
  });

  // Sort workers
  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    let aValue: any = a[sortField as keyof Worker];
    let bValue: any = b[sortField as keyof Worker];

    // Handle numeric fields
    if (sortField === 'compensationAmount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle string fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination - use API total count if available, otherwise use filtered count
  const totalPages = Math.ceil((totalCount || sortedWorkers.length) / workersPerPage);
  const startIndex = (currentPage - 1) * workersPerPage;
  // When using API pagination, workers are already paginated
  const paginatedWorkers = totalCount > 0 ? workers : sortedWorkers.slice(startIndex, startIndex + workersPerPage);

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleView = (workerId: string) => {
    navigate(`/workers/${workerId}`);
  };

  const handleEdit = (workerId: string) => {
    navigate(`/workers/${workerId}`);
  };

  const handleDelete = (workerId: string) => {
    setDeleteWorkerId(workerId);
  };

  const confirmDelete = async () => {
    if (!deleteWorkerId) return;

    setIsDeleting(true);
    try {
      await paylinq.deleteWorker(deleteWorkerId);
      
      const worker = workers.find((w) => w.id === deleteWorkerId);
      success(`Worker ${worker?.fullName || ''} has been deleted successfully`);
      setDeleteWorkerId(null);
      
      // Refresh the list
      setWorkers((prev) => prev.filter((w) => w.id !== deleteWorkerId));
      setTotalCount((prev) => prev - 1);
    } catch (err: any) {
      error(err.message || 'Failed to delete worker. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSuccess = () => {
    // Refresh worker list after successful add
    setRefreshTrigger(prev => prev + 1);
    // Reset to first page to see the newly added worker
    setCurrentPage(1);
  };

  const handleFilterChange = (filterId: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filterValues);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== null && v !== undefined;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workers</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage employee payroll records
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Add Worker</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or employee number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
          {appliedFilters.status && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
              Status: {appliedFilters.status}
              <button
                onClick={() => {
                  setAppliedFilters(prev => ({ ...prev, status: '' }));
                  setFilterValues(prev => ({ ...prev, status: '' }));
                }}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {appliedFilters.workerType && appliedFilters.workerType.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
              Type: {appliedFilters.workerType.length} selected
              <button
                onClick={() => {
                  setAppliedFilters(prev => ({ ...prev, workerType: [] }));
                  setFilterValues(prev => ({ ...prev, workerType: [] }));
                }}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(startIndex + workersPerPage, filteredWorkers.length)} of{' '}
          {filteredWorkers.length} workers
        </p>
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.length} selected</p>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Bulk Actions
            </button>
          </div>
        )}
      </div>

      {/* Workers Table */}
      {isLoading ? (
        <TableSkeleton rows={workersPerPage} columns={6} />
      ) : paginatedWorkers.length > 0 ? (
        <>
          <WorkerTable
            workers={paginatedWorkers}
            onSort={handleSort}
            onSelect={setSelectedIds}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedIds}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || activeFilterCount > 0
              ? 'No workers found matching your criteria.'
              : 'No workers yet. Click "Add Worker" to get started.'}
          </p>
        </div>
      )}

      {/* Add Worker Modal */}
      <AddWorkerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteWorkerId !== null}
        onClose={() => setDeleteWorkerId(null)}
        onConfirm={confirmDelete}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}

