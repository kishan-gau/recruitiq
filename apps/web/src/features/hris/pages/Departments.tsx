import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDepartments,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  departmentKeys,
} from '@/features/hris/hooks/useDepartments';
import type { DepartmentFilters, CreateDepartmentDTO, UpdateDepartmentDTO, Department } from '@/types/department.types';
import { getErrorMessage } from '@/utils/errorHandler';

function formatDate(date?: string) {
  if (!date) return 'Onbekend';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Onbekend';
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed);
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const variant = isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-slate-100 text-slate-700 ring-slate-300';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${variant}`}>
      {isActive ? 'Actief' : 'Inactief'}
    </span>
  );
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filters = useMemo<DepartmentFilters>(() => {
    const next: DepartmentFilters = {};
    if (search.trim()) next.search = search.trim();
    if (statusFilter) next.isActive = statusFilter === 'active';
    return next;
  }, [search, statusFilter]);

  const { data, isLoading, isFetching, error, refetch } = useDepartments(filters);
  const { data: selectedDepartment } = useDepartment(selectedId || '', { enabled: !!selectedId });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const departments = Array.isArray(data) ? data : [];

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
  };

  const handleOpenCreate = () => setIsCreateOpen(true);
  const handleCloseCreate = () => setIsCreateOpen(false);

  const handleCloseEdit = () => setEditId(null);

  const handleCreate = async (payload: CreateDepartmentDTO | UpdateDepartmentDTO) => {
    try {
      await createMutation.mutateAsync(payload as CreateDepartmentDTO);
      setIsCreateOpen(false);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon afdeling niet aanmaken'));
    }
  };

  const handleUpdate = async (id: string, updates: UpdateDepartmentDTO) => {
    try {
      await updateMutation.mutateAsync({ id, data: updates });
      setEditId(null);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon afdeling niet bijwerken'));
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await updateMutation.mutateAsync({ id: dept.id, data: { isActive: !dept.isActive } });
    } catch (e) {
      alert(getErrorMessage(e, 'Kon status niet wijzigen'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze afdeling wilt verwijderen?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon afdeling niet verwijderen'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Afdelingen</h1>
          <p className="mt-2 text-sm text-gray-600">Overzicht van afdelingen met status- en zoekfilters.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Nieuwe afdeling
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
          >
            {isFetching ? 'Vernieuwen…' : 'Vernieuw lijst'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <input
            type="search"
            placeholder="Zoek op naam of code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as 'active' | 'inactive' | '')}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:w-40"
          >
            <option value="">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 lg:w-28"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-600">Bezig met laden…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{getErrorMessage(error, 'Kon afdelingen niet laden')}</div>
        ) : departments.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Geen afdelingen gevonden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hoofdafdeling</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kostenplaats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bijgewerkt</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((department) => (
                  <tr key={department.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{department.departmentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{department.departmentCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{department.parentDepartment?.departmentName || '–'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{department.costCenter || '–'}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={department.isActive} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(department.updatedAt || department.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(department.id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(department.id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                        >
                          Bewerk
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(department)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                        >
                          {department.isActive ? 'Deactiveer' : 'Activeer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(department.id)}
                          className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:border-red-300"
                        >
                          Verwijder
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail pane */}
      {selectedId && selectedDepartment && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Details afdeling</h2>
              <p className="mt-1 text-sm text-gray-600">{selectedDepartment.departmentName} ({selectedDepartment.departmentCode})</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              Sluiten
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-xs font-semibold text-gray-500">Kostenplaats</div>
              <div className="text-sm text-gray-900">{selectedDepartment.costCenter || '–'}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-xs font-semibold text-gray-500">Hoofdafdeling</div>
              <div className="text-sm text-gray-900">{selectedDepartment.parentDepartment?.departmentName || '–'}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3 md:col-span-2">
              <div className="text-xs font-semibold text-gray-500">Beschrijving</div>
              <div className="text-sm text-gray-900">{selectedDepartment.description || '–'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <Modal title="Nieuwe afdeling" onClose={handleCloseCreate}>
          <DepartmentForm
            onSubmit={handleCreate}
            onCancel={handleCloseCreate}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editId && (
        <Modal title="Afdeling bewerken" onClose={handleCloseEdit}>
          <DepartmentForm
            initial={departments.find((d) => d.id === editId) || undefined}
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

function DepartmentForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CreateDepartmentDTO & { id?: string }>;
  onSubmit: (payload: CreateDepartmentDTO | UpdateDepartmentDTO) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [departmentName, setDepartmentName] = useState(initial?.departmentName || '');
  const [departmentCode, setDepartmentCode] = useState(initial?.departmentCode || '');
  const [costCenter, setCostCenter] = useState(initial?.costCenter || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateDepartmentDTO = {
      departmentName: departmentName.trim(),
      departmentCode: departmentCode.trim(),
      costCenter: costCenter.trim() || undefined,
      description: description.trim() || undefined,
      isActive,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600">Naam</label>
        <input
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Code</label>
        <input
          value={departmentCode}
          onChange={(e) => setDepartmentCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Kostenplaats</label>
        <input
          value={costCenter}
          onChange={(e) => setCostCenter(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Beschrijving</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          rows={3}
        />
      </div>
      <div className="flex items-center gap-2">
        <input id="dept-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="dept-active" className="text-sm text-gray-700">Actief</label>
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
