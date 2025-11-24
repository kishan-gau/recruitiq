import { useState, useEffect } from 'react';
import { Check, X, Download } from 'lucide-react';
import TimeEntryCard from '@/components/ui/TimeEntryCard';
import Tabs from '@/components/ui/Tabs';
import Pagination from '@/components/ui/Pagination';
import type { TimeEntry } from '@/components/ui/TimeEntryCard';
import type { Tab } from '@/components/ui/Tabs';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import ApprovalModal from '@/components/modals/ApprovalModal';

export default function TimeEntries() {
  const { success, error } = useToast();
  const { paylinq } = usePaylinqAPI();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; action: 'approve' | 'reject'; entryIds: string[] }>({ isOpen: false, action: 'approve', entryIds: [] });
  const [sortField, setSortField] = useState<'date' | 'worker.fullName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const entriesPerPage = 5;

  // Fetch time entries from API
  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        setIsLoading(true);

        const params: Record<string, any> = {
          page: currentPage,
          limit: entriesPerPage,
          sortField: sortField === 'worker.fullName' ? 'worker' : sortField,
          sortDirection,
        };

        if (activeTab !== 'all') {
          params.status = activeTab;
        }

        const response = await paylinq.getTimeEntries(params);

        // Handle both wrapped and unwrapped responses
        const apiData = response.data as any;
        const responseData = apiData?.data || apiData || [];
        const isSuccess = apiData?.success !== false;

        if (isSuccess && Array.isArray(responseData)) {
          // Map API response to TimeEntry type
          const mappedEntries: TimeEntry[] = responseData.map((entry: any) => ({
            id: entry.id,
            worker: {
              id: entry.worker_id || entry.workerId,
              fullName: entry.worker_name || entry.workerName || 'Unknown',
              employeeNumber: entry.employee_number || entry.employeeNumber || '',
            },
            date: entry.date || entry.entry_date,
            clockIn: entry.clock_in || entry.clockIn || '00:00',
            clockOut: entry.clock_out || entry.clockOut || null,
            breakMinutes: entry.break_minutes || (entry.break_hours ? entry.break_hours * 60 : 0),
            status: entry.status,
            issues: entry.has_issue && entry.notes ? [entry.notes] : undefined,
            notes: entry.notes,
          }));

          setTimeEntries(mappedEntries);
        }
      } catch (err: any) {
        console.error('Failed to fetch time entries:', err);
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to load time entries',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeEntries();
  }, [paylinq, currentPage, activeTab, sortField, sortDirection, error]);

  // Define tabs
  const tabs: Tab[] = [
    { id: 'pending', label: 'Pending', count: timeEntries.filter((e) => e.status === 'pending').length },
    { id: 'approved', label: 'Approved', count: timeEntries.filter((e) => e.status === 'approved').length },
    { id: 'rejected', label: 'Rejected', count: timeEntries.filter((e) => e.status === 'rejected').length },
    { id: 'all', label: 'All', count: timeEntries.length },
  ];

  // Filter entries based on active tab
  const filteredEntries =
    activeTab === 'all'
      ? timeEntries
      : timeEntries.filter((e) => e.status === activeTab);

  // Sort entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortField === 'worker.fullName') {
      aValue = a.worker.fullName.toLowerCase();
      bValue = b.worker.fullName.toLowerCase();
    } else if (sortField === 'date') {
      aValue = a.date;
      bValue = b.date;
    } else {
      aValue = a[sortField as keyof TimeEntry];
      bValue = b[sortField as keyof TimeEntry];
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = sortedEntries.slice(startIndex, startIndex + entriesPerPage);

  // Sort handler (not currently used but kept for future implementation)
  // const handleSort = (field: 'date' | 'worker.fullName') => {
  //   if (sortField === field) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortField(field);
  //     setSortDirection(field === 'date' ? 'desc' : 'asc');
  //   }
  //   setCurrentPage(1);
  // };

  const handleApprove = (entryId: string) => {
    setApprovalModal({ isOpen: true, action: 'approve', entryIds: [entryId] });
  };

  const handleReject = (entryId: string) => {
    setApprovalModal({ isOpen: true, action: 'reject', entryIds: [entryId] });
  };

  const handleSelect = (entryId: string) => {
    setSelectedIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    );
  };

  const handleBulkApprove = () => {
    setApprovalModal({ isOpen: true, action: 'approve', entryIds: selectedIds });
  };

  const handleBulkReject = () => {
    setApprovalModal({ isOpen: true, action: 'reject', entryIds: selectedIds });
  };

  const handleApprovalSuccess = async (action: 'approve' | 'reject', entryIds: string[], notes?: string) => {
    if (action === 'approve') {
      if (entryIds.length === 1) {
        await paylinq.approveTimeEntry(entryIds[0]);
      } else {
        await paylinq.bulkApproveTimeEntries(entryIds);
      }
      success(`${entryIds.length} time ${entryIds.length === 1 ? 'entry' : 'entries'} approved successfully`);
    } else {
      // For reject, call individual reject for each entry with notes
      for (const id of entryIds) {
        await paylinq.rejectTimeEntry(id, notes || 'Rejected by manager');
      }
      success(`${entryIds.length} time ${entryIds.length === 1 ? 'entry' : 'entries'} rejected successfully`);
    }

    // Update local state
    setTimeEntries((prev) =>
      prev.map((entry) =>
        entryIds.includes(entry.id)
          ? { ...entry, status: action === 'approve' ? 'approved' : 'rejected' }
          : entry
      )
    );
    setSelectedIds([]);
    setApprovalModal({ isOpen: false, action: 'approve', entryIds: [] });
  };

  const handleExport = () => {
    success('Time entries exported successfully');
    // TODO: Implement actual export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time & Attendance</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review and approve time entries
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.length} entries selected
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkApprove}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <Check className="w-4 h-4" />
              <span>Approve All</span>
            </button>
            <button
              onClick={handleBulkReject}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              <span>Reject All</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Showing {startIndex + 1}-{Math.min(startIndex + entriesPerPage, filteredEntries.length)} of{' '}
        {filteredEntries.length} entries
      </p>

      {/* Time Entry Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(entriesPerPage)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedEntries.map((entry) => (
              <TimeEntryCard
                key={entry.id}
                entry={entry}
                onApprove={entry.status === 'pending' ? handleApprove : undefined}
                onReject={entry.status === 'pending' ? handleReject : undefined}
                onSelect={handleSelect}
                selected={selectedIds.includes(entry.id)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredEntries.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No time entries found</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ ...approvalModal, isOpen: false })}
        entryIds={approvalModal.entryIds}
        action={approvalModal.action}
        onSuccess={handleApprovalSuccess}
      />
    </div>
  );
}
