import { useState, useMemo } from 'react';
import { Plus, Filter, AlertCircle, CheckCircle, Clock, DollarSign, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { useReconciliations, useDeleteReconciliation } from '@/hooks/usePayments';
import { formatCurrency, formatDate } from '@/utils/formatting';
import type { Reconciliation, ReconciliationStatus, ReconciliationType } from '@recruitiq/types';
import ReconciliationDetailModal from '@/components/modals/ReconciliationDetailModal';
import NewReconciliationModal from '@/components/modals/NewReconciliationModal';

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

export default function ReconciliationDashboard() {
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReconciliationType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('reconciliationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const deleteMutation = useDeleteReconciliation();

  // Fetch reconciliations with filters
  const { data, isLoading, error } = useReconciliations({
    status: statusFilter === 'all' ? undefined : statusFilter,
    reconciliationType: typeFilter === 'all' ? undefined : typeFilter,
    page: currentPage,
    limit: pageSize,
  });

  // Backend returns { success, reconciliations, count }
  const reconciliations = (data as any)?.reconciliations || [];
  const totalItems = (data as any)?.count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate stats from data
  const stats = useMemo(() => {
    const pending = reconciliations.filter((r: Reconciliation) => r.status === 'pending').length;
    const inProgress = reconciliations.filter((r: Reconciliation) => r.status === 'in_progress').length;
    const completed = reconciliations.filter((r: Reconciliation) => r.status === 'completed').length;
    const totalVariance = reconciliations.reduce((sum: number, r: Reconciliation) => sum + (r.varianceAmount || 0), 0);

    return {
      pending,
      inProgress,
      completed,
      totalVariance,
    };
  }, [reconciliations]);

  // Define stat cards
  const statCards: StatCard[] = [
    {
      title: 'Pending',
      value: stats.pending,
      subtitle: 'Awaiting review',
      icon: <Clock className="w-6 h-6" />,
      color: 'yellow',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      subtitle: 'Being reviewed',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'blue',
    },
    {
      title: 'Completed',
      value: stats.completed,
      subtitle: 'Resolved',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green',
    },
    {
      title: 'Total Variance',
      value: formatCurrency(Math.abs(stats.totalVariance)),
      subtitle: stats.totalVariance < 0 ? 'Under' : stats.totalVariance > 0 ? 'Over' : 'Balanced',
      icon: <DollarSign className="w-6 h-6" />,
      color: stats.totalVariance === 0 ? 'green' : 'red',
    },
  ];

  // Get color classes for stat cards
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'green':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'red':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Get status badge
  const getStatusBadge = (status: ReconciliationStatus) => {
    const badges: Record<ReconciliationStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels: Record<ReconciliationStatus, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Get type badge
  const getTypeBadge = (type: ReconciliationType) => {
    const labels: Record<ReconciliationType, string> = {
      bank: 'Bank',
      gl: 'General Ledger',
      tax: 'Tax',
      benefit: 'Benefits',
    };

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        {labels[type]}
      </span>
    );
  };

  // Define table columns
  const columns: Column<Reconciliation>[] = [
    {
      key: 'reconciliationType',
      header: 'Type',
      accessor: (row) => getTypeBadge(row.reconciliationType),
      sortable: true,
      width: '150px',
    },
    {
      key: 'reconciliationDate',
      header: 'Date',
      accessor: (row) => formatDate(row.reconciliationDate),
      sortable: true,
      width: '120px',
    },
    {
      key: 'runNumber',
      header: 'Payroll Run',
      accessor: (row) => row.runNumber || row.runName || '-',
      sortable: true,
    },
    {
      key: 'expectedTotal',
      header: 'Expected',
      accessor: (row) => formatCurrency(row.expectedTotal || 0),
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'actualTotal',
      header: 'Actual',
      accessor: (row) => formatCurrency(row.actualTotal || 0),
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'varianceAmount',
      header: 'Variance',
      accessor: (row) => {
        const variance = row.varianceAmount || 0;
        const isNegative = variance < 0;
        return (
          <span className={variance === 0 ? 'text-gray-600' : isNegative ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(Math.abs(variance))}
            {variance !== 0 && (isNegative ? ' (under)' : ' (over)')}
          </span>
        );
      },
      sortable: true,
      align: 'right',
      width: '150px',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      sortable: true,
      width: '130px',
    },
  ];

  // Handle sort
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  };

  // Refresh data after modal updates
  const handleRefresh = () => {
    // The useReconciliations hook will automatically refetch when we change the key
    setCurrentPage(currentPage); // This triggers a re-render
  };

  // Handle delete reconciliation
  const handleDelete = async (id: string, runNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete reconciliation ${runNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      handleRefresh();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reconciliation</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review and resolve payroll discrepancies
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Reconciliation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className={`p-6 rounded-lg border ${getColorClasses(stat.color)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs opacity-70 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className="opacity-80">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReconciliationStatus | 'all');
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ReconciliationType | 'all');
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="bank">Bank</option>
            <option value="gl">General Ledger</option>
            <option value="tax">Tax</option>
            <option value="benefit">Benefits</option>
          </select>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setCurrentPage(1);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Reconciliation Table */}
      <DataTable
        data={reconciliations}
        columns={columns}
        isLoading={isLoading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              onClick={() => setSelectedReconciliationId(row.id)}
            >
              View
            </button>
            {row.status === 'pending' || row.status === 'in_progress' ? (
              <>
                <button
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                  onClick={() => setSelectedReconciliationId(row.id)}
                >
                  Complete
                </button>
                <button
                  className="text-red-600 hover:text-red-700 text-sm font-medium inline-flex items-center gap-1"
                  onClick={() => handleDelete(row.id, row.runNumber || row.runName || row.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            ) : null}
          </div>
        )}
        emptyMessage="No reconciliations found"
      />

      {/* Reconciliation Detail Modal */}
      {selectedReconciliationId && (
        <ReconciliationDetailModal
          isOpen={!!selectedReconciliationId}
          onClose={() => setSelectedReconciliationId(null)}
          reconciliationId={selectedReconciliationId}
          onUpdate={handleRefresh}
        />
      )}

      {/* New Reconciliation Modal */}
      <NewReconciliationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}

