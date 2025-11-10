/**
 * Payroll Runs Page
 * 
 * Main page for managing payroll runs - list, create, view details
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, DollarSign, Calendar } from 'lucide-react';
import { usePayrollRuns } from '@/hooks';
import { DataTable, Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import { formatDate } from '@/utils/dateFormat';
import type { PayrollRun, PayrollRunStatus } from '@recruitiq/types';

export default function PayrollRunsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState<PayrollRunStatus | ''>('');

  // Fetch payroll runs
  const { data, isLoading, error } = usePayrollRuns({
    page,
    limit: pageSize,
    ...(status && { status: status as PayrollRunStatus }),
  });

  // Define table columns
  const columns: Column<PayrollRun>[] = [
    {
      key: 'runName',
      header: 'Run Name',
      accessor: (run) => (
        <div>
          <div className="font-medium text-gray-900">{run.runName}</div>
          <div className="text-sm text-gray-500">ID: {run.runNumber}</div>
        </div>
      ),
      sortable: true,
      width: '20%',
    },
    {
      key: 'payPeriod',
      header: 'Pay Period',
      accessor: (run) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-gray-900">
            <Calendar className="w-4 h-4" />
            {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
          </div>
          <div className="text-gray-500 mt-1">
            Pay Date: {formatDate(run.paymentDate)}
          </div>
        </div>
      ),
      sortable: true,
      sortKey: 'payPeriodStart',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (run) => <StatusBadge status={run.status} />,
      sortable: true,
      width: '12%',
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      accessor: (run) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {run.totalEmployees || 0}
          </div>
          <div className="text-xs text-gray-500">employees</div>
        </div>
      ),
      align: 'center',
      width: '10%',
    },
    {
      key: 'grossPay',
      header: 'Gross Pay',
      accessor: (run) => (
        <div className="text-right">
          <CurrencyDisplay amount={run.totalGrossPay || 0} />
        </div>
      ),
      sortable: true,
      align: 'right',
      width: '12%',
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      accessor: (run) => (
        <div className="text-right">
          <CurrencyDisplay 
            amount={run.totalNetPay || 0}
            className="font-semibold text-green-700"
          />
        </div>
      ),
      sortable: true,
      align: 'right',
      width: '12%',
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: (run) => (
        <div className="text-sm text-gray-600">
          {formatDate(run.createdAt)}
        </div>
      ),
      sortable: true,
      width: '10%',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Runs</h1>
          <p className="text-gray-600 mt-1">
            Manage payroll processing and payment runs
          </p>
        </div>
        
        <button
          onClick={() => navigate('/paylinq/payroll-runs/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Payroll Run
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<FileText className="w-6 h-6 text-blue-600" />}
          label="Draft Runs"
          value={data?.filter(r => r.status === 'draft').length || 0}
          onClick={() => setStatus('draft')}
          active={status === 'draft'}
        />
        <SummaryCard
          icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
          label="Approved"
          value={data?.filter(r => r.status === 'approved').length || 0}
          onClick={() => setStatus('approved')}
          active={status === 'approved'}
        />
        <SummaryCard
          icon={<Calendar className="w-6 h-6 text-green-600" />}
          label="Processed"
          value={data?.filter(r => r.status === 'processed').length || 0}
          onClick={() => setStatus('processed')}
          active={status === 'processed'}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollRunStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="calculating">Calculating</option>
              <option value="calculated">Calculated</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {status && (
            <button
              onClick={() => setStatus('')}
              className="mt-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        currentPage={page}
        totalPages={Math.ceil((data?.length || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={data?.length || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchable
        searchPlaceholder="Search by run name or number..."
        actions={(run) => (
          <button
            onClick={() => navigate(`/paylinq/payroll-runs/${run.id}`)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>
        )}
        emptyMessage={
          status 
            ? `No ${status} payroll runs found`
            : "No payroll runs yet. Create your first payroll run to get started."
        }
      />
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}

function SummaryCard({ icon, label, value, onClick, active }: SummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow p-6 text-left transition-all hover:shadow-md
        ${active ? 'ring-2 ring-blue-600 bg-blue-50' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${active ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

