/**
 * Payroll Run Details Page
 * 
 * View comprehensive details of a payroll run including:
 * - Run summary and status
 * - List of paychecks
 * - Actions (calculate, approve, process, cancel)
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Users,
  Calculator,
  CheckCircle,
  Play,
  XCircle,
  ArrowLeft,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  usePayrollRun,
  useCalculatePayroll,
  useMarkPayrollRunForReview,
  useApprovePayrollRun,
  useProcessPayrollRun,
  useCancelPayrollRun,
  usePaychecks,
} from '@/hooks/usePayrollRuns';
import { DataTable, type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { Paycheck } from '@recruitiq/types';

export default function PayrollRunDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [showMarkForReviewDialog, setShowMarkForReviewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch data
  const { data: run, isLoading: isLoadingRun, error: runError } = usePayrollRun(id!);
  const { data: paychecks = [], isLoading: isLoadingPaychecks } = usePaychecks({ payrollRunId: id });

  // Mutations
  const calculatePayroll = useCalculatePayroll();
  const markForReview = useMarkPayrollRunForReview();
  const approvePayroll = useApprovePayrollRun();
  const processPayroll = useProcessPayrollRun();
  const cancelPayroll = useCancelPayrollRun();

  // Handle actions
  const handleCalculate = () => {
    if (!id) return;
    calculatePayroll.mutate(
      { payrollRunId: id, includeTimesheets: true, includeDeductions: true, includeTaxes: true },
      {
        onSuccess: () => {
          setShowCalculateDialog(false);
        },
      }
    );
  };

  const handleMarkForReview = () => {
    if (!id) return;
    markForReview.mutate(id, {
      onSuccess: () => {
        setShowMarkForReviewDialog(false);
      },
    });
  };

  const handleApprove = () => {
    if (!id) return;
    approvePayroll.mutate(
      { payrollRunId: id },
      {
        onSuccess: () => {
          setShowApproveDialog(false);
        },
      }
    );
  };

  const handleProcess = () => {
    if (!id) return;
    processPayroll.mutate(
      { payrollRunId: id },
      {
        onSuccess: () => {
          setShowProcessDialog(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (!id) return;
    cancelPayroll.mutate(id, {
      onSuccess: () => {
        setShowCancelDialog(false);
        navigate('/payroll-runs');
      },
    });
  };

  // Determine available actions based on status
  const canCalculate = run?.status === 'draft' || run?.status === 'calculating';
  const canMarkForReview = run?.status === 'calculating';
  const canApprove = run?.status === 'calculated';
  const canProcess = run?.status === 'approved';
  const canCancel = run?.status === 'draft' || run?.status === 'calculating' || run?.status === 'calculated' || run?.status === 'approved';

  // Debug logging
  console.log('Payroll Run Status:', run?.status);
  console.log('Can Calculate:', canCalculate);
  console.log('Can Mark for Review:', canMarkForReview);

  // Paycheck table columns
  const paycheckColumns: Column<Paycheck>[] = [
    {
      key: 'employee',
      header: 'Employee',
      accessor: (paycheck) => (
        <div>
          <div className="font-medium">{paycheck.employeeName}</div>
          <div className="text-sm text-gray-500">{paycheck.employeeId}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'grossPay',
      header: 'Gross Pay',
      accessor: (paycheck) => <CurrencyDisplay amount={paycheck.grossPay} />,
      sortable: true,
      align: 'right',
    },
    {
      key: 'taxes',
      header: 'Taxes',
      accessor: (paycheck) => {
        const totalTaxes = 
          paycheck.federalTax +
          paycheck.stateTax +
          paycheck.localTax +
          paycheck.socialSecurity +
          paycheck.medicare +
          paycheck.wageTax +
          paycheck.aovTax +
          paycheck.awwTax;
        return <CurrencyDisplay amount={totalTaxes} className="text-red-600" />;
      },
      sortable: true,
      align: 'right',
    },
    {
      key: 'deductions',
      header: 'Deductions',
      accessor: (paycheck) => {
        const totalDeductions = 
          paycheck.preTaxDeductions +
          paycheck.postTaxDeductions +
          paycheck.otherDeductions;
        return <CurrencyDisplay amount={totalDeductions} className="text-orange-600" />;
      },
      sortable: true,
      align: 'right',
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      accessor: (paycheck) => (
        <CurrencyDisplay amount={paycheck.netPay} className="font-semibold text-green-600" />
      ),
      sortable: true,
      align: 'right',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (paycheck) => <StatusBadge status={paycheck.status} />,
      sortable: true,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      accessor: (paycheck) => (
        <span className="capitalize">{paycheck.paymentMethod.replace('_', ' ')}</span>
      ),
    },
  ];

  if (isLoadingRun) {
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

  if (runError || !run) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/payroll-runs')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payroll Runs
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">Failed to load payroll run details</p>
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
            onClick={() => navigate('/payroll-runs')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{run.runName}</h1>
            <p className="text-sm text-gray-500">Run #{run.runNumber}</p>
          </div>
          <StatusBadge status={run.status} />
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          {canCalculate && (
            <button
              onClick={() => setShowCalculateDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {run.status === 'calculating' ? 'Recalculate' : 'Calculate'}
            </button>
          )}
          
          {canMarkForReview && (
            <button
              onClick={() => setShowMarkForReviewDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark for Review
            </button>
          )}
          
          {canApprove && (
            <button
              onClick={() => setShowApproveDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </button>
          )}
          
          {canProcess && (
            <button
              onClick={() => setShowProcessDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Process
            </button>
          )}
          
          {canCancel && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
          </div>
          <div className="text-sm text-gray-500">Pay Period</div>
          <div className="text-xs text-gray-400 mt-1">
            Payment: {formatDate(run.paymentDate)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {run.totalEmployees}
          </div>
          <div className="text-sm text-gray-500">Employees</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            <CurrencyDisplay amount={run.totalGrossPay} />
          </div>
          <div className="text-sm text-gray-500">Gross Pay</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            <CurrencyDisplay amount={run.totalNetPay} />
          </div>
          <div className="text-sm text-gray-500">Net Pay</div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Run Type</dt>
            <dd className="text-sm text-gray-900">{run.runType}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Total Taxes</dt>
            <dd className="text-sm text-gray-900">
              <CurrencyDisplay amount={run.totalTaxes} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Total Deductions</dt>
            <dd className="text-sm text-gray-900">
              <CurrencyDisplay amount={run.totalDeductions} />
            </dd>
          </div>
          
          {run.calculatedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Calculated At</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(run.calculatedAt)}</dd>
            </div>
          )}
          
          {run.approvedAt && (
            <>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Approved At</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(run.approvedAt)}</dd>
              </div>
              {run.approvedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Approved By</dt>
                  <dd className="text-sm text-gray-900">{run.approvedBy}</dd>
                </div>
              )}
            </>
          )}
          
          {run.processedAt && (
            <>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Processed At</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(run.processedAt)}</dd>
              </div>
              {run.processedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Processed By</dt>
                  <dd className="text-sm text-gray-900">{run.processedBy}</dd>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Paychecks Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Paychecks</h2>
          <span className="text-sm text-gray-500">
            {paychecks.length} {paychecks.length === 1 ? 'paycheck' : 'paychecks'}
          </span>
        </div>
        
        <DataTable
          data={paychecks}
          columns={paycheckColumns}
          isLoading={isLoadingPaychecks}
          searchable
          searchPlaceholder="Search by employee name..."
          actions={(paycheck) => (
            <button
              onClick={() => navigate(`/paychecks/${paycheck.id}`)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View
            </button>
          )}
        />
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showCalculateDialog}
        onClose={() => setShowCalculateDialog(false)}
        onConfirm={handleCalculate}
        title={run.status === 'calculating' ? 'Recalculate Payroll' : 'Calculate Payroll'}
        message={
          run.status === 'calculating'
            ? `Are you sure you want to recalculate payroll for ${run.runName}? This will delete existing paychecks and create new ones.`
            : `Are you sure you want to calculate payroll for ${run.runName}? This will create paychecks for all employees in the pay period.`
        }
        confirmText={run.status === 'calculating' ? 'Recalculate' : 'Calculate'}
        isLoading={calculatePayroll.isPending}
      />

      <ConfirmDialog
        isOpen={showMarkForReviewDialog}
        onClose={() => setShowMarkForReviewDialog(false)}
        onConfirm={handleMarkForReview}
        title="Mark for Review"
        message={`Are you sure you want to mark ${run.runName} for review? This will signal that the payroll is ready for manager approval.`}
        confirmText="Mark for Review"
        variant="info"
        isLoading={markForReview.isPending}
      />

      <ConfirmDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Payroll Run"
        message={`Are you sure you want to approve ${run.runName}? This action cannot be undone.`}
        confirmText="Approve"
        variant="info"
        isLoading={approvePayroll.isPending}
      />

      <ConfirmDialog
        isOpen={showProcessDialog}
        onClose={() => setShowProcessDialog(false)}
        onConfirm={handleProcess}
        title="Process Payroll Run"
        message={`Are you sure you want to process ${run.runName}? This will initiate payments to all employees.`}
        confirmText="Process"
        variant="info"
        isLoading={processPayroll.isPending}
      />

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Cancel Payroll Run"
        message={`Are you sure you want to cancel ${run.runName}? This action cannot be undone.`}
        confirmText="Cancel Run"
        variant="danger"
        isLoading={cancelPayroll.isPending}
      />
    </div>
  );
}

