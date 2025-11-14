import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Calendar, Building2, CreditCard } from 'lucide-react';
import WorkerAvatar from '@/components/ui/WorkerAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import type { Tab } from '@/components/ui/Tabs';
import { formatDate, maskAccountNumber } from '@/utils/helpers';
import EditWorkerModal from '@/components/modals/EditWorkerModal';
import WorkerPayStructure from '@/components/worker/WorkerPayStructure';
import SystemAccessPanel from '@/components/worker/SystemAccessPanel';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { useWorkerTypeTemplates } from '@/hooks/useWorkerTypes';

export default function WorkerDetails() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { paylinq } = usePaylinqAPI();
  const { error: showError } = useToast();
  const { data: workerTypes = [] } = useWorkerTypeTemplates({ status: 'active' });
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [worker, setWorker] = useState<any>(null);
  const [ytdSummary, setYtdSummary] = useState<any>(null);

  // Fetch worker details from API
  useEffect(() => {
    const fetchWorkerDetails = async () => {
      if (!workerId) return;

      try {
        setIsLoading(true);
        const response = await paylinq.getWorker(workerId);

        console.log('Worker API Response:', response); // Debug log

        if (response.success) {
          // API client returns response.data directly, so response IS the data
          // Backend controller returns: { success: true, employee: {...} }
          const w = response.employee || response.data?.employee || response;
          
          if (!w || !w.id) {
            console.error('Worker data missing ID:', w);
            throw new Error('Worker not found');
          }
          
          // Extract metadata fields if they exist
          const metadata = w.metadata || {};
          
          setWorker({
            id: w.employeeId || w.employee_id || w.id, // Use employeeId (from hris.employee), not payroll config id
            employeeNumber: w.employee_number || w.employeeNumber || 'N/A',
            fullName: w.fullName || w.full_name || `${w.firstName || w.first_name || ''} ${w.lastName || w.last_name || ''}`.trim() || 'Unknown',
            email: w.email || w.user_email || 'N/A',
            status: w.status || w.employment_status || w.employmentStatus || 'active',
            workerType: w.workerTypeName || w.worker_type_name || w.employmentType || w.employment_type || w.worker_type || w.workerType || metadata.workerType || 'N/A',
            hireDate: w.hire_date || w.hireDate || w.start_date || new Date().toISOString(),
            compensation: metadata.compensation || w.compensation || w.current_compensation || w.currentCompensation || 0,
            currency: w.currency || 'SRD',
            nationalId: w.tax_id || w.taxId || w.tax_id_number || w.taxIdNumber || w.national_id || metadata.nationalId || 'N/A',
            // Bank info (structured for tax-info tab)
            bankInfo: {
              bankName: w.bank_name || w.bankName || metadata.bankName || 'Not provided',
              accountNumber: w.account_number || w.accountNumber || w.bank_account_number || w.bankAccountNumber || 'N/A',
              accountType: w.account_type || w.accountType || 'checking',
              currency: w.currency || 'SRD',
            },
            // Tax info (structured for tax-info tab)
            taxInfo: {
              nationalId: w.tax_id || w.taxId || w.tax_id_number || w.taxIdNumber || w.national_id || metadata.nationalId || 'N/A',
              standardDeduction: w.standard_deduction || w.standardDeduction || w.tax_allowances || 0,
              dependents: w.dependents || 0,
              aovEnrolled: w.aov_enrolled || w.aovEnrolled || false,
              awwEnrolled: w.aww_enrolled || w.awwEnrolled || false,
            },
            // Personal info (check metadata for fields stored there)
            dateOfBirth: w.date_of_birth || w.dateOfBirth || metadata.dateOfBirth,
            gender: w.gender || metadata.gender,
            nationality: w.nationality || metadata.nationality,
            address: w.address || metadata.address,
            phoneNumber: w.phone_number || w.phoneNumber || metadata.phone,
            // Additional metadata fields
            department: metadata.department,
            position: metadata.position,
            payFrequency: metadata.payFrequency,
          });

          // Fetch YTD summary if available
          if (w.ytd_summary || w.ytdSummary) {
            setYtdSummary(w.ytd_summary || w.ytdSummary);
          }
        } else {
          console.error('Worker API response missing success flag:', response);
          throw new Error('Invalid response from server');
        }
      } catch (err: any) {
        console.error('Failed to load worker:', err);
        console.error('Worker ID:', workerId);
        showError(err.message || 'Failed to load worker details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkerDetails();
  }, [workerId, paylinq, showError]);

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    { id: 'pay-structure', label: 'Pay Structure' },
    { id: 'tax-info', label: 'Tax Info' },
    { id: 'bank-info', label: 'Bank Info' },
    { id: 'ytd-summary', label: 'YTD Summary' },
    { id: 'system-access', label: 'System Access' },
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
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
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
                {worker.payFrequency || 'monthly'}
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
                  {worker.payFrequency || 'monthly'}
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
                  {worker.workerType}
                </p>
              </div>
            </div>

            {worker.deductions && worker.deductions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Deductions</h4>
                <div className="space-y-2">
                  {worker.deductions.map((deduction: any) => (
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

      {/* Pay Structure Tab */}
      {activeTab === 'pay-structure' && worker && <WorkerPayStructure workerId={worker.id} workerName={worker.fullName} />}

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

      {/* System Access Tab */}
      {activeTab === 'system-access' && (
        <SystemAccessPanel
          employeeId={worker.id}
          employeeName={worker.fullName}
          employeeEmail={worker.email}
        />
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
          phone: worker.phoneNumber || '',
          nationalId: worker.nationalId,
          dateOfBirth: worker.dateOfBirth || '',
          startDate: worker.hireDate ? new Date(worker.hireDate).toISOString().split('T')[0] : '',
          workerType: worker.workerType,
          department: worker.department || '',
          position: worker.position || '',
          status: worker.status,
          compensation: worker.compensation,
          bankName: worker.bankInfo.bankName,
          bankAccount: worker.bankInfo.accountNumber,
          address: worker.address || '',
        }}
        onSuccess={() => {
          // Refetch worker data after update
          window.location.reload();
        }}
      />
    </div>
  );
}
