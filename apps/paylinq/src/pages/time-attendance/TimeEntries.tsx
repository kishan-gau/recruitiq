import { useState } from 'react';
import { Check, X, Download } from 'lucide-react';
import { TimeEntryCard, Tabs, Pagination } from '@/components/ui';
import type { TimeEntry, Tab } from '@/components/ui';
import { mockTimeEntries } from '@/utils/mockData';
import { useToast } from '@/contexts/ToastContext';
import ApprovalModal from '@/components/modals/ApprovalModal';

export default function TimeEntries() {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; action: 'approve' | 'reject'; entryIds: string[] }>({ isOpen: false, action: 'approve', entryIds: [] });
  const [sortField, setSortField] = useState<'date' | 'worker.fullName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const entriesPerPage = 5;

  // Convert mock time entries to TimeEntry type for cards
  const timeEntries: TimeEntry[] = mockTimeEntries.map((entry) => ({
    id: entry.id,
    worker: {
      id: entry.employeeId,
      fullName: entry.employeeName,
      employeeNumber: entry.employeeNumber,
    },
    date: entry.date,
    clockIn: entry.clockIn || '00:00',
    clockOut: entry.clockOut || null,
    breakMinutes: entry.breakHours * 60,
    status: entry.status,
    issues: entry.hasIssue && entry.notes ? [entry.notes] : undefined,
    notes: entry.notes,
  }));

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

  const handleSort = (field: 'date' | 'worker.fullName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

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

  const handleApprovalSuccess = () => {
    setSelectedIds([]);
    // In real app, this would trigger a refetch
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
