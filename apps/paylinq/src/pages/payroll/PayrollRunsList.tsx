import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PayrollRunCard, Tabs, Pagination } from '@/components/ui';
import type { Tab, PayrollRun } from '@/components/ui';
import { mockPayrollRuns } from '@/utils/mockData';
import ProcessPayrollModal from '@/components/modals/ProcessPayrollModal';
import CreatePayrollRunModal from '@/components/modals/CreatePayrollRunModal';

export default function PayrollRunsList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'period' | 'endDate' | 'employeeCount' | 'totalAmount'>('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const runsPerPage = 6;

  // Convert mock payroll runs to PayrollRun type
  const payrollRuns: PayrollRun[] = mockPayrollRuns.map((r) => ({
    id: r.id,
    period: r.runName,
    startDate: r.payPeriodStart,
    endDate: r.payPeriodEnd,
    status: r.status,
    employeeCount: r.employeeCount,
    totalAmount: r.totalNetPay,
    type: r.runType,
  }));

  // Define tabs
  const tabs: Tab[] = [
    { id: 'all', label: 'All Runs', count: payrollRuns.length },
    { id: 'ready', label: 'Ready', count: payrollRuns.filter((r) => r.status === 'ready').length },
    { id: 'processing', label: 'Processing', count: payrollRuns.filter((r) => r.status === 'processing').length },
    { id: 'completed', label: 'Completed', count: payrollRuns.filter((r) => r.status === 'completed').length },
    { id: 'draft', label: 'Draft', count: payrollRuns.filter((r) => r.status === 'draft').length },
  ];

  // Filter runs based on active tab
  const filteredRuns =
    activeTab === 'all'
      ? payrollRuns
      : payrollRuns.filter((r) => r.status === activeTab);

  // Sort runs
  const sortedRuns = [...filteredRuns].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle numeric fields
    if (sortField === 'employeeCount' || sortField === 'totalAmount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle string fields (dates, period)
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRuns.length / runsPerPage);
  const startIndex = (currentPage - 1) * runsPerPage;
  const paginatedRuns = sortedRuns.slice(startIndex, startIndex + runsPerPage);

  const handleSort = (field: 'period' | 'endDate' | 'employeeCount' | 'totalAmount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleProcess = (runId: string) => {
    const run = mockPayrollRuns.find((r) => r.id === runId);
    if (run) {
      setSelectedPayroll({
        id: run.id,
        period: `${run.payPeriodStart} - ${run.payPeriodEnd}`,
        startDate: run.payPeriodStart,
        endDate: run.payPeriodEnd,
        payDate: run.paymentDate,
        employeeCount: run.employeeCount,
        totalGross: run.totalGrossPay,
      });
    }
  };

  const handleView = (runId: string) => {
    navigate(`/payroll/${runId}`);
  };

  const handleProcessSuccess = () => {
    // In real app, this would trigger a refetch
  };

  const handleCreateSuccess = () => {
    // In real app, this would trigger a refetch
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payroll Runs</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Process and manage payroll runs
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Create Payroll Run</span>
        </button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(startIndex + runsPerPage, filteredRuns.length)} of{' '}
          {filteredRuns.length} runs
        </p>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Payroll Run Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRuns.map((run) => (
          <PayrollRunCard
            key={run.id}
            run={run}
            onProcess={run.status === 'ready' ? handleProcess : undefined}
            onView={handleView}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredRuns.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No payroll runs found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Create Payroll Run Modal */}
      <CreatePayrollRunModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Process Payroll Modal */}
      <ProcessPayrollModal
        isOpen={selectedPayroll !== null}
        onClose={() => setSelectedPayroll(null)}
        payrollRun={selectedPayroll}
        onSuccess={handleProcessSuccess}
      />
    </div>
  );
}
