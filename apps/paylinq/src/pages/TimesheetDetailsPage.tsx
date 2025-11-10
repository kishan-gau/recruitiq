/**
 * Timesheet Details Page
 * 
 * View comprehensive details of a timesheet including:
 * - Timesheet summary and status
 * - List of time entries
 * - Actions (submit, approve, reject)
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useTimesheet,
  useApproveTimesheet,
  useUpdateTimesheet,
  useDeleteTimeEntry,
} from '@/hooks/useTimesheets';
import { DataTable, type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Dialog from '@/components/ui/Dialog';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { TimeEntry } from '@recruitiq/types';

export default function TimesheetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Fetch data
  const { data: timesheet, isLoading, error } = useTimesheet(id!);

  // Mutations
  const approveTimesheet = useApproveTimesheet();
  const updateTimesheet = useUpdateTimesheet();
  const deleteTimeEntry = useDeleteTimeEntry();

  // Calculate total hours
  const totalHours = timesheet
    ? timesheet.regularHours + timesheet.overtimeHours + timesheet.ptoHours + timesheet.sickHours
    : 0;

  // Handle actions
  const handleApprove = () => {
    if (!id) return;
    approveTimesheet.mutate(id, {
      onSuccess: () => {
        setShowApproveDialog(false);
      },
    });
  };

  const handleReject = () => {
    if (!id) return;
    updateTimesheet.mutate(
      { id, data: { status: 'rejected', notes: rejectionNotes } },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectionNotes('');
        },
      }
    );
  };

  const handleDeleteEntry = () => {
    if (!selectedEntryId) return;
    deleteTimeEntry.mutate(selectedEntryId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setSelectedEntryId(null);
      },
    });
  };

  const handleEditEntry = (entryId: string) => {
    navigate(`/time-entries/${entryId}/edit`);
  };

  const handleAddEntry = () => {
    navigate(`/time-entries/create?timesheetId=${id}`);
  };

  // Determine available actions
  const canApprove = timesheet?.status === 'submitted';
  const canReject = timesheet?.status === 'submitted';
  const canEdit = timesheet?.status === 'draft' || timesheet?.status === 'rejected';

  // Time entries table columns
  const timeEntryColumns: Column<TimeEntry>[] = [
    {
      key: 'entryDate',
      header: 'Date',
      accessor: (entry) => formatDate(entry.entryDate),
      sortable: true,
    },
    {
      key: 'clockIn',
      header: 'Clock In',
      accessor: (entry) => (entry.clockIn ? formatDateTime(entry.clockIn) : '-'),
    },
    {
      key: 'clockOut',
      header: 'Clock Out',
      accessor: (entry) => (entry.clockOut ? formatDateTime(entry.clockOut) : '-'),
    },
    {
      key: 'workedHours',
      header: 'Worked Hours',
      accessor: (entry) => (
        <span className="font-medium">{entry.workedHours.toFixed(2)}</span>
      ),
      sortable: true,
      align: 'right',
    },
    {
      key: 'regularHours',
      header: 'Regular',
      accessor: (entry) => entry.regularHours.toFixed(2),
      align: 'right',
    },
    {
      key: 'overtimeHours',
      header: 'Overtime',
      accessor: (entry) => (
        <span className={entry.overtimeHours > 0 ? 'text-orange-600 font-medium' : ''}>
          {entry.overtimeHours.toFixed(2)}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'entryType',
      header: 'Type',
      accessor: (entry) => (
        <span className="capitalize">{entry.entryType.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (entry) => <StatusBadge status={entry.status} />,
      sortable: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/timesheets')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Timesheets
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">Failed to load timesheet details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/timesheets')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timesheet Details</h1>
            <p className="text-sm text-gray-500">
              {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
            </p>
          </div>
          <StatusBadge status={timesheet.status} />
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          {canApprove && (
            <button
              onClick={() => setShowApproveDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </button>
          )}
          
          {canReject && (
            <button
              onClick={() => setShowRejectDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Employee & Period Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Employee
            </dt>
            <dd className="text-sm text-gray-900 font-medium">{timesheet.employeeName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Pay Period
            </dt>
            <dd className="text-sm text-gray-900">
              {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Total Hours
            </dt>
            <dd className="text-lg text-gray-900 font-bold">{totalHours.toFixed(2)}</dd>
          </div>
        </div>
      </div>

      {/* Hours Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Regular Hours</div>
          <div className="text-2xl font-bold text-gray-900">{timesheet.regularHours.toFixed(2)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Overtime Hours</div>
          <div className="text-2xl font-bold text-orange-600">
            {timesheet.overtimeHours.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">PTO Hours</div>
          <div className="text-2xl font-bold text-blue-600">{timesheet.ptoHours.toFixed(2)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Sick Hours</div>
          <div className="text-2xl font-bold text-purple-600">{timesheet.sickHours.toFixed(2)}</div>
        </div>
      </div>

      {/* Approval Details */}
      {(timesheet.approvedAt || timesheet.rejectedAt) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Approval History</h3>
          <div className="space-y-2">
            {timesheet.approvedAt && (
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700">
                  Approved by {timesheet.approvedBy} on {formatDateTime(timesheet.approvedAt)}
                </span>
              </div>
            )}
            {timesheet.rejectedAt && (
              <div className="flex items-center text-sm">
                <XCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-gray-700">
                  Rejected by {timesheet.rejectedBy} on {formatDateTime(timesheet.rejectedAt)}
                </span>
              </div>
            )}
            {timesheet.notes && (
              <div className="mt-2 text-sm text-gray-600 pl-6">
                <span className="font-medium">Notes:</span> {timesheet.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Entries Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Time Entries</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {timesheet.timeEntries?.length || 0}{' '}
              {timesheet.timeEntries?.length === 1 ? 'entry' : 'entries'}
            </span>
            {canEdit && (
              <button
                onClick={handleAddEntry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </button>
            )}
          </div>
        </div>
        
        <DataTable
          data={timesheet.timeEntries || []}
          columns={timeEntryColumns}
          searchable
          searchPlaceholder="Search by date or type..."
          actions={(entry: TimeEntry) => (
            <div className="flex items-center space-x-2">
              {canEdit && (
                <>
                  <button
                    onClick={() => handleEditEntry(entry.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              {!canEdit && (
                <button
                  onClick={() => navigate(`/time-entries/${entry.id}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Timesheet"
        message={`Are you sure you want to approve this timesheet for ${timesheet.employeeName}?`}
        confirmText="Approve"
        variant="info"
        isLoading={approveTimesheet.isPending}
      />

      {/* Reject Dialog with Notes */}
      <Dialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setRejectionNotes('');
        }}
        title="Reject Timesheet"
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionNotes('');
              }}
              disabled={updateTimesheet.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={updateTimesheet.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {updateTimesheet.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Are you sure you want to reject this timesheet for {timesheet.employeeName}?
          </p>
          <div>
            <label htmlFor="rejectionNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              id="rejectionNotes"
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Explain why this timesheet is being rejected..."
            />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedEntryId(null);
        }}
        onConfirm={handleDeleteEntry}
        title="Delete Time Entry"
        message="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteTimeEntry.isPending}
      />
    </div>
  );
}


