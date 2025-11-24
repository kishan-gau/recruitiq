import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, DollarSign, Users, Calendar, FileText, ChevronUp, ChevronDown, Calculator } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import WorkerAvatar from '@/components/ui/WorkerAvatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/utils/helpers';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { useCalculatePayroll } from '@/hooks/usePayrollRuns';

export default function PayrollRunDetails() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { paylinq } = usePaylinqAPI();
  const { error: showError, success: showSuccess } = useToast();
  const [sortField, setSortField] = useState<'fullName' | 'grossPay' | 'netPay'>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [run, setRun] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [isSendingPayslips, setIsSendingPayslips] = useState(false);

  const calculatePayroll = useCalculatePayroll();

  // Fetch payroll run details from API
  const fetchPayrollRunDetails = async () => {
    if (!runId) return;

    try {
      setIsLoading(true);
      const response = await paylinq.getPayrollRun(runId);

      if (response.payrollRun) {
        const apiData = response.payrollRun as any;
        
        // Convert numeric string fields to actual numbers for proper display
        const runData = {
          ...apiData,
          totalGrossPay: parseFloat(apiData.totalGrossPay) || 0,
          totalNetPay: parseFloat(apiData.totalNetPay) || 0,
          totalDeductions: parseFloat(apiData.totalDeductions) || 0,
          totalAmount: parseFloat(apiData.totalAmount) || 0,
        };
        
        setRun(runData);
        
        // Map employee breakdown from API, converting string amounts to numbers
        const employees = (apiData.employee_breakdown || []).map((emp: any) => ({
          id: emp.worker_id,
          fullName: emp.full_name,
          employeeNumber: emp.employee_number,
          grossPay: parseFloat(emp.gross_pay) || 0,
          wageTax: parseFloat(emp.wage_tax) || 0,
          aov: parseFloat(emp.aov) || 0,
          aww: parseFloat(emp.aww) || 0,
          totalDeductions: parseFloat(emp.total_deductions) || 0,
          netPay: parseFloat(emp.net_pay) || 0,
          status: emp.status || 'calculated',
        }));
        
        setEmployeeData(employees);
      }
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load payroll run details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = () => {
    if (!runId) return;
    console.log('Calculating payroll for run:', runId);
    calculatePayroll.mutate(
      { payrollRunId: runId, includeTimesheets: true, includeDeductions: true, includeTaxes: true },
      {
        onSuccess: (result) => {
          console.log('Calculation result:', result);
          setShowCalculateDialog(false);
          
          // Show success toast
          const successMessage = result.paychecksCreated > 0
            ? `Payroll calculated successfully. ${result.paychecksCreated} paycheck${result.paychecksCreated > 1 ? 's' : ''} created.`
            : 'Payroll calculated successfully';
          showSuccess(successMessage);
          
          // Refresh the data
          fetchPayrollRunDetails();
        },
        onError: (error: any) => {
          console.error('Calculation error:', error);
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to calculate payroll';
          showError(errorMessage);
        },
      }
    );
  };

  const handleSubmitForReview = async () => {
    if (!runId) return;
    
    setIsLoading(true);
    try {
      await paylinq.markPayrollRunForReview(runId);
      showSuccess('Payroll run submitted for review');
      fetchPayrollRunDetails();
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to submit for review',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPayslips = async () => {
    if (!runId) return;
    
    setIsSendingPayslips(true);
    try {
      // Type assertion needed until types are refreshed
      const response = await (paylinq as any).sendPayslips(runId);
      // API returns { success, message, data } at root level
      if (response.success || response.data?.success) {
        showSuccess(response.message || response.data?.message || 'Payslips sent successfully');
      } else {
        showError(response.message || 'Failed to send payslips');
      }
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to send payslips',
      });
    } finally {
      setIsSendingPayslips(false);
    }
  };

  // Fetch payroll run details from API
  useEffect(() => {
    fetchPayrollRunDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Payroll Run Not Found</p>
          <button
            onClick={() => navigate('/payroll')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Payroll Runs
          </button>
        </div>
      </div>
    );
  }

  // Sort employees
  const employees = [...employeeData].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'fullName') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'fullName' | 'grossPay' | 'netPay') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const summary = {
    totalGross: run?.totalGrossPay || employees.reduce((sum, e) => sum + e.grossPay, 0),
    totalWageTax: employees.reduce((sum, e) => sum + e.wageTax, 0),
    totalAOV: employees.reduce((sum, e) => sum + e.aov, 0),
    totalAWW: employees.reduce((sum, e) => sum + e.aww, 0),
    totalDeductions: run?.totalDeductions || employees.reduce((sum, e) => sum + e.totalDeductions, 0),
    totalNet: run?.totalNetPay || employees.reduce((sum, e) => sum + e.netPay, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/payroll')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Payroll Run Details
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {formatDate(run.pay_period_start || run.payPeriodStart)} - {formatDate(run.pay_period_end || run.payPeriodEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {run.status === 'draft' && (
            <button 
              onClick={() => setShowCalculateDialog(true)}
              disabled={calculatePayroll.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <Calculator className="w-5 h-5" />
              <span>{calculatePayroll.isPending ? 'Calculating...' : 'Calculate'}</span>
            </button>
          )}
          {run.status === 'calculating' && (
            <>
              <button 
                onClick={() => setShowCalculateDialog(true)}
                disabled={calculatePayroll.isPending}
                className="flex items-center space-x-2 px-4 py-2 border border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <Calculator className="w-5 h-5" />
                <span>{calculatePayroll.isPending ? 'Recalculating...' : 'Recalculate'}</span>
              </button>
              <button 
                onClick={handleSubmitForReview}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                <span>Submit for Review</span>
              </button>
            </>
          )}
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button 
            onClick={handleSendPayslips}
            disabled={isSendingPayslips || !run || (run.status !== 'calculated' && run.status !== 'approved')}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>{isSendingPayslips ? 'Sending...' : 'Send Payslips'}</span>
          </button>
        </div>
      </div>

      {/* Not Calculated Warning */}
      {run?.status === 'draft' && summary.totalGross === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Payroll Not Calculated Yet
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Click the "Calculate" button to compute payroll amounts based on employee salaries, hours worked, and applicable taxes/deductions.
                All amounts below will show as zero until calculation is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calculated - Review Notice */}
      {run?.status === 'calculated' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Review Payroll Amounts
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please verify all amounts are correct. If you need to make changes (update salaries, hours, deductions, etc.), 
                make those changes in the employee records and then click <span className="font-semibold">"Recalculate"</span> to update the amounts.
                Once verified, you can send payslips to employees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Employees</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{run?.employeeCount || employees.length}</p>
        </div>

        <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${run?.status === 'draft' && summary.totalGross === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Gross Pay</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {run?.status === 'draft' && summary.totalGross === 0 ? (
              <span className="text-gray-400 dark:text-gray-600">—</span>
            ) : (
              <CurrencyDisplay amount={summary.totalGross} />
            )}
          </p>
        </div>

        <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${run?.status === 'draft' && summary.totalDeductions === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-5 h-5 text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Deductions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {run?.status === 'draft' && summary.totalDeductions === 0 ? (
              <span className="text-gray-400 dark:text-gray-600">—</span>
            ) : (
              <CurrencyDisplay amount={summary.totalDeductions} />
            )}
          </p>
        </div>

        <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${run?.status === 'draft' && summary.totalNet === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Pay</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {run?.status === 'draft' && summary.totalNet === 0 ? (
              <span className="text-gray-400 dark:text-gray-600">—</span>
            ) : (
              <CurrencyDisplay amount={summary.totalNet} />
            )}
          </p>
        </div>
      </div>

      {/* Payroll Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payroll Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
            <div className="mt-1">
              <StatusBadge status={run.status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pay Period</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(run.pay_period_start || run.payPeriodStart)} - {formatDate(run.pay_period_end || run.payPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Payment Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(run.payment_date || run.paymentDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{run.run_type || run.runType || 'Regular'}</p>
          </div>
        </div>
      </div>

      {/* Tax Summary */}
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 ${run?.status === 'draft' && summary.totalGross === 0 ? 'opacity-50' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax & Deductions Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Wage Tax (Loonbelasting)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {run?.status === 'draft' && summary.totalWageTax === 0 ? (
                <span className="text-gray-400 dark:text-gray-600">Not calculated</span>
              ) : (
                <CurrencyDisplay amount={summary.totalWageTax} />
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">AOV (Old Age Pension)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {run?.status === 'draft' && summary.totalAOV === 0 ? (
                <span className="text-gray-400 dark:text-gray-600">Not calculated</span>
              ) : (
                <CurrencyDisplay amount={summary.totalAOV} />
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">AWW (Widow/Orphan)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {run?.status === 'draft' && summary.totalAWW === 0 ? (
                <span className="text-gray-400 dark:text-gray-600">Not calculated</span>
              ) : (
                <CurrencyDisplay amount={summary.totalAWW} />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Employee Breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center gap-1">
                    Employee
                    {sortField === 'fullName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Wage Tax
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AOV
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AWW
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Deductions
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {employees.map((employee: any) => {
                const isNotCalculated = run?.status === 'draft' && employee.grossPay === 0;
                return (
                  <tr key={employee.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isNotCalculated ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <WorkerAvatar fullName={employee.fullName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {employee.fullName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.employeeNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.grossPay} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.wageTax} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.aov} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.aww} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.totalDeductions} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                      {isNotCalculated ? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <CurrencyDisplay amount={employee.netPay} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">Total</td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={summary.totalGross} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={summary.totalWageTax} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={summary.totalAOV} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  <CurrencyDisplay amount={summary.totalAWW} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                  <CurrencyDisplay amount={summary.totalDeductions} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400">
                  <CurrencyDisplay amount={summary.totalNet} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Calculate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCalculateDialog}
        onClose={() => setShowCalculateDialog(false)}
        onConfirm={handleCalculate}
        title={run?.status === 'calculated' ? 'Recalculate Payroll' : 'Calculate Payroll'}
        message={
          run?.status === 'calculated' 
            ? `Are you sure you want to recalculate this payroll run? This will update all amounts based on the current employee data, pay structures, and time entries. Any manual adjustments may be overwritten.`
            : `Are you sure you want to calculate payroll for this run? This will create paychecks for all eligible workers based on their assigned pay structures and any recorded time entries.`
        }
        confirmText={run?.status === 'calculated' ? 'Recalculate' : 'Calculate'}
        variant="info"
        isLoading={calculatePayroll.isPending}
      />
    </div>
  );
}

