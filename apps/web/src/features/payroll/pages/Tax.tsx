import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

import type { TaxRule, CreateVersionRequest } from '@recruitiq/types';

import { handleApiError } from '@/utils/errorHandler';

import { useTax } from '../hooks/useTax';

// Tax Type Badge
function TaxTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    INCOME: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-500/10',
    SOCIAL_SECURITY: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-500/10',
    PAYROLL: 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-500/10',
    OTHER: 'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/10',
  };

  const labels: Record<string, string> = {
    INCOME: 'Inkomstenbelasting',
    SOCIAL_SECURITY: 'Sociale Zekerheid',
    PAYROLL: 'Loonbelasting',
    OTHER: 'Overig',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${variants[type] || variants.OTHER}`}>
      {labels[type] || type}
    </span>
  );
}

// Tax Rule Form Modal
function TaxRuleFormModal({
  isOpen,
  onClose,
  onSubmit,
  rule,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  rule?: TaxRule | null;
}) {
  const [formData, setFormData] = useState({
    ruleCode: rule?.ruleCode || '',
    ruleName: rule?.ruleName || '',
    ruleType: rule?.ruleType || 'INCOME',
    description: rule?.description || '',
    country: rule?.country || 'SR',
    isActive: rule?.isActive ?? true,
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {rule ? 'Belastingregel Bewerken' : 'Nieuwe Belastingregel'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Regelcode</label>
              <input
                type="text"
                required
                value={formData.ruleCode}
                onChange={(e) => setFormData({ ...formData, ruleCode: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Regelnaam</label>
              <input
                type="text"
                required
                value={formData.ruleName}
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.ruleType}
                onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="INCOME">Inkomstenbelasting</option>
                <option value="SOCIAL_SECURITY">Sociale Zekerheid</option>
                <option value="PAYROLL">Loonbelasting</option>
                <option value="OTHER">Overig</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Land</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="SR">Suriname</option>
                <option value="NL">Nederland</option>
                <option value="US">Verenigde Staten</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Beschrijving</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                {rule ? 'Bijwerken' : 'Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TaxPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<TaxRule | null>(null);
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });

  const {
    taxRules,
    isLoadingRules,
    isErrorRules,
    errorRules,
    createTaxRule,
    updateTaxRule,
    deleteTaxRule,
  } = useTax();

  // Filter rules
  const filteredRules = useMemo(() => {
    if (!taxRules) return [];
    return taxRules.filter((rule) => {
      const matchesSearch = !filters.search || 
        rule.ruleName.toLowerCase().includes(filters.search.toLowerCase()) ||
        rule.ruleCode.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = !filters.status || 
        (filters.status === 'active' ? rule.isActive : !rule.isActive);
      const matchesType = !filters.type || rule.ruleType === filters.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [taxRules, filters]);

  const handleCreate = async (data: any) => {
    try {
      await createTaxRule.mutateAsync(data);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Fout bij aanmaken belastingregel' });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editRule) return;
    try {
      await updateTaxRule.mutateAsync({ id: editRule.id, updates: data });
      setEditRule(null);
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Fout bij bijwerken belastingregel' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Weet u zeker dat u "${name}" wilt verwijderen?`)) {
      try {
        await deleteTaxRule.mutateAsync(id);
        queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      } catch (error) {
        handleApiError(error, { defaultMessage: 'Fout bij verwijderen belastingregel' });
      }
    }
  };

  const handleReset = () => {
    setFilters({ search: '', status: '', type: '' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Belastingregels</h1>
            <p className="mt-1 text-sm text-gray-600">Beheer belastingregels en berekeningsinstellingen</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + Nieuwe Regel
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 bg-gray-50 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Zoek op naam of code..."
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
            <option value="INCOME">Inkomstenbelasting</option>
            <option value="SOCIAL_SECURITY">Sociale Zekerheid</option>
            <option value="PAYROLL">Loonbelasting</option>
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
      {isLoadingRules && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600">Belastingregels laden...</p>
        </div>
      )}

      {/* Error State */}
      {isErrorRules && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">Fout bij laden: {errorRules?.message || 'Onbekende fout'}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingRules && !isErrorRules && filteredRules.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen belastingregels</h3>
          <p className="mt-1 text-sm text-gray-500">Begin met het aanmaken van uw eerste belastingregel.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + Eerste Regel Aanmaken
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoadingRules && !isErrorRules && filteredRules.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Land</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.ruleCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.ruleName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TaxTypeBadge type={rule.ruleType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rule.isActive ? (
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
                        onClick={() => setEditRule(rule)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id, rule.ruleName)}
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
      <TaxRuleFormModal
        isOpen={showForm || !!editRule}
        onClose={() => {
          setShowForm(false);
          setEditRule(null);
        }}
        onSubmit={editRule ? handleUpdate : handleCreate}
        rule={editRule}
      />
    </div>
  );
}
