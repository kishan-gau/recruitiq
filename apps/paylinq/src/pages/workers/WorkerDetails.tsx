import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Calendar, Building2, CreditCard } from 'lucide-react';
import { WorkerAvatar, StatusBadge, Badge, Tabs, CurrencyDisplay } from '@/components/ui';
import type { Tab } from '@/components/ui';
import { mockWorkers, mockYTDSummary } from '@/utils/mockData';
import { formatDate, maskAccountNumber } from '@/utils/helpers';
import EditWorkerModal from '@/components/modals/EditWorkerModal';

export default function WorkerDetails() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Find the worker
  const worker = mockWorkers.find((w) => w.id === workerId);
  const ytdSummary = mockYTDSummary[workerId as keyof typeof mockYTDSummary];

  if (!worker) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-900 dark:text-red-100 font-medium">Worker not found</p>
        </div>
      </div>
    );
  }

  // Define tabs
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'tax-info', label: 'Tax Info' },
    { id: 'bank-info', label: 'Bank Info' },
    { id: 'ytd-summary', label: 'YTD Summary' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/workers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Worker Details</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{worker.employeeNumber}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Edit className="w-5 h-5" />
          <span>Edit Worker</span>
        </button>
      </div>

      {/* Worker Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <WorkerAvatar fullName={worker.fullName} size="xl" />
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{worker.fullName}</h2>
                <StatusBadge status={worker.status} />
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{worker.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Hired: {formatDate(worker.hireDate)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="blue">{worker.workerType}</Badge>
            <div className="mt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Compensation</p>
              <CurrencyDisplay amount={worker.compensation} className="text-xl font-bold" currency={worker.currency} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                per {worker.workerType === 'Hourly' ? 'hour' : 'month'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Employee Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.employeeNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">National ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.nationalId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Worker Type</p>
                <Badge variant="blue" size="sm">{worker.workerType}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <StatusBadge status={worker.status} size="sm" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hire Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(worker.hireDate)}</p>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employment Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Compensation</p>
                <CurrencyDisplay amount={worker.compensation} className="text-sm font-medium" currency={worker.currency} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payment Frequency</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {worker.workerType === 'Hourly' ? 'Hourly' : 'Monthly'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Currency</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.currency}</p>
              </div>
              {worker.salaryIncrease && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                    ✓ Salary increase pending approval
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compensation' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compensation Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Base Compensation</p>
                <CurrencyDisplay amount={worker.compensation} className="text-2xl font-bold" currency={worker.currency} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {worker.workerType === 'Hourly' ? 'Hourly' : 'Salary'}
                </p>
              </div>
            </div>

            {worker.deductions && worker.deductions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Deductions</h4>
                <div className="space-y-2">
                  {worker.deductions.map((deduction) => (
                    <div
                      key={deduction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{deduction.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{deduction.type}</p>
                      </div>
                      <CurrencyDisplay amount={deduction.amount} variant="negative" className="text-sm font-medium" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tax-info' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">National ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.taxInfo.nationalId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Standard Deduction</p>
                <CurrencyDisplay amount={worker.taxInfo.standardDeduction} className="text-sm font-medium" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dependents</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.taxInfo.dependents}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">AOV Enrolled</p>
                <Badge variant={worker.taxInfo.aovEnrolled ? 'green' : 'gray'} size="sm">
                  {worker.taxInfo.aovEnrolled ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">AWW Enrolled</p>
                <Badge variant={worker.taxInfo.awwEnrolled ? 'green' : 'gray'} size="sm">
                  {worker.taxInfo.awwEnrolled ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Social Security</h4>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <p>• AOV (Old Age Pension): {worker.taxInfo.aovEnrolled ? '4% employee + 2% employer' : 'Not enrolled'}</p>
                <p>• AWW (Widow/Orphan): {worker.taxInfo.awwEnrolled ? 'Enrolled' : 'Not enrolled'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank-info' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Information</h3>
            <CreditCard className="w-6 h-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
              <div className="flex items-center space-x-2 mt-1">
                <Building2 className="w-5 h-5 text-gray-400" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.bankInfo.bankName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Number</p>
              <p className="text-sm font-medium font-mono text-gray-900 dark:text-white">
                {maskAccountNumber(worker.bankInfo.accountNumber)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {worker.bankInfo.accountType}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Currency</p>
              <Badge variant="blue" size="sm">{worker.bankInfo.currency}</Badge>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ytd-summary' && ytdSummary && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Year-to-Date Summary (2025)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">Gross Pay</p>
              <CurrencyDisplay amount={ytdSummary.grossPay} className="text-2xl font-bold" variant="positive" />
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">Wage Tax</p>
              <CurrencyDisplay amount={ytdSummary.wageTax} className="text-2xl font-bold" variant="negative" />
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">AOV (4%)</p>
              <CurrencyDisplay amount={ytdSummary.aov} className="text-2xl font-bold" variant="negative" />
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">AWW</p>
              <CurrencyDisplay amount={ytdSummary.aww} className="text-2xl font-bold" variant="negative" />
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">Other Deductions</p>
              <CurrencyDisplay amount={ytdSummary.otherDeductions} className="text-2xl font-bold" variant="negative" />
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-400">Net Pay</p>
              <CurrencyDisplay amount={ytdSummary.netPay} className="text-2xl font-bold" />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Deductions</span>
              <CurrencyDisplay
                amount={ytdSummary.wageTax + ytdSummary.aov + ytdSummary.aww + ytdSummary.otherDeductions}
                className="text-lg font-semibold"
                variant="negative"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ytd-summary' && !ytdSummary && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No YTD summary available for this worker</p>
        </div>
      )}

      {/* Edit Worker Modal */}
      <EditWorkerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        worker={{
          id: worker.id,
          employeeNumber: worker.employeeNumber,
          fullName: worker.fullName,
          email: worker.email,
          phone: '',
          nationalId: worker.nationalId,
          dateOfBirth: worker.hireDate,
          startDate: worker.hireDate,
          workerType: worker.workerType,
          department: '',
          position: '',
          status: worker.status,
          compensation: worker.compensation,
          bankName: worker.bankInfo.bankName,
          bankAccount: worker.bankInfo.accountNumber,
          address: '',
        }}
        onSuccess={() => {
          // In real app, this would trigger a refetch
        }}
      />
    </div>
  );
}
