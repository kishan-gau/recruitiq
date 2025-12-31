import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

import type { EmployeeDeduction } from '@recruitiq/types';

import { handleApiError } from '@/utils/errorHandler';

import { useDed } from '../hooks/useDeductions';

// Deduction Type Badge
function DeductionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    STATUTORY: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-500/10',
    VOLUNTARY: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-500/10',
    GARNISHMENT: 'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-500/10',
    LOAN: 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-500/10',
    OTHER: 'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/10',
  };

  const labels: Record<string, string> = {
    STATUTORY: 'Wettelijk',
    VOLUNTARY: 'Vrijwillig',
    GARNISHMENT: 'Beslag',
    LOAN: 'Lening',
    OTHER: 'Overig',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${variants[type] || variants.OTHER}`}>
      {labels[type] || type}
    </span>
  );
}

// Deduction Form Modal
function DeductionFormModal({
  isOpen,
  onClose,
  onSubmit,
  deduction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  deduction?: EmployeeDeduction | null;
}) {
  const [formData, setFormData] = useState({
    employeeId: deduction?.employeeId || '',
    deductionCode: deduction?.deductionCode || '',
    deductionName: deduction?.deductionName || '',
    deductionType: deduction?.deductionType || 'VOLUNTARY',
    deductionAmount: deduction?.deductionAmount || 0,
    deductionPercentage: deduction?.deductionPercentage || null,
    maxAmount: deduction?.maxAmount || null,
    startDate: deduction?.startDate ? new Date(deduction.startDate).toISOString().split('T')[0] : '',
    endDate: deduction?.endDate ? new Date(deduction.endDate).toISOString().split('T')[0] : '',
    isActive: deduction?.isActive ?? true,
    notes: deduction?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {deduction ? 'Aftrek Bewerken' : 'Nieuwe Aftrek'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medewerker ID</label>
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, _employeeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Aftrekcode</label>
                <input
                  type="text"
                  required
                  value={formData.deductionCode}
                  onChange={(e) => setFormData({ ...formData, deductionCode: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aftreknaam</label>
              <input
                type="text"
                required
                value={formData.deductionName}
                onChange={(e) => setFormData({ ...formData, deductionName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.deductionType}
                onChange={(e) => setFormData({ ...formData, deductionType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="STATUTORY">Wettelijk</option>
                <option value="VOLUNTARY">Vrijwillig</option>
                <option value="GARNISHMENT">Beslag</option>
                <option value="LOAN">Lening</option>
                <option value="OTHER">Overig</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bedrag</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deductionAmount}
                  onChange={(e) => setFormData({ ...formData, deductionAmount: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deductionPercentage || ''}
                  onChange={(e) => setFormData({ ...formData, deductionPercentage: e.target.value ? parseFloat(e.target.value) : null })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Bedrag</label>
              <input
                type="number"
                step="0.01"
                value={formData.maxAmount || ''}
                onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value ? parseFloat(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Startdatum</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Einddatum</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Opmerkingen</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 block text-sm text-gray-900">Actief</label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
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
                {deduction ? 'Bijwerken' : 'Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function DeductionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editDeduction, setEditDeduction] = useState<EmployeeDeduction | null>(null);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });

  const {
    deductions,
    isLoadingDeductions,
    isErrorDeductions,
    errorDeductions,
    createDeduction,
    updateDeduction,
    deleteDeduction,
  } = useDed();

  // Filter deductions
  const filteredDeductions = useMemo(() => {
    if (!deductions) return [];
    return deductions.filter((deduction) => {
      const matchesSearch = !filters.search || 
        deduction.deductionName.toLowerCase().includes(filters.search.toLowerCase()) ||
        deduction.deductionCode.toLowerCase().includes(filters.search.toLowerCase()) ||
        deduction.employeeId.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = !filters.type || deduction.deductionType === filters.type;
      const matchesStatus = !filters.status || 
        (filters.status === 'active' ? deduction.isActive : !deduction.isActive);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [deductions, filters]);

  const handleCreate = async (data: any) => {
    try {
      await createDeduction.mutateAsync(data);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Fout bij aanmaken aftrek' });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editDeduction) return;
    try {
      await updateDeduction.mutateAsync({ id: editDeduction.id, updates: data });
      setEditDeduction(null);
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Fout bij bijwerken aftrek' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Weet u zeker dat u "${name}" wilt verwijderen?`)) {
      try {
        await deleteDeduction.mutateAsync(id);
        queryClient.invalidateQueries({ queryKey: ['deductions'] });
      } catch (error) {
        handleApiError(error, { defaultMessage: 'Fout bij verwijderen aftrek' });
      }
    }
  };

  const handleReset = () => {
    setFilters({ search: '', type: '', status: '' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Aftrekken</h1>
            <p className="mt-1 text-sm text-gray-600">Beheer loonaftrekken voor medewerkers</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + Nieuwe Aftrek
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 bg-gray-50 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Zoek op naam, code of medewerker..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Alle types</option>
            <option value="STATUTORY">Wettelijk</option>
            <option value="VOLUNTARY">Vrijwillig</option>
            <option value="GARNISHMENT">Beslag</option>
            <option value="LOAN">Lening</option>
            <option value="OTHER">Overig</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingDeductions && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600">Aftrekken laden...</p>
        </div>
      )}

      {/* Error State */}
      {isErrorDeductions && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">Fout bij laden: {errorDeductions?.message || 'Onbekende fout'}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingDeductions && !isErrorDeductions && filteredDeductions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen aftrekken</h3>
          <p className="mt-1 text-sm text-gray-500">Begin met het aanmaken van uw eerste aftrek.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + Eerste Aftrek Aanmaken
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoadingDeductions && !isErrorDeductions && filteredDeductions.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medewerker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bedrag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeductions.map((deduction) => (
                <tr key={deduction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deduction.employeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deduction.deductionCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deduction.deductionName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <DeductionTypeBadge type={deduction.deductionType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deduction.deductionPercentage 
                      ? `${deduction.deductionPercentage}%`
                      : `$${deduction.deductionAmount.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(deduction.startDate).toLocaleDateString('nl-NL')}
                    {deduction.endDate && ` - ${new Date(deduction.endDate).toLocaleDateString('nl-NL')}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deduction.isActive ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Actief
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        Inactief
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditDeduction(deduction)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(deduction.id, deduction.deductionName)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <DeductionFormModal
        isOpen={showForm || !!editDeduction}
        onClose={() => {
          setShowForm(false);
          setEditDeduction(null);
        }}
        onSubmit={editDeduction ? handleUpdate : handleCreate}
        deduction={editDeduction}
      />
    </div>
  );
}
