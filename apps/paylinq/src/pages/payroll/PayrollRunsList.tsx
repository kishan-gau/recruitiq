import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PayrollRunCard from '@/components/ui/PayrollRunCard';
import Tabs from '@/components/ui/Tabs';
import Pagination from '@/components/ui/Pagination';
import type { Tab } from '@/components/ui/Tabs';
import type { PayrollRun } from '@/components/ui/PayrollRunCard';
import ProcessPayrollModal from '@/components/modals/ProcessPayrollModal';
import CreatePayrollRunModal from '@/components/modals/CreatePayrollRunModal';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

export default function PayrollRunsList() {
  const navigate = useNavigate();
  const { paylinq } = usePaylinqAPI();
  const { error: showError, success } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'period' | 'endDate' | 'employeeCount' | 'totalAmount'>('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const runsPerPage = 6;

  // Fetch payroll runs from API
  useEffect(() => {
    const fetchPayrollRuns = async () => {
      try {
        setIsLoading(true);
        const response = await paylinq.getPayrollRuns({
          page: currentPage,
          limit: runsPerPage,
          status: activeTab === 'all' ? undefined : (activeTab as any),
          sortBy: sortField === 'endDate' ? 'pay_period_end' : sortField === 'employeeCount' ? 'employee_count' : sortField === 'totalAmount' ? 'total_net_pay' : 'pay_period_end',
          sortOrder: sortDirection,
        });

        if (response.data) {
          const apiData = response.data as any;
          const runs: PayrollRun[] = (apiData.payroll_runs || apiData).map((r: any) => ({
            id: r.id,
            period: r.payrollName || r.runNumber,
            startDate: r.payPeriodStart,
            endDate: r.payPeriodEnd,
            status: r.status,
            employeeCount: r.employeeCount || 0,
            totalAmount: r.totalNetPay || 0,
            type: r.runType,
          }));
          setPayrollRuns(runs);
          setTotalCount(apiData.total || runs.length);
        }
      } catch (err: any) {
        showError(err.message || 'Failed to load payroll runs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayrollRuns();
  }, [paylinq, currentPage, activeTab, sortField, sortDirection, showError]);

  // Define tabs with server-side counts
  const tabs: Tab[] = [
    { id: 'all', label: 'All Runs', count: totalCount || payrollRuns.length },
    { id: 'draft', label: 'Draft', count: payrollRuns.filter((r) => r.status === 'draft').length },
    { id: 'calculated', label: 'Calculated', count: payrollRuns.filter((r) => r.status === 'calculated').length },
    { id: 'approved', label: 'Approved', count: payrollRuns.filter((r) => r.status === 'approved').length },
    { id: 'processing', label: 'Processing', count: payrollRuns.filter((r) => r.status === 'processing').length },
    { id: 'processed', label: 'Completed', count: payrollRuns.filter((r) => r.status === 'processed').length },
  ];

  // When using API, data is already filtered/sorted server-side
  const filteredRuns = payrollRuns;
  const totalPages = Math.ceil((totalCount || payrollRuns.length) / runsPerPage);
  const startIndex = (currentPage - 1) * runsPerPage;

  // Sort handler (not currently used but kept for future implementation)
  // const handleSort = (field: 'period' | 'endDate' | 'employeeCount' | 'totalAmount') => {
  //   if (sortField === field) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortField(field);
  //     setSortDirection('asc');
  //   }
  //   setCurrentPage(1);
  // };

  const handleProcess = async (runId: string) => {
    const run = payrollRuns.find((r) => r.id === runId);
    if (run) {
      setSelectedPayroll({
        id: run.id,
        period: `${run.startDate} - ${run.endDate}`,
        startDate: run.startDate,
        endDate: run.endDate,
        payDate: run.endDate, // Will be updated by modal
        employeeCount: run.employeeCount,
        totalGross: run.totalAmount,
      });
    }
  };

  const handleView = (runId: string) => {
    navigate(`/payroll/${runId}`);
  };

  const handleProcessSuccess = async () => {
    // Refetch data after processing
    try {
      const response = await paylinq.getPayrollRuns({
        page: currentPage,
        limit: runsPerPage,
        status: activeTab === 'all' ? undefined : (activeTab as any),
        sortBy: sortField === 'endDate' ? 'pay_period_end' : sortField === 'employeeCount' ? 'employee_count' : sortField === 'totalAmount' ? 'total_net_pay' : 'pay_period_end',
        sortOrder: sortDirection,
      });

      if (response.data) {
        const apiData = response.data as any;
        const runs: PayrollRun[] = (apiData.payroll_runs || apiData).map((r: any) => ({
          id: r.id,
          period: r.run_name,
          startDate: r.pay_period_start,
          endDate: r.pay_period_end,
          status: r.status,
          employeeCount: r.employee_count,
          totalAmount: r.total_net_pay,
          type: r.run_type,
        }));
        setPayrollRuns(runs);
        setTotalCount(apiData.total || runs.length);
        success('Payroll run processed successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to refresh payroll runs');
    }
  };

  const handleCreateSuccess = async () => {
    // Refetch data after creating
    try {
      const response = await paylinq.getPayrollRuns({
        page: 1, // Go to first page to see new run
        limit: runsPerPage,
        status: activeTab === 'all' ? undefined : (activeTab as any),
        sortBy: sortField === 'endDate' ? 'pay_period_end' : sortField === 'employeeCount' ? 'employee_count' : sortField === 'totalAmount' ? 'total_net_pay' : 'pay_period_end',
        sortOrder: sortDirection,
      });

      if (response.data) {
        const apiData = response.data as any;
        const runs: PayrollRun[] = (apiData.payroll_runs || apiData).map((r: any) => ({
          id: r.id,
          period: r.run_name,
          startDate: r.pay_period_start,
          endDate: r.pay_period_end,
          status: r.status,
          employeeCount: r.employee_count,
          totalAmount: r.total_net_pay,
          type: r.run_type,
        }));
        setPayrollRuns(runs);
        setTotalCount(apiData.total || runs.length);
        setCurrentPage(1);
        success('Payroll run created successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to refresh payroll runs');
    }
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
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="payroll-runs-loading">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="payroll-runs-list">
            {filteredRuns.map((run: PayrollRun) => (
              <PayrollRunCard
                key={run.id}
                run={run}
                onProcess={run.status === 'calculated' || run.status === 'draft' ? handleProcess : undefined}
                onView={handleView}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredRuns.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center" data-testid="payroll-runs-empty">
              <p className="text-gray-500 dark:text-gray-400">No payroll runs found</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}      {/* Create Payroll Run Modal */}
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

