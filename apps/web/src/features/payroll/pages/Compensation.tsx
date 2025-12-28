import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PayComponent, CreatePayComponentRequest } from '@recruitiq/types';
import {
  usePayComponents,
  useCreatePayComponent,
  useUpdatePayComponent,
  useDeletePayComponent,
} from '../hooks/usePayComponents';
import { handleApiError } from '@/utils/errorHandler';

// Component Type Badge
function ComponentTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    EARNINGS: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-500/10',
    DEDUCTION: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-500/10',
    BENEFIT: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-500/10',
    TAX: 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-500/10',
  };

  const labels: Record<string, string> = {
    EARNINGS: 'Inkomsten',
    DEDUCTION: 'Inhouding',
    BENEFIT: 'Voordeel',
    TAX: 'Belasting',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
        variants[type] || variants.EARNINGS
      }`}
    >
      {labels[type] || type}
    </span>
  );
}

// Component Form Modal
function ComponentFormModal({
  isOpen,
  onClose,
  onSubmit,
  component,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePayComponentRequest) => void;
  component?: PayComponent | null;
}) {
  const [formData, setFormData] = useState<CreatePayComponentRequest>({
    componentCode: component?.componentCode || '',
    componentName: component?.componentName || '',
    componentType: component?.componentType || 'EARNINGS',
    description: component?.description || '',
    calculationMethod: component?.calculationMethod || 'FIXED',
    isActive: component?.isActive ?? true,
    isTaxable: component?.isTaxable ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {component ? 'Component Bewerken' : 'Nieuw Component'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Component Code</label>
              <input
                type="text"
                required
                value={formData.componentCode}
                onChange={(e) => setFormData({ ...formData, componentCode: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Component Naam</label>
              <input
                type="text"
                required
                value={formData.componentName}
                onChange={(e) => setFormData({ ...formData, componentName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.componentType}
                onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="EARNINGS">Inkomsten</option>
                <option value="DEDUCTION">Inhouding</option>
                <option value="BENEFIT">Voordeel</option>
                <option value="TAX">Belasting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Berekeningsmethode</label>
              <select
                value={formData.calculationMethod}
                onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="FIXED">Vast Bedrag</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FORMULA">Formule</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Beschrijving</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Actief</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Belastbaar</span>
              </label>
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
                {component ? 'Bijwerken' : 'Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main Compensation page
export default function CompensationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editComponent, setEditComponent] = useState<PayComponent | null>(null);

  // Queries and mutations
  const { data: components = [], isLoading, error } = usePayComponents();
  const createMutation = useCreatePayComponent();
  const updateMutation = useUpdatePayComponent();
  const deleteMutation = useDeletePayComponent();

  // Client-side filtering
  const filteredComponents = useMemo(() => {
    let filtered = components;

    if (typeFilter) {
      filtered = filtered.filter((c) => c.componentType === typeFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.componentCode.toLowerCase().includes(searchLower) ||
          c.componentName.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [components, typeFilter, search]);

  // Handlers
  const handleCreate = async (payload: CreatePayComponentRequest) => {
    try {
      await createMutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ['pay-components'] });
      setShowForm(false);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Fout bij aanmaken component' });
    }
  };

  const handleUpdate = async (payload: CreatePayComponentRequest) => {
    if (!editComponent) return;
    try {
      await updateMutation.mutateAsync({ id: editComponent.id, data: payload });
      queryClient.invalidateQueries({ queryKey: ['pay-components'] });
      setEditComponent(null);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Fout bij bijwerken component' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Weet u zeker dat u "${name}" wilt verwijderen?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ['pay-components'] });
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Fout bij verwijderen component' });
    }
  };

  const handleReset = () => {
    setSearch('');
    setTypeFilter('');
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
          <p className="text-sm text-red-800">Fout bij laden compensatie componenten</p>
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
            <h1 className="text-2xl font-semibold text-gray-900">Compensatie</h1>
            <p className="mt-1 text-sm text-gray-500">Beheer salariscomponenten en berekeningen</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Nieuw Component
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <input
            type="text"
            placeholder="Zoek op code of naam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Alle types</option>
            <option value="EARNINGS">Inkomsten</option>
            <option value="DEDUCTION">Inhouding</option>
            <option value="BENEFIT">Voordeel</option>
            <option value="TAX">Belasting</option>
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

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Totaal Componenten</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{components.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Inkomsten</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {components.filter((c) => c.componentType === 'EARNINGS').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Inhoudingen</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {components.filter((c) => c.componentType === 'DEDUCTION').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Voordelen</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {components.filter((c) => c.componentType === 'BENEFIT').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Berekeningsmethode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Belastbaar
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
            {filteredComponents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  Geen componenten gevonden
                </td>
              </tr>
            ) : (
              filteredComponents.map((component) => (
                <tr key={component.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {component.componentCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {component.componentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ComponentTypeBadge type={component.componentType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {component.calculationMethod === 'FIXED' && 'Vast Bedrag'}
                    {component.calculationMethod === 'PERCENTAGE' && 'Percentage'}
                    {component.calculationMethod === 'FORMULA' && 'Formule'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {component.isTaxable ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-gray-400">Nee</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {component.isActive ? (
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
                        onClick={() => setEditComponent(component)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(component.id, component.componentName)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <ComponentFormModal
        isOpen={showForm || !!editComponent}
        onClose={() => {
          setShowForm(false);
          setEditComponent(null);
        }}
        onSubmit={editComponent ? handleUpdate : handleCreate}
        component={editComponent}
      />
    </div>
  );
}
