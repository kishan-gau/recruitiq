import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, DollarSign, Users, Calendar, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusBadge, CurrencyDisplay, WorkerAvatar } from '@/components/ui';
import { mockPayrollRuns, mockWorkers } from '@/utils/mockData';
import { formatDate } from '@/utils/helpers';

export default function PayrollRunDetails() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<'fullName' | 'grossPay' | 'netPay'>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Find the payroll run
  const run = mockPayrollRuns.find((r) => r.id === runId);

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

  // Mock detailed payroll calculations for each employee
  const employeeData = mockWorkers.filter((w) => w.status === 'active').map((worker) => {
    const grossPay = worker.compensation;
    const wageTax = grossPay * 0.15; // 15% wage tax (simplified)
    const aov = grossPay * 0.04; // 4% AOV employee contribution
    const aww = grossPay * 0.015; // 1.5% AWW (simplified)
    const totalDeductions = wageTax + aov + aww;
    const netPay = grossPay - totalDeductions;

    return {
      id: worker.id,
      fullName: worker.fullName,
      employeeNumber: worker.employeeNumber,
      grossPay,
      wageTax,
      aov,
      aww,
      totalDeductions,
      netPay,
      status: 'calculated' as const,
    };
  });

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
    totalGross: employees.reduce((sum, e) => sum + e.grossPay, 0),
    totalWageTax: employees.reduce((sum, e) => sum + e.wageTax, 0),
    totalAOV: employees.reduce((sum, e) => sum + e.aov, 0),
    totalAWW: employees.reduce((sum, e) => sum + e.aww, 0),
    totalDeductions: employees.reduce((sum, e) => sum + e.totalDeductions, 0),
    totalNet: employees.reduce((sum, e) => sum + e.netPay, 0),
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
              {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            <Send className="w-5 h-5" />
            <span>Send Payslips</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Employees</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Gross Pay</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            <CurrencyDisplay amount={summary.totalGross} />
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-5 h-5 text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Deductions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            <CurrencyDisplay amount={summary.totalDeductions} />
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Pay</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            <CurrencyDisplay amount={summary.totalNet} />
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
              {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Payment Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(run.paymentDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">Regular</p>
          </div>
        </div>
      </div>

      {/* Tax Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax & Deductions Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Wage Tax (Loonbelasting)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              <CurrencyDisplay amount={summary.totalWageTax} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">AOV (Old Age Pension)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              <CurrencyDisplay amount={summary.totalAOV} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">AWW (Widow/Orphan)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              <CurrencyDisplay amount={summary.totalAWW} />
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
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                    <CurrencyDisplay amount={employee.grossPay} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                    <CurrencyDisplay amount={employee.wageTax} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                    <CurrencyDisplay amount={employee.aov} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                    <CurrencyDisplay amount={employee.aww} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400">
                    <CurrencyDisplay amount={employee.totalDeductions} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                    <CurrencyDisplay amount={employee.netPay} />
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
