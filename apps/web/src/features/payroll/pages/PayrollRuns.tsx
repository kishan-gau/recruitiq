import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { z } from 'zod';

import type { PayrollRun, PayrollRunFilters, CreatePayrollRunRequest } from '@recruitiq/types';

import { handleApiError } from '@/utils/errorHandler';
import EnhancedError, { parseApiError, type EnhancedErrorProps } from '@/components/EnhancedError';

import {
  usePayrollRuns,
  useCreatePayrollRun,
  useCalculatePayroll,
  useApprovePayroll,
  useProcessPayroll,
} from '../hooks/usePayrollRuns';
import { WorkflowStepper } from '../components/WorkflowStepper';
import PayslipsList from '../components/payslips/PayslipsList';

// Zod validation schema for payroll run creation
const payrollRunSchema = z.object({
  payrollName: z.string()
    .min(3, 'Naam moet minimaal 3 tekens bevatten')
    .max(100, 'Naam mag niet langer zijn dan 100 tekens'),
  periodStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum (YYYY-MM-DD)')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Ongeldige datum'),
  periodEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum (YYYY-MM-DD)')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Ongeldige datum'),
  paymentDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum (YYYY-MM-DD)')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Ongeldige datum'),
  runType: z.enum(['REGULAR', 'VAKANTIEGELD', 'BONUS', 'CORRECTION']),
  status: z.enum(['draft', 'calculating', 'calculated', 'approved', 'processing', 'processed', 'cancelled']).optional(),
}).refine((data) => {
  // Validate that periodEnd is after periodStart
  const start = new Date(data.periodStart);
  const end = new Date(data.periodEnd);
  return end > start;
}, {
  message: 'Periode eind moet na periode start zijn',
  path: ['periodEnd'],
}).refine((data) => {
  // Validate that paymentDate is not before periodStart
  const start = new Date(data.periodStart);
  const payment = new Date(data.paymentDate);
  return payment >= start;
}, {
  message: 'Betaaldatum mag niet voor periode start zijn',
  path: ['paymentDate'],
});

