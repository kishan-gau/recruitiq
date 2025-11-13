import { useState, useEffect } from 'react';
import { Download, Send, Eye, Search, ChevronUp, ChevronDown, Filter, X } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import WorkerAvatar from '@/components/ui/WorkerAvatar';
import FilterPanel from '@/components/ui/FilterPanel';
import TableSkeleton from '@/components/ui/TableSkeleton';
import PayslipViewer from '@/components/payslips/PayslipViewer';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import type { FilterConfig } from '@/components/ui/FilterPanel';
import { formatDate } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

interface Payslip {
  id: string;
  worker: {
    id: string;
    fullName: string;
    employeeNumber: string;
  };
  payrollRun: {
    period: string;
    payDate: string;
  };
  grossPay: number;
  netPay: number;
  status: 'generated' | 'sent' | 'viewed';
}

export default function PayslipsList() {
  const { success } = useToast();
  const { paylinq } = usePaylinqAPI();
  const { error: showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Payslip | 'worker.fullName'>('worker.fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const perPage = 10;

  // Fetch payslips data
  const fetchPayslips = async () => {
    try {
      setIsLoading(true);
      const response: any = await paylinq.getPaychecks();
      
      // API returns { success: true, paychecks: [...] } per API standards
      if (response.paychecks) {
        const apiData = response.paychecks;
        // Transform API data to match UI format
        const transformedPayslips = (Array.isArray(apiData) ? apiData : []).map((paycheck: any) => {
          // Construct full name from firstName and lastName
          const fullName = [paycheck.firstName, paycheck.lastName].filter(Boolean).join(' ') || 'Unknown';
          
          return {
            id: paycheck.id,
            worker: {
              id: paycheck.employeeId,
              fullName: fullName,
              employeeNumber: paycheck.employeeNumber || 'N/A',
            },
            payrollRun: {
              period: paycheck.runName || `${formatDate(paycheck.payPeriodStart)} - ${formatDate(paycheck.payPeriodEnd)}`,
              payDate: formatDate(paycheck.paymentDate || paycheck.payDate),
            },
            grossPay: parseFloat(paycheck.grossPay) || 0,
            netPay: parseFloat(paycheck.netPay) || 0,
            status: (paycheck.status === 'paid' ? 'sent' : paycheck.status === 'draft' ? 'generated' : 'generated') as 'generated' | 'sent' | 'viewed',
          };
        });
        setPayslips(transformedPayslips);
      }
    } catch (err: any) {
      console.error('Failed to fetch payslips:', err);
      showError(err.message || 'Failed to load payslips');
      setPayslips([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [paylinq, showError]);

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { label: 'Generated', value: 'generated' },
        { label: 'Sent', value: 'sent' },
        { label: 'Viewed', value: 'viewed' },
      ],
    },
  ];

  // Filter payslips
  const filteredPayslips = payslips.filter((p) => {
    // Search filter
    const matchesSearch =
      p.worker.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.worker.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus =
      !appliedFilters.status ||
      appliedFilters.status.length === 0 ||
      appliedFilters.status.includes(p.status);

    return matchesSearch && matchesStatus;
  });

  // Sort payslips
  const sortedPayslips = [...filteredPayslips].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortField === 'worker.fullName') {
      aValue = a.worker.fullName.toLowerCase();
      bValue = b.worker.fullName.toLowerCase();
    } else if (sortField === 'grossPay' || sortField === 'netPay') {
      aValue = a[sortField];
      bValue = b[sortField];
    } else if (sortField === 'status') {
      aValue = a.status;
      bValue = b.status;
    } else {
      aValue = a[sortField as keyof Payslip];
      bValue = b[sortField as keyof Payslip];
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedPayslips.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedPayslips = sortedPayslips.slice(startIndex, startIndex + perPage);

  const handleSort = (field: keyof Payslip | 'worker.fullName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleView = (payslipId: string) => {
    setSelectedPayslipId(payslipId);
    setIsViewerOpen(true);
  };

  const handleDownload = async (payslipId: string) => {
    try {
      const response = await paylinq.downloadPayslipPdf(payslipId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payslipId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      success('Payslip downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download payslip:', err);
      showError(err.message || 'Failed to download payslip');
    }
  };

  const handleSend = async (payslipId: string) => {
    try {
      await paylinq.sendPayslip(payslipId);
      success('Payslip sent to employee email');
      
      // Refresh the list to update status
      fetchPayslips();
    } catch (err: any) {
      console.error('Failed to send payslip:', err);
      showError(err.message || 'Failed to send payslip');
    }
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedPayslipId(null);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payslips</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage employee payslips
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">
          <Send className="w-5 h-5" />
          <span>Send All Latest</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee name or number..."
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
          {appliedFilters.status && appliedFilters.status.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
              Status: {appliedFilters.status.length} selected
              <button
                onClick={() => {
                  setAppliedFilters(prev => ({ ...prev, status: [] }));
                  setFilterValues(prev => ({ ...prev, status: [] }));
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
      {!isLoading && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(startIndex + perPage, filteredPayslips.length)} of{' '}
          {filteredPayslips.length} payslips
        </p>
      )}

      {/* Payslips Table */}
      {isLoading ? (
        <TableSkeleton rows={perPage} columns={7} />
      ) : paginatedPayslips.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('worker.fullName')}
              >
                <div className="flex items-center gap-1">
                  Employee
                  {sortField === 'worker.fullName' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pay Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pay Date
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('grossPay')}
              >
                <div className="flex items-center justify-end gap-1">
                  Gross Pay
                  {sortField === 'grossPay' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('netPay')}
              >
                <div className="flex items-center justify-end gap-1">
                  Net Pay
                  {sortField === 'netPay' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {paginatedPayslips.map((payslip) => (
              <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <WorkerAvatar fullName={payslip.worker.fullName} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {payslip.worker.fullName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payslip.worker.employeeNumber}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {payslip.payrollRun.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {payslip.payrollRun.payDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={payslip.grossPay} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                  <CurrencyDisplay amount={payslip.netPay} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={payslip.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleView(payslip.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="View Payslip"
                    >
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDownload(payslip.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleSend(payslip.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Send className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || activeFilterCount > 0
              ? 'No payslips found matching your criteria.'
              : 'No payslips available yet.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

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

      {/* Payslip Viewer Modal */}
      {selectedPayslipId && (
        <PayslipViewer
          paycheckId={selectedPayslipId}
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}


