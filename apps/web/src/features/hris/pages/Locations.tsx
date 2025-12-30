import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useLocations, locationKeys, useCreateLocation, useUpdateLocation, useDeleteLocation, useLocation } from '@/features/hris/hooks/useLocations';
import type { Location, LocationFilters, LocationType, CreateLocationDTO, UpdateLocationDTO } from '@/types/location.types';
import { getErrorMessage, handleApiError } from '@/utils/errorHandler';

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'headquarters', label: 'Hoofdkantoor' },
  { value: 'branch', label: 'Vestiging' },
  { value: 'remote', label: 'Remote' },
  { value: 'warehouse', label: 'Magazijn' },
  { value: 'store', label: 'Winkel' },
];

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

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [typeFilter, setTypeFilter] = useState<LocationType | ''>('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filters = useMemo<LocationFilters>(() => {
    const next: LocationFilters = {};
    if (search.trim()) next.search = search.trim();
    if (statusFilter) next.isActive = statusFilter === 'active';
    if (typeFilter) next.locationType = typeFilter;
    if (countryFilter.trim()) next.country = countryFilter.trim();
    return next;
  }, [search, statusFilter, typeFilter, countryFilter]);

  const { data, isLoading, isFetching, error, refetch } = useLocations(filters);
  const { data: detailData } = useLocation(detailId || '', { enabled: !!detailId });
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();

  const locations = Array.isArray(data) ? data : [];

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setCountryFilter('');
    queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
  };

  const handleOpenCreate = () => setShowCreate(true);
  const handleOpenEdit = (loc: Location) => {
    setEditTarget(loc);
    setShowEdit(true);
  };
  const handleCloseModals = () => {
    setShowCreate(false);
    setShowEdit(false);
    setEditTarget(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!id) return;
    const confirmed = window.confirm(`Locatie "${name}" verwijderen?`);
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (detailId === id) setDetailId(null);
    } catch (e) {
      handleApiError(e, { defaultMessage: 'Verwijderen mislukt' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Locaties</h1>
          <p className="mt-2 text-sm text-gray-600">Overzicht van locaties, types en statussen.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
          >
            {isFetching ? 'Vernieuwen…' : 'Vernieuw lijst'}
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            Nieuwe locatie
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            placeholder="Zoek op naam of code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter((e.target.value || '') as LocationType | '')}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Alle types</option>
            {LOCATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as 'active' | 'inactive' | '')}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>

          <input
            type="text"
            placeholder="Land"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-inner focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 sm:w-28"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-600">Bezig met laden…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{getErrorMessage(error, 'Kon locaties niet laden')}</div>
        ) : locations.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Geen locaties gevonden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Stad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Land</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bijgewerkt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{location.locationName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{location.locationCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {LOCATION_TYPE_OPTIONS.find((opt) => opt.value === location.locationType)?.label || '–'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{location.city || '–'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{location.country || '–'}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={location.isActive} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(location.updatedAt || location.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailId(location.id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
                        >
                          Bekijken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(location)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(location.id, location.locationName)}
                          className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:border-red-300"
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
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal onClose={handleCloseModals} title="Nieuwe locatie">
          <LocationForm
            onSubmit={async (values) => {
              try {
                await createMutation.mutateAsync(values);
                handleCloseModals();
              } catch (e) {
                // Foutmelding binnen het formulier afgehandeld via setErrorMessage
              }
            }}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && editTarget && (
        <Modal onClose={handleCloseModals} title={`Locatie bewerken: ${editTarget.locationName}`}>
          <LocationForm
            initial={editTarget}
            onSubmit={async (values) => {
              try {
                const payload: UpdateLocationDTO = values;
                await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
                handleCloseModals();
              } catch (e) {
                // Foutmelding binnen het formulier afgehandeld via setErrorMessage
              }
            }}
          />
        </Modal>
      )}

      {/* Detail Pane */}
      {detailId && (
        <DetailPane onClose={() => setDetailId(null)} title="Locatiedetails">
          {detailData ? (
            <div className="space-y-3 text-sm text-gray-800">
              <div className="flex items-center justify-between"><span className="font-medium">Naam</span><span>{detailData.locationName}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Code</span><span>{detailData.locationCode}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Type</span><span>{LOCATION_TYPE_OPTIONS.find((o)=>o.value===detailData.locationType)?.label || '–'}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Stad</span><span>{detailData.city || '–'}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Land</span><span>{detailData.country || '–'}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Status</span><span><StatusBadge isActive={detailData.isActive} /></span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Aangemaakt</span><span>{formatDate(detailData.createdAt)}</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Bijgewerkt</span><span>{formatDate(detailData.updatedAt || detailData.createdAt)}</span></div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Laden…</div>
          )}
        </DetailPane>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">Sluiten</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DetailPane({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">Sluiten</button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function LocationForm({ initial, onSubmit }: { initial?: Location; onSubmit: (values: CreateLocationDTO) => Promise<void> }) {
  const [values, setValues] = useState<CreateLocationDTO>({
    locationCode: initial?.locationCode || '',
    locationName: initial?.locationName || '',
    locationType: initial?.locationType,
    addressLine1: initial?.addressLine1 || '',
    addressLine2: initial?.addressLine2 || '',
    city: initial?.city || '',
    stateProvince: initial?.stateProvince || '',
    postalCode: initial?.postalCode || '',
    country: initial?.country || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    isActive: initial?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof CreateLocationDTO, value: string | boolean | LocationType | undefined) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const msg = handleApiError(err, { defaultMessage: 'Opslaan mislukt' });
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errorMessage && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600">Naam</label>
          <input value={values.locationName} onChange={(e)=>handleChange('locationName', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Code</label>
          <input value={values.locationCode} onChange={(e)=>handleChange('locationCode', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Type</label>
          <select value={values.locationType || ''} onChange={(e)=>handleChange('locationType', (e.target.value || undefined) as LocationType | undefined)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
            <option value="">Geen</option>
            {LOCATION_TYPE_OPTIONS.map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Land</label>
          <input value={values.country || ''} onChange={(e)=>handleChange('country', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Stad</label>
          <input value={values.city || ''} onChange={(e)=>handleChange('city', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Adres (regel 1)</label>
          <input value={values.addressLine1 || ''} onChange={(e)=>handleChange('addressLine1', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Adres (regel 2)</label>
          <input value={values.addressLine2 || ''} onChange={(e)=>handleChange('addressLine2', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Provincie/State</label>
          <input value={values.stateProvince || ''} onChange={(e)=>handleChange('stateProvince', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Postcode</label>
          <input value={values.postalCode || ''} onChange={(e)=>handleChange('postalCode', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Telefoon</label>
          <input value={values.phone || ''} onChange={(e)=>handleChange('phone', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">E-mail</label>
          <input value={values.email || ''} onChange={(e)=>handleChange('email', e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={!!values.isActive} onChange={(e)=>handleChange('isActive', e.target.checked)} />
          Actief
        </label>
        <button type="submit" disabled={submitting} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}
