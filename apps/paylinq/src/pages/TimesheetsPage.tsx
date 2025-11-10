/**
 * Timesheets Page
 * 
 * Main page for managing timesheets - list, approve, view details
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useTimesheets, useApproveTimesheet } from '@/hooks';
import { DataTable, Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDateRange } from '@/utils/dateFormat';
import type { Timesheet, EntryStatus } from '@recruitiq/types';

export default function TimesheetsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState<EntryStatus | ''>('');
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<string>>(new Set());

  // Fetch timesheets
  const { data, isLoading, error } = useTimesheets({
    page,
    limit: pageSize,
    ...(status && { status: status as EntryStatus }),
  });

  // Approve timesheet mutation
  const approveTimesheet = useApproveTimesheet();

  // Handle bulk approval
  const handleBulkApprove = async () => {
    for (const id of selectedTimesheets) {
      await approveTimesheet.mutateAsync(id);
    }
    setSelectedTimesheets(new Set());
  };

  // Define table columns
  const columns: Column<Timesheet>[] = [
    {
      key: 'employee',
      header: 'Employee',
      accessor: (timesheet) => (
        <div>
          <div className="font-medium text-gray-900">
            {timesheet.employeeName || 'Unknown Employee'}
          </div>
          <div className="text-sm text-gray-500">
            ID: {timesheet.employeeId}
          </div>
        </div>
      ),
      sortable: true,
      width: '20%',
    },
    {
      key: 'period',
      header: 'Period',
      accessor: (timesheet) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-gray-900">
            <Calendar className="w-4 h-4" />
            {formatDateRange(timesheet.periodStart, timesheet.periodEnd)}
          </div>
        </div>
      ),
      sortable: true,
      sortKey: 'startDate',
    },
    {
      key: 'hours',
      header: 'Total Hours',
      accessor: (timesheet) => {
        const totalHours = (timesheet.regularHours || 0) + 
                          (timesheet.overtimeHours || 0) + 
                          (timesheet.ptoHours || 0) +
                          (timesheet.sickHours || 0);
        return (
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {totalHours.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">hours</div>
          </div>
        );
      },
      align: 'center',
      sortable: true,
      sortKey: 'totalHours',
      width: '10%',
    },
    {
      key: 'regularHours',
      header: 'Regular',
      accessor: (timesheet) => (
        <div className="text-center text-sm">
          {timesheet.regularHours?.toFixed(2) || '0.00'}
        </div>
      ),
      align: 'center',
      width: '10%',
    },
    {
      key: 'overtimeHours',
      header: 'Overtime',
      accessor: (timesheet) => (
        <div className="text-center text-sm">
          <span className={timesheet.overtimeHours ? 'text-orange-600 font-medium' : ''}>
            {timesheet.overtimeHours?.toFixed(2) || '0.00'}
          </span>
        </div>
      ),
      align: 'center',
      width: '10%',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (timesheet) => <StatusBadge status={timesheet.status} />,
      sortable: true,
      width: '12%',
    },
    {
      key: 'approved',
      header: 'Approved',
      accessor: (timesheet) => (
        <div className="text-sm text-gray-600">
          {timesheet.approvedAt ? formatDate(timesheet.approvedAt) : '-'}
        </div>
      ),
      sortable: true,
      width: '12%',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600 mt-1">
            Review and approve employee timesheets
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Clock className="w-6 h-6 text-blue-600" />}
          label="Draft"
          value={data?.filter(t => t.status === 'draft').length || 0}
          onClick={() => setStatus('draft')}
          active={status === 'draft'}
        />
        <SummaryCard
          icon={<AlertCircle className="w-6 h-6 text-yellow-600" />}
          label="Submitted"
          value={data?.filter(t => t.status === 'submitted').length || 0}
          onClick={() => setStatus('submitted')}
          active={status === 'submitted'}
        />
        <SummaryCard
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          label="Approved"
          value={data?.filter(t => t.status === 'approved').length || 0}
          onClick={() => setStatus('approved')}
          active={status === 'approved'}
        />
        <SummaryCard
          icon={<AlertCircle className="w-6 h-6 text-red-600" />}
          label="Rejected"
          value={data?.filter(t => t.status === 'rejected').length || 0}
          onClick={() => setStatus('rejected')}
          active={status === 'rejected'}
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
              onChange={(e) => setStatus(e.target.value as EntryStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
        selectable
        selectedRows={selectedTimesheets}
        onSelectRow={(id) => {
          const newSelected = new Set(selectedTimesheets);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          setSelectedTimesheets(newSelected);
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedTimesheets(new Set(data?.map(t => t.id) || []));
          } else {
            setSelectedTimesheets(new Set());
          }
        }}
        searchable
        searchPlaceholder="Search by employee name or ID..."
        bulkActions={
          <>
            <button
              onClick={handleBulkApprove}
              disabled={approveTimesheet.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve Selected
            </button>
          </>
        }
        actions={(timesheet) => (
          <button
            onClick={() => navigate(`/paylinq/timesheets/${timesheet.id}`)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>
        )}
        emptyMessage={
          status 
            ? `No ${status} timesheets found`
            : "No timesheets available"
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

