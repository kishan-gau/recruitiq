import { useState, useMemo } from 'react';

import {
  useContracts,
  useContract,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from '@/features/hris/hooks/useContracts';
import { getErrorMessage, getValidationErrors } from '@/utils/errorHandler';

import { formatDate } from '../../../utils/formatDate';

const statusLabels: Record<string, string> = {
  draft: 'Concept',
  active: 'Actief',
  expired: 'Verlopen',
  terminated: 'Beëindigd',
  pending_signature: 'Wachting op Ondertekening',
};

const contractTypeLabels: Record<string, string> = {
  permanent: 'Permanent',
  fixed_term: 'Bepaald Tijd',
  temporary: 'Tijdelijk',
  part_time: 'Deeltijd',
  internship: 'Stageplek',
};

interface StatusPillProps {
  status: string;
}

function StatusPill({ status }: StatusPillProps) {
  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800',
    pending_signature: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    contractType: typeFilter || undefined,
  }), [searchQuery, statusFilter, typeFilter]);

  const { data: contracts = [], isLoading, isError, error, refetch } = useContracts(filters);
  const { data: selectedContract } = useContract(selectedId || undefined);
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();
  const deleteMutation = useDeleteContract();

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setTypeFilter(null);
  };

  const handleOpenCreate = () => setIsCreateOpen(true);
  const handleCloseCreate = () => setIsCreateOpen(false);
  const handleOpenEdit = (id: string) => setEditId(id);
  const handleCloseEdit = () => setEditId(null);
  const handleView = (id: string) => setSelectedId(id);
  const handleCloseDetails = () => setSelectedId(null);

  const handleCreate = async (payload: any) => {
    try {
      await createMutation.mutateAsync(payload);
      setIsCreateOpen(false);
    } catch (e) {
      // Toon algemene fout en hergooi zodat het formulier inline fouten kan tonen
      alert(getErrorMessage(e, 'Aanmaken van contract mislukt'));
      throw e;
    }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      await updateMutation.mutateAsync({ contractId: id, data: payload });
      setEditId(null);
    } catch (e) {
      // Toon algemene fout en hergooi zodat het formulier inline fouten kan tonen
      alert(getErrorMessage(e, 'Bijwerken van contract mislukt'));
      throw e;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt verwijderen?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      alert(getErrorMessage(e, 'Verwijderen van contract mislukt'));
    }
  };

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <strong>Fout bij laden contracten:</strong> {error?.message || 'Onbekende fout'}
          <button
            onClick={() => refetch()}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Contracten</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Nieuw Contract
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoeken
            </label>
            <input
              type="text"
              placeholder="Naam, werknemer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle statussen</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle types</option>
              {Object.entries(contractTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Filters Wissen
            </button>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            Contracten laden...
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Geen contracten gevonden
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Werknemer</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Contract Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Startdatum</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Einddatum</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract: any) => (
                <tr key={contract.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">{contract.employeeName || contract.employee_name || 'N/A'}</td>
                  <td className="px-6 py-3 text-sm">
                    {contractTypeLabels[contract.contractType || contract.contract_type] || contract.contractType || 'N/A'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {formatDate(contract.startDate || contract.start_date)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {formatDate(contract.endDate || contract.end_date)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <StatusPill status={contract.status} />
                  </td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    <button
                      type="button"
                      onClick={() => handleView(contract.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Bekijken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(contract.id)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      Bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(contract.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail pane */}
      {selectedId && selectedContract && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Details contract</h2>
              <p className="mt-1 text-sm text-gray-600">
                {contractTypeLabels[selectedContract.contractType || selectedContract.contract_type] || selectedContract.contractType || 'Onbekend'}
                {' '}—{' '}
                <StatusPill status={selectedContract.status} />
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseDetails}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              Sluiten
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-xs font-semibold text-gray-500">Werknemer</div>
              <div className="text-sm text-gray-900">{selectedContract.employeeName || selectedContract.employee_name || '–'}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-xs font-semibold text-gray-500">Startdatum</div>
              <div className="text-sm text-gray-900">{formatDate(selectedContract.startDate || selectedContract.start_date)}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-xs font-semibold text-gray-500">Einddatum</div>
              <div className="text-sm text-gray-900">{formatDate(selectedContract.endDate || selectedContract.end_date)}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3 md:col-span-2">
              <div className="text-xs font-semibold text-gray-500">Status</div>
              <div className="text-sm text-gray-900">{statusLabels[selectedContract.status] || selectedContract.status || '–'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <Modal title="Nieuw contract" onClose={handleCloseCreate}>
          <ContractForm onSubmit={handleCreate} onCancel={handleCloseCreate} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editId && (
        <Modal title="Contract bewerken" onClose={handleCloseEdit}>
          <ContractForm
            initial={contracts.find((c: any) => c.id === editId) || undefined}
            onSubmit={(payload) => handleUpdate(editId, payload)}
            onCancel={handleCloseEdit}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
          >
            Sluiten
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ContractForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: any;
  onSubmit: (payload: any) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(initial?._employeeId || initial?.employee_id || '');
  const [contractType, setContractType] = useState(initial?.contractType || initial?.contract_type || '');
  const [startDate, setStartDate] = useState(initial?.startDate || initial?.start_date || '');
  const [endDate, setEndDate] = useState(initial?.endDate || initial?.end_date || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');

  const isValidUuidV4 = (value: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!_employeeId?.trim()) {
      newErrors.employeeId = 'Werknemer ID is verplicht';
    } else if (!isValidUuidV4(_employeeId.trim())) {
      newErrors.employeeId = 'Werknemer ID moet een geldige UUID zijn';
    }

    if (!contractType) {
      newErrors.contractType = 'Contracttype is verplicht';
    } else if (!Object.keys(contractTypeLabels).includes(contractType)) {
      newErrors.contractType = 'Ongeldig contracttype';
    }

    if (!startDate) {
      newErrors.startDate = 'Startdatum is verplicht';
    }

    if (endDate) {
      const sd = new Date(startDate);
      const ed = new Date(endDate);
      if (!isNaN(sd.getTime()) && !isNaN(ed.getTime()) && ed.getTime() < sd.getTime()) {
        newErrors.endDate = 'Einddatum mag niet vóór startdatum liggen';
      }
    }

    if (!status) {
      newErrors.status = 'Status is verplicht';
    } else if (!Object.keys(statusLabels).includes(status)) {
      newErrors.status = 'Ongeldige status';
    }

    setErrors(newErrors);
    setFormError('');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side validatie
    const ok = validate();
    if (!ok) {
      return;
    }
    const payload: any = {
      employeeId: employeeId || undefined,
      contractType: contractType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
    };
    try {
      await onSubmit(payload);
    } catch (e) {
      // Server-side validatie: toon velden inline indien beschikbaar
      const validation = getValidationErrors(e);
      if (validation) {
        setErrors(validation);
      }
      // Toon algemene fout bovenin het formulier
      setFormError(getErrorMessage(e, 'Opslaan van contract mislukt'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600">Werknemer ID</label>
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.employeeId ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}`}
          aria-invalid={!!errors.employeeId}
          aria-describedby={errors.employeeId ? 'employeeId-error' : undefined}
          required
        />
        {errors.employeeId && (
          <p id="employeeId-error" className="mt-1 text-xs text-red-600">{errors.employeeId}</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Contract Type</label>
        <select
          value={contractType}
          onChange={(e) => setContractType(e.target.value)}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.contractType ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}`}
          aria-invalid={!!errors.contractType}
          aria-describedby={errors.contractType ? 'contractType-error' : undefined}
          required
        >
          <option value="">Selecteer type</option>
          {Object.keys(contractTypeLabels).map((key) => (
            <option key={key} value={key}>{contractTypeLabels[key]}</option>
          ))}
        </select>
        {errors.contractType && (
          <p id="contractType-error" className="mt-1 text-xs text-red-600">{errors.contractType}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600">Startdatum</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.startDate ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}`}
            aria-invalid={!!errors.startDate}
            aria-describedby={errors.startDate ? 'startDate-error' : undefined}
            required
          />
          {errors.startDate && (
            <p id="startDate-error" className="mt-1 text-xs text-red-600">{errors.startDate}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Einddatum</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.endDate ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}`}
            aria-invalid={!!errors.endDate}
            aria-describedby={errors.endDate ? 'endDate-error' : undefined}
          />
          {errors.endDate && (
            <p id="endDate-error" className="mt-1 text-xs text-red-600">{errors.endDate}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.status ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}`}
          aria-invalid={!!errors.status}
          aria-describedby={errors.status ? 'status-error' : undefined}
          required
        >
          {Object.keys(statusLabels).map((key) => (
            <option key={key} value={key}>{statusLabels[key]}</option>
          ))}
        </select>
        {errors.status && (
          <p id="status-error" className="mt-1 text-xs text-red-600">{errors.status}</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
        >
          Annuleren
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Opslaan
        </button>
      </div>
    </form>
  );
}