// StatusBadge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/10',
    calculating: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-500/10',
    calculated: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-500/10',
    approved: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-500/10',
    processing: 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-500/10',
    processed: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-500/10',
    cancelled: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-500/10',
  };

  const labels: Record<string, string> = {
    draft: 'Concept',
    calculating: 'Berekenen...',
    calculated: 'Berekend',
    approved: 'Goedgekeurd',
    processing: 'Verwerken...',
    processed: 'Verwerkt',
    cancelled: 'Geannuleerd',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
        variants[status] || variants.draft
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// CreatePayrollRunModal component
function CreatePayrollRunModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePayrollRunRequest) => void;
}) {
  const [formData, setFormData] = useState<CreatePayrollRunRequest>({
    payrollName: '',
    periodStart: '',
    periodEnd: '',
    paymentDate: '',
    runType: 'REGULAR',
    status: 'draft',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate a single field
  const validateField = (name: string, value: any) => {
    try {
      const fieldSchema = payrollRunSchema.shape[name as keyof typeof payrollRunSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [name]: error.errors[0]?.message || 'Validatiefout',
        }));
      }
    }
  };

  // Validate entire form with cross-field validations
  const validateForm = (): boolean => {
    try {
      payrollRunSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate on change if field has been touched
    if (touched[name]) {
      setTimeout(() => validateField(name, value), 100);
    }
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, formData[name as keyof typeof formData]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);
    
    // Validate entire form
    if (validateForm()) {
      onSubmit(formData);
      // Reset form
      setFormData({
        payrollName: '',
        periodStart: '',
        periodEnd: '',
        paymentDate: '',
        runType: 'REGULAR',
        status: 'draft',
      });
      setErrors({});
      setTouched({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nieuwe Loonrun</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Run Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Run Naam <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.payrollName}
                onChange={(e) => handleChange('payrollName', e.target.value)}
                onBlur={() => handleBlur('payrollName')}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.payrollName 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="bijv. Loonrun Januari 2026"
              />
              {errors.payrollName && (
                <p className="mt-1 text-xs text-red-600">{errors.payrollName}</p>
              )}
              {!errors.payrollName && !touched.payrollName && (
                <p className="mt-1 text-xs text-gray-500">Minimaal 3 tekens, maximaal 100 tekens</p>
              )}
            </div>

            {/* Run Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Run Type
              </label>
              <select
                value={formData.runType}
                onChange={(e) => handleChange('runType', e.target.value)}
                onBlur={() => handleBlur('runType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="REGULAR">Regulier</option>
                <option value="VAKANTIEGELD">Vakantiegeld</option>
                <option value="BONUS">Bonus</option>
                <option value="CORRECTION">Correctie</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Type loonrun dat verwerkt wordt</p>
            </div>

            {/* Period Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Periode Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.periodStart}
                onChange={(e) => handleChange('periodStart', e.target.value)}
                onBlur={() => handleBlur('periodStart')}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.periodStart 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.periodStart && (
                <p className="mt-1 text-xs text-red-600">{errors.periodStart}</p>
              )}
            </div>

            {/* Period End */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Periode Eind <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.periodEnd}
                onChange={(e) => handleChange('periodEnd', e.target.value)}
                onBlur={() => handleBlur('periodEnd')}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.periodEnd 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.periodEnd && (
                <p className="mt-1 text-xs text-red-600">{errors.periodEnd}</p>
              )}
              {!errors.periodEnd && (
                <p className="mt-1 text-xs text-gray-500">Moet na periode start zijn</p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Betaaldatum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleChange('paymentDate', e.target.value)}
                onBlur={() => handleBlur('paymentDate')}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.paymentDate 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.paymentDate && (
                <p className="mt-1 text-xs text-red-600">{errors.paymentDate}</p>
              )}
              {!errors.paymentDate && (
                <p className="mt-1 text-xs text-gray-500">Mag niet voor periode start zijn</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Aanmaken
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main PayrollRuns page component
export default function PayrollRunsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showPayslips, setShowPayslips] = useState<PayrollRun | null>(null);
  const [enhancedError, setEnhancedError] = useState<EnhancedErrorProps | null>(null);

  // Build filters
  const filters: PayrollRunFilters = useMemo(() => {
    const f: PayrollRunFilters = {};
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [statusFilter]);

  // Queries and mutations
  const { data: runs = [], isLoading, error } = usePayrollRuns(filters);
  const createMutation = useCreatePayrollRun();
  const calculateMutation = useCalculatePayroll();
  const approveMutation = useApprovePayroll();
  const processMutation = useProcessPayroll();

  // Client-side search filter
  const filteredRuns = useMemo(() => {
    if (!search.trim()) return runs;
    const searchLower = search.toLowerCase();
    return runs.filter(
      (run) =>
        run.runNumber.toLowerCase().includes(searchLower) ||
        run.runName.toLowerCase().includes(searchLower)
    );
  }, [runs, search]);

  // Handlers
  const handleCreate = async (payload: CreatePayrollRunRequest) => {
    try {
      await createMutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      setShowCreate(false);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Fout bij aanmaken loonrun' });
    }
  };

  const handleCalculate = async (runId: string) => {
    if (!confirm('Weet u zeker dat u deze loonrun wilt berekenen?')) return;
    try {
      await calculateMutation.mutateAsync({ payrollRunId: runId });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Fout bij berekenen loonrun' });
    }
  };

  const handleApprove = async (runId: string) => {
    if (!confirm('Weet u zeker dat u deze loonrun wilt goedkeuren?')) return;
    try {
      setEnhancedError(null); // Clear previous errors
      await approveMutation.mutateAsync({ payrollRunId: runId });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    } catch (err: any) {
      const errorProps = parseApiError(err);
      setEnhancedError({
        ...errorProps,
        title: errorProps.title || 'Fout bij goedkeuren loonrun',
        onClose: () => setEnhancedError(null),
      });
    }
  };

  const handleProcess = async (runId: string) => {
    if (!confirm('Weet u zeker dat u deze loonrun wilt verwerken?')) return;
    try {
      setEnhancedError(null); // Clear previous errors
      await processMutation.mutateAsync({ payrollRunId: runId });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    } catch (err: any) {
      const errorProps = parseApiError(err);
      setEnhancedError({
        ...errorProps,
        title: errorProps.title || 'Fout bij verwerken loonrun',
        onClose: () => setEnhancedError(null),
      });
    }
  };

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Fout bij laden loonruns</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Loonruns</h1>
            <p className="mt-1 text-sm text-gray-500">
              Beheer loonruns en verwerk salarissen
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Nieuwe Loonrun
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <input
            type="text"
            placeholder="Zoek op nummer of naam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Alle statussen</option>
            <option value="draft">Concept</option>
            <option value="calculated">Berekend</option>
            <option value="approved">Goedgekeurd</option>
            <option value="processed">Verwerkt</option>
            <option value="cancelled">Geannuleerd</option>
          </select>
        </div>
        <div>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {enhancedError && (
        <div className="mb-6">
          <EnhancedError {...enhancedError} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Totaal Runs</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{runs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Concept</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {runs.filter((r) => r.status === 'draft').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Goedgekeurd</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {runs.filter((r) => r.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Verwerkt</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {runs.filter((r) => r.status === 'processed').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run Nummer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Periode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betaaldatum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medewerkers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bruto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Netto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  Geen loonruns gevonden
                </td>
              </tr>
            ) : (
              filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.runNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {run.runName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.payPeriodStart).toLocaleDateString('nl-NL')} -{' '}
                    {new Date(run.payPeriodEnd).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.paymentDate).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.totalEmployees || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    €{(run.totalGrossPay || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    €{(run.totalNetPay || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {run.status === 'draft' && (
                        <button
                          onClick={() => handleCalculate(run.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Berekenen
                        </button>
                      )}
                      {run.status === 'calculated' && (
                        <button
                          onClick={() => handleApprove(run.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Goedkeuren
                        </button>
                      )}
                      {run.status === 'approved' && (
                        <button
                          onClick={() => handleProcess(run.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Verwerken
                        </button>
                      )}
                      {run.status === 'processed' && (
                        <button
                          onClick={() => setShowPayslips(run)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Loonstroken
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <CreatePayrollRunModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      {/* Detail Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setSelectedRun(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Loonrun Details</h3>
              
              {/* Workflow Progress Indicator */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Workflow Status</h4>
                <WorkflowStepper 
                  currentStatus={selectedRun.status} 
                  showLabels={true}
                  showDescriptions={false}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Run Nummer</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRun.runNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Naam</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRun.runName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRun.runType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <StatusBadge status={selectedRun.status} />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Periode</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Start</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedRun.payPeriodStart).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Eind</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedRun.payPeriodEnd).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Betaaldatum</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedRun.paymentDate).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Totalen</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Medewerkers</p>
                      <p className="text-sm font-medium text-gray-900">{selectedRun.totalEmployees || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bruto Loon</p>
                      <p className="text-sm font-medium text-gray-900">
                        €{(selectedRun.totalGrossPay || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Totaal Belasting</p>
                      <p className="text-sm font-medium text-gray-900">
                        €{(selectedRun.totalTaxes || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Netto Loon</p>
                      <p className="text-sm font-medium text-gray-900">
                        €{(selectedRun.totalNetPay || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedRun.approvedAt && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Goedkeuring</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Goedgekeurd op</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedRun.approvedAt).toLocaleString('nl-NL')}
                        </p>
                      </div>
                      {selectedRun.approvedBy && (
                        <div>
                          <p className="text-sm text-gray-500">Goedgekeurd door</p>
                          <p className="text-sm font-medium text-gray-900">{selectedRun.approvedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedRun.processedAt && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Verwerking</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Verwerkt op</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedRun.processedAt).toLocaleString('nl-NL')}
                        </p>
                      </div>
                      {selectedRun.processedBy && (
                        <div>
                          <p className="text-sm text-gray-500">Verwerkt door</p>
                          <p className="text-sm font-medium text-gray-900">{selectedRun.processedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedRun(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslips List Modal */}
      {showPayslips && (
        <PayslipsList
          payrollRunId={showPayslips.id}
          runNumber={showPayslips.runNumber}
          runName={showPayslips.runName}
          isOpen={true}
          onClose={() => setShowPayslips(null)}
        />
      )}
    </div>
  );
}
