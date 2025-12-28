import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  useEmployees,
  employeeKeys,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useTerminateEmployee,
  useRehireEmployee,
  useEmploymentHistory,
  useRehireEligibility,
  useDeleteEmployee,
} from '@/features/hris/hooks/useEmployees';
import type {
  EmployeeFilters,
  EmploymentStatus,
  EmploymentType,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  TerminateEmployeeDTO,
  RehireEmployeeDTO,
} from '@/types/employee.types';
import { getErrorMessage, handleApiError } from '../../../utils/errorHandler';
import { useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<EmploymentStatus, string> = {
  active: 'Actief',
  on_leave: 'Met verlof',
  terminated: 'Beeindigd',
  suspended: 'Geschorst',
};

const typeLabels: Record<EmploymentType, string> = {
  full_time: 'Fulltime',
  part_time: 'Parttime',
  contract: 'Contract',
  temporary: 'Tijdelijk',
  intern: 'Stagiair',
};

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

function StatusPill({ status }: { status: EmploymentStatus }) {
  const variant: Record<EmploymentStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    on_leave: 'bg-amber-50 text-amber-700 ring-amber-200',
    terminated: 'bg-rose-50 text-rose-700 ring-rose-200',
    suspended: 'bg-slate-100 text-slate-700 ring-slate-300',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${variant[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<EmploymentType | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [showRehire, setShowRehire] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<any | null>(null);
  const [rehireTarget, setRehireTarget] = useState<any | null>(null);

  const filters = useMemo<EmployeeFilters>(() => {
    const next: EmployeeFilters = {};

    if (search.trim()) next.search = search.trim();
    if (statusFilter) next.employmentStatus = statusFilter;
    if (typeFilter) next.employmentType = typeFilter;

    return next;
  }, [search, statusFilter, typeFilter]);

  const { data, isLoading, error, isFetching, refetch } = useEmployees(filters);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const terminate = useTerminateEmployee();
  const rehire = useRehireEmployee();
  const del = useDeleteEmployee();

  const employees = Array.isArray(data) ? data : [];

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
  };

  const handleCreate = async (payload: CreateEmployeeDTO | UpdateEmployeeDTO) => {
    try {
      await create.mutateAsync(payload as CreateEmployeeDTO);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    } catch (err) {
      handleApiError(err, { defaultMessage: 'Kon medewerker niet aanmaken' });
    }
  };

  const handleUpdate = async (id: string, payload: UpdateEmployeeDTO) => {
    try {
      await update.mutateAsync({ id, data: payload });
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    } catch (err) {
      handleApiError(err, { defaultMessage: 'Kon medewerker niet bijwerken' });
    }
  };

  const handleTerminate = async (id: string, payload: TerminateEmployeeDTO) => {
    try {
      await terminate.mutateAsync({ id, data: payload });
      setShowTerminate(false);
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    } catch (err) {
      handleApiError(err, { defaultMessage: 'Kon dienstverband niet beëindigen' });
    }
  };

  const handleRehire = async (id: string, payload: RehireEmployeeDTO) => {
    try {
      await rehire.mutateAsync({ id, data: payload });
      setShowRehire(false);
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    } catch (err) {
      handleApiError(err, { defaultMessage: 'Kon medewerker niet herplaatsen' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze medewerker wilt verwijderen?')) return;
    try {
      await del.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    } catch (err) {
      handleApiError(err, { defaultMessage: 'Kon medewerker niet verwijderen' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Medewerkers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Overzicht van medewerkers met snelle filters op status, type en zoekopdracht.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center rounded-md bg-gray-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-black"
          >
            Nieuwe medewerker
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
            placeholder="Zoek op naam, e-mail of nummer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as EmploymentStatus | '')}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:w-40"
          >
            <option value="">Alle statussen</option>
            {(Object.keys(statusLabels) as EmploymentStatus[]).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter((e.target.value || '') as EmploymentType | '')}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:w-40"
          >
            <option value="">Alle typen</option>
            {(Object.keys(typeLabels) as EmploymentType[]).map((key) => (
              <option key={key} value={key}>
                {typeLabels[key]}
              </option>
            ))}
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
          <div className="p-6 text-sm text-red-600">
            {getErrorMessage(error, 'Kon medewerkers niet laden')}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Geen medewerkers gevonden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Functie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Afdeling</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Locatie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">In dienst sinds</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.jobTitle || 'Onbekend'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.departmentName || '–'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.locationName || '–'}</td>
                    <td className="px-4 py-3"><StatusPill status={employee.employmentStatus} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(employee.hireDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(employee.id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTarget(employee);
                            setShowEdit(true);
                          }}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
                        >
                          Bewerk
                        </button>
                        {employee.employmentStatus !== 'terminated' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTerminateTarget(employee);
                              setShowTerminate(true);
                            }}
                            className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 hover:border-rose-300"
                          >
                            Beëindig
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRehireTarget(employee);
                              setShowRehire(true);
                            }}
                            className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-700 hover:border-emerald-300"
                          >
                            Herplaats
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(employee.id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
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

      {/* Detailpaneel */}
      {selectedId && (
        <DetailPane title="Medewerkerdetails" onClose={() => setSelectedId(null)}>
          <EmployeeDetails employeeId={selectedId} />
        </DetailPane>
      )}

      {/* Modals */}
      {showCreate && (
        <Modal title="Nieuwe medewerker" onClose={() => setShowCreate(false)}>
          <EmployeeForm
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
          />
        </Modal>
      )}

      {showEdit && editTarget && (
        <Modal title="Medewerker bewerken" onClose={() => setShowEdit(false)}>
          <EmployeeForm
            initial={editTarget}
            onCancel={() => setShowEdit(false)}
            onSubmit={(payload) => handleUpdate(editTarget.id, payload)}
          />
        </Modal>
      )}

      {showTerminate && terminateTarget && (
        <Modal title="Dienstverband beëindigen" onClose={() => setShowTerminate(false)}>
          <TerminateForm
            onCancel={() => setShowTerminate(false)}
            onSubmit={(payload) => handleTerminate(terminateTarget.id, payload)}
          />
        </Modal>
      )}

      {showRehire && rehireTarget && (
        <Modal title="Medewerker herplaatsen" onClose={() => setShowRehire(false)}>
          <RehireForm
            employeeId={rehireTarget.id}
            onCancel={() => setShowRehire(false)}
            onSubmit={(payload) => handleRehire(rehireTarget.id, payload)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Lokale UI helpers ---------- */
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">Sluiten</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DetailPane({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">Sluiten</button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------- Detail weergave ---------- */
function EmployeeDetails({ employeeId }: { employeeId: string }) {
  const { data: employee, isLoading, error } = useEmployee(employeeId);
  const { data: history } = useEmploymentHistory(employeeId);

  if (isLoading) return <div className="text-sm text-gray-600">Bezig met laden…</div>;
  if (error) return <div className="text-sm text-red-600">{getErrorMessage(error, 'Kon details niet laden')}</div>;
  if (!employee) return <div className="text-sm text-gray-600">Geen gegevens gevonden.</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="text-sm text-gray-500">Naam</div>
        <div className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</div>
        <div className="text-sm text-gray-500">E-mail</div>
        <div className="text-sm text-gray-900">{employee.email}</div>
        <div className="text-sm text-gray-500">Functie</div>
        <div className="text-sm text-gray-900">{employee.jobTitle || 'Onbekend'}</div>
        <div className="text-sm text-gray-500">Status</div>
        <StatusPill status={employee.employmentStatus} />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Dienstverband geschiedenis</div>
        <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
          {(history || []).map((h, index) => (
            <li key={h.id || `${h.employeeId}-${index}`} className="p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-700">
                  {h.jobTitle || 'Onbekende rol'}
                </span>
                <span className="text-xs text-gray-600">{h.employmentStatus}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {formatDate(h.startDate)}
                  {' '}–{' '}
                  {h.endDate ? formatDate(h.endDate) : 'heden'}
                </span>
                {(h.departmentName || h.locationName) && (
                  <span className="text-gray-500">
                    {[h.departmentName, h.locationName].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {h.rehireNotes && <div className="text-xs text-gray-500">{h.rehireNotes}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Formulieren ---------- */
function EmployeeForm({ initial, onSubmit, onCancel }: {
  initial?: Partial<UpdateEmployeeDTO> | any;
  onSubmit: (payload: CreateEmployeeDTO | UpdateEmployeeDTO) => void;
  onCancel: () => void;
}) {
  const [employeeNumber, setEmployeeNumber] = useState(initial?.employeeNumber || '');
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || '');
  const [hireDate, setHireDate] = useState(initial?.hireDate || '');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initial?.employmentType || 'full_time'
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const payload: CreateEmployeeDTO = {
          employeeNumber: employeeNumber || `${Date.now()}`,
          firstName,
          lastName,
          email,
          jobTitle,
          hireDate,
          employmentType,
        };
        onSubmit(payload);
      }}
    >
      <div>
        <label className="text-xs text-gray-500">Medewerkernummer</label>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Voornaam</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Achternaam</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">E-mail</label>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Functie</label>
        <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Startdatum</label>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Dienstverbandtype</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
          >
            {(Object.keys(typeLabels) as EmploymentType[]).map((key) => (
              <option key={key} value={key}>
                {typeLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-200 px-3 py-2 text-sm">Annuleer</button>
        <button type="submit" className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">Opslaan</button>
      </div>
    </form>
  );
}

function TerminateForm({ onSubmit, onCancel }: {
  onSubmit: (payload: TerminateEmployeeDTO) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ reason, terminationDate: date } as TerminateEmployeeDTO);
      }}
    >
      <div>
        <label className="text-xs text-gray-500">Reden</label>
        <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Datum</label>
        <input type="date" className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-200 px-3 py-2 text-sm">Annuleer</button>
        <button type="submit" className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white">Beëindig</button>
      </div>
    </form>
  );
}

function RehireForm({ employeeId, onSubmit, onCancel }: {
  employeeId: string;
  onSubmit: (payload: RehireEmployeeDTO) => void;
  onCancel: () => void;
}) {
  const { data: eligibility } = useRehireEligibility(employeeId);
  const [date, setDate] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rehireDate: date } as RehireEmployeeDTO);
      }}
    >
      <div className="text-sm text-gray-700">
        {eligibility?.eligible ? 'Medewerker is herplaatsbaar.' : 'Niet herplaatsbaar volgens beleid.'}
      </div>
      <div>
        <label className="text-xs text-gray-500">Startdatum</label>
        <input type="date" className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-200 px-3 py-2 text-sm">Annuleer</button>
        <button type="submit" className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white">Herplaats</button>
      </div>
    </form>
  );
}

/* einde bestandsinhoud */

