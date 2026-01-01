import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      payrollName: '',
      periodStart: '',
      periodEnd: '',
      paymentDate: '',
      runType: 'REGULAR',
      status: 'draft',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nieuwe Loonrun</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Run Naam
              </label>
              <input
                type="text"
                required
                value={formData.payrollName}
                onChange={(e) => setFormData({ ...formData, payrollName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Run Type
              </label>
              <select
                value={formData.runType}
                onChange={(e) => setFormData({ ...formData, runType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="REGULAR">Regulier</option>
                <option value="VAKANTIEGELD">Vakantiegeld</option>
                <option value="BONUS">Bonus</option>
                <option value="CORRECTION">Correctie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Periode Start
              </label>
              <input
                type="date"
                required
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Periode Eind
              </label>
              <input
                type="date"
                required
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Betaaldatum
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

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
