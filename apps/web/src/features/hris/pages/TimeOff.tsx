import { useState } from 'react';
import {
  useTimeOffRequests,
  useApproveTimeOffRequest,
  useRejectTimeOffRequest,
} from '../hooks/useTimeOff';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';

type TimeOffFilters = {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

export default function TimeOffPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<TimeOffFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: requestsData, isLoading, error } = useTimeOffRequests(filters);
  const approveMutation = useApproveTimeOffRequest();
  const rejectMutation = useRejectTimeOffRequest();

  const requests = requestsData || [];
  const selected = requests.find((r: any) => r.id === selectedId);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Weet u zeker dat u deze aanvraag wilt goedkeuren?')) return;
    
    approveMutation.mutate(
      { id, notes: undefined },
      {
        onSuccess: () => {
          toast.success('Aanvraag goedgekeurd');
          setSelectedId(null);
        },
        onError: (error) => {
          handleApiError(error, { toast, defaultMessage: 'Fout bij goedkeuren aanvraag' });
        },
      }
    );
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reden voor afwijzing:');
    if (!reason) return;
    
    rejectMutation.mutate(
      { id, reason },
      {
        onSuccess: () => {
          toast.success('Aanvraag afgewezen');
          setSelectedId(null);
        },
        onError: (error) => {
          handleApiError(error, { toast, defaultMessage: 'Fout bij afwijzen aanvraag' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
        Fout bij laden van verlofaanvragen: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Off</h1>
          <p className="text-sm text-gray-600">Beheer verlofaanvragen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            onClick={() => {
              // TODO: Open create modal
              alert('Nieuwe aanvraag - implementatie pending');
            }}
          >
            Nieuwe aanvraag
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Zoek op werknemer"
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Alle statussen</option>
            <option value="pending">In afwachting</option>
            <option value="approved">Goedgekeurd</option>
            <option value="rejected">Afgewezen</option>
          </select>
          <input
            type="date"
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <button
            className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
            onClick={() => setFilters({})}
          >
            Filters wissen
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded border border-gray-200 bg-white">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Geen verlofaanvragen gevonden.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Werknemer</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Periode</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Dagen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {requests.map((item: any) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedId === item.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{item.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status === 'approved' && 'Goedgekeurd'}
                        {item.status === 'pending' && 'In afwachting'}
                        {item.status === 'rejected' && 'Afgewezen'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.startDate} - {item.endDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
          {selected ? (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="font-semibold">{selected.employeeName}</div>
              <div>Type: {selected.type}</div>
              <div>
                Status:{' '}
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    selected.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : selected.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {selected.status === 'approved' && 'Goedgekeurd'}
                  {selected.status === 'pending' && 'In afwachting'}
                  {selected.status === 'rejected' && 'Afgewezen'}
                </span>
              </div>
              <div>
                Periode: {selected.startDate} - {selected.endDate} ({selected.days} dagen)
              </div>
              {selected.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    className="rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                    onClick={() => handleApprove(selected.id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Bezig...' : 'Goedkeuren'}
                  </button>
                  <button
                    className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    onClick={() => handleReject(selected.id)}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? 'Bezig...' : 'Afwijzen'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Selecteer een aanvraag om details te zien.</p>
          )}
        </div>
      </div>
    </div>
  );
}
